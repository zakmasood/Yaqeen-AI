"""Screening pipeline unit tests — no live Supabase, no fake authenticity scores."""

from io import BytesIO
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from PIL import Image, ImageDraw

from app.models.enums import AnalysisStatus, PaymentProvider
from app.schemas import ExtractedTransaction, WhatsAppWebhookPayload
from app.services.duplicate_detection import classify_image_matches
from app.services.image_hash import difference_hash, hamming_distance
from app.services.screening import collect_screening_outcome
from app.services.storage import validate_image_upload
from app.services.txn_ref import normalize_transaction_reference
from app.services.vision import VisionAnalysisService, extracted_from_vision, parse_json_object
from app.services.whatsapp_ingestion import iter_inbound_images


def _png_halves(*, dark_left: bool) -> bytes:
    image = Image.new("L", (32, 32), 255)
    x0, x1 = (0, 15) if dark_left else (16, 31)
    ImageDraw.Draw(image).rectangle([x0, 0, x1, 31], fill=0)
    buf = BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_pipeline_empty_stubs_manual_review() -> None:
    status, signals = collect_screening_outcome(
        extracted=None,
        vision_result={},
        duplicate_ids=[],
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert status != AnalysisStatus.READY_FOR_CONFIRMATION
    assert any(signal.code == "SCREENING_UNAVAILABLE" for signal in signals)
    assert not any(
        signal.code in {"EXACT_IMAGE_REUSED", "NEAR_DUPLICATE_IMAGE"} for signal in signals
    )


def test_empty_extraction_exact_image_is_suspicious() -> None:
    status, signals = collect_screening_outcome(
        extracted=None,
        vision_result={},
        duplicate_ids=[],
        exact_image_ids=["prior-analysis"],
    )
    assert status == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "SCREENING_UNAVAILABLE" for signal in signals)
    assert any(signal.code == "EXACT_IMAGE_REUSED" for signal in signals)
    assert not any(signal.code == "NEAR_DUPLICATE_IMAGE" for signal in signals)


def _complete(**overrides: object) -> ExtractedTransaction:
    fields: dict[str, object] = {
        "provider": PaymentProvider.EASYPAISA,
        "amount": 5000,
        "currency": "PKR",
        "transaction_id": "EP-12345",
        "payee_hint": "03001234567",
    }
    fields.update(overrides)
    return ExtractedTransaction(**fields)  # type: ignore[arg-type]


def test_ready_extraction_near_image_needs_review() -> None:
    status, signals = collect_screening_outcome(
        extracted=_complete(),
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
        expected_currency="PKR",
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
        near_image_ids=["prior-analysis"],
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert status != AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "NEAR_DUPLICATE_IMAGE" for signal in signals)


def test_exact_image_wins_over_near() -> None:
    status, signals = collect_screening_outcome(
        extracted=None,
        vision_result={},
        duplicate_ids=[],
        exact_image_ids=["exact-prior"],
        near_image_ids=["near-prior"],
    )
    codes = [signal.code for signal in signals]
    assert "EXACT_IMAGE_REUSED" in codes
    assert "NEAR_DUPLICATE_IMAGE" not in codes


def test_identical_pngs_share_dhash() -> None:
    left = difference_hash(_png_halves(dark_left=True))
    right = difference_hash(_png_halves(dark_left=True))
    assert left is not None and right is not None
    assert left == right
    assert hamming_distance(left, right) == 0


def test_different_pngs_have_large_hamming() -> None:
    left = difference_hash(_png_halves(dark_left=True))
    right = difference_hash(_png_halves(dark_left=False))
    assert left is not None and right is not None
    distance = hamming_distance(left, right)
    assert distance is not None
    assert distance > 10


def test_unreadable_bytes_have_no_dhash() -> None:
    assert difference_hash(b"not-an-image") is None


def test_classify_image_matches_exact_and_near() -> None:
    exact, near = classify_image_matches(
        sha256="aaa",
        phash="0000000000000000",
        priors=[
            {"analysis_id": "self", "sha256": "aaa", "phash": "0000000000000000"},
            {"analysis_id": "exact", "sha256": "aaa", "phash": "ffffffffffffffff"},
            {"analysis_id": "near", "sha256": "bbb", "phash": "0000000000000001"},
            {"analysis_id": "far", "sha256": "ccc", "phash": "ffffffffffffffff"},
        ],
        exclude_analysis_id="self",
    )
    assert exact == ["exact"]
    assert near == ["near"]


def test_pipeline_reused_txn_is_suspicious() -> None:
    extracted = ExtractedTransaction(transaction_id="ABC-1", amount=100)
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={},
        duplicate_ids=["prior-analysis"],
    )
    assert status == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "TXN_REUSED" for signal in signals)


def test_pipeline_complete_extraction_without_signals_ready() -> None:
    status, signals = collect_screening_outcome(
        extracted=_complete(),
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
        expected_currency="PKR",
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
    )
    assert status == AnalysisStatus.READY_FOR_CONFIRMATION
    assert signals == []


def test_amount_mismatch_is_suspicious() -> None:
    extracted = ExtractedTransaction(transaction_id="ABC-1", amount=2500)
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={"provider": "EASYPAISA", "amount": 2500, "transaction_id": "ABC-1"},
        duplicate_ids=[],
        expected_amount=5000,
    )
    assert status == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "AMOUNT_MISMATCH" for signal in signals)


def test_provider_mismatch_is_manual_review() -> None:
    extracted = ExtractedTransaction(
        provider=PaymentProvider.JAZZCASH,
        transaction_id="ABC-1",
        amount=5000,
    )
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
        expected_provider=PaymentProvider.EASYPAISA,
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "PROVIDER_MISMATCH" for signal in signals)


def test_payee_mismatch_is_manual_review() -> None:
    extracted = ExtractedTransaction(
        transaction_id="ABC-1",
        amount=5000,
        payee_hint="0321 9999999",
    )
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
        expected_payee="0300••••567",
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "PAYEE_MISMATCH" for signal in signals)


def test_ambiguous_extraction_is_manual_review() -> None:
    extracted = ExtractedTransaction(amount=5000)
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
        ambiguous=True,
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "EXTRACTION_AMBIGUOUS" for signal in signals)


def test_extracted_from_vision_maps_json() -> None:
    extracted, ambiguous = extracted_from_vision(
        {
            "provider": "easypaisa",
            "amount": 5000,
            "currency": "PKR",
            "transaction_id": "EP-1",
            "payee_hint": "03001234567",
            "ambiguous": False,
        }
    )
    assert extracted is not None
    assert extracted.provider == PaymentProvider.EASYPAISA
    assert extracted.amount == 5000
    assert extracted.transaction_id == "EP-1"
    assert extracted.payee_hint == "03001234567"
    assert ambiguous is False


def test_extracted_from_vision_refuses_garbage() -> None:
    extracted, ambiguous = extracted_from_vision(
        {
            "provider": "maybe easypaisa?",
            "amount": "about five thousand",
            "transaction_id": 12345,
            "ambiguous": "yes",
        }
    )
    assert extracted is None
    assert ambiguous is True


def test_parse_json_object_strips_fences() -> None:
    payload = parse_json_object('```json\n{"amount": 10}\n```')
    assert payload == {"amount": 10}


@pytest.mark.asyncio
async def test_vision_returns_empty_without_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.vision.get_settings",
        lambda: SimpleNamespace(ai_vision_api_key="", ai_vision_model=""),
    )
    result = await VisionAnalysisService().analyze_image(b"not-an-image")
    assert result == {}


def test_missing_payee_is_not_a_match() -> None:
    status, signals = collect_screening_outcome(
        extracted=_complete(payee_hint=None),
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
        expected_payee="03001234567",
    )
    codes = {signal.code for signal in signals}
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert "PAYEE_UNAVAILABLE" in codes
    assert "PAYEE_MISMATCH" not in codes
    assert status != AnalysisStatus.READY_FOR_CONFIRMATION


def test_amount_unavailable_is_distinct_from_mismatch() -> None:
    missing, missing_signals = collect_screening_outcome(
        extracted=_complete(amount=None),
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
    )
    mismatch, mismatch_signals = collect_screening_outcome(
        extracted=_complete(amount=2500),
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
        expected_currency="PKR",
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
    )
    assert missing == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "AMOUNT_UNAVAILABLE" for signal in missing_signals)
    assert not any(signal.code == "AMOUNT_MISMATCH" for signal in missing_signals)
    assert mismatch == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "AMOUNT_MISMATCH" for signal in mismatch_signals)


def test_provider_unavailable_when_unknown() -> None:
    status, signals = collect_screening_outcome(
        extracted=_complete(provider=PaymentProvider.UNKNOWN),
        vision_result={},
        duplicate_ids=[],
        expected_provider=PaymentProvider.EASYPAISA,
    )
    codes = {signal.code for signal in signals}
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert "PROVIDER_UNAVAILABLE" in codes
    assert "PROVIDER_MISMATCH" not in codes


def test_currency_mismatch_is_manual_review() -> None:
    status, signals = collect_screening_outcome(
        extracted=_complete(currency="USD"),
        vision_result={},
        duplicate_ids=[],
        expected_currency="PKR",
        expected_amount=5000,
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "CURRENCY_MISMATCH" for signal in signals)


def test_malformed_transaction_reference_is_not_ready() -> None:
    status, signals = collect_screening_outcome(
        extracted=_complete(transaction_id="***"),
        vision_result={},
        duplicate_ids=[],
        expected_amount=5000,
        expected_currency="PKR",
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "TXN_REFERENCE_UNAVAILABLE" for signal in signals)


def test_absent_expectation_is_not_recorded_as_a_match() -> None:
    status, signals = collect_screening_outcome(
        extracted=_complete(),
        vision_result={},
        duplicate_ids=[],
    )
    codes = {signal.code for signal in signals}
    assert status == AnalysisStatus.READY_FOR_CONFIRMATION
    assert "AMOUNT_MISMATCH" not in codes
    assert "PAYEE_MISMATCH" not in codes
    assert signals == []


def test_iter_inbound_images() -> None:
    payload = WhatsAppWebhookPayload(
        object="whatsapp_business_account",
        entry=[
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {"display_phone_number": "923001234567"},
                            "messages": [
                                {
                                    "from": "923009999999",
                                    "type": "image",
                                    "image": {"id": "media-1"},
                                }
                            ],
                        }
                    }
                ]
            }
        ],
    )
    images = list(iter_inbound_images(payload))
    assert images == [("923001234567", "media-1", "923009999999")]


def test_normalize_keeps_letters_and_ignores_separators() -> None:
    assert normalize_transaction_reference(" ep-12 345 ") == "EP12345"
    assert normalize_transaction_reference("EP-12345") == normalize_transaction_reference("ep12345")
    assert normalize_transaction_reference("RAAST/AB-9") == "RAASTAB9"
    assert normalize_transaction_reference("AB-12") != normalize_transaction_reference("12-AB")
    assert normalize_transaction_reference("***") is None
    assert normalize_transaction_reference(None) is None


def test_exact_replay_stays_suspicious_when_extraction_is_complete() -> None:
    status, signals = collect_screening_outcome(
        extracted=_complete(),
        vision_result={},
        duplicate_ids=[],
        exact_image_ids=["prior"],
        expected_amount=5000,
        expected_currency="PKR",
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
    )
    assert status == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "EXACT_IMAGE_REUSED" for signal in signals)


def test_far_perceptual_hash_is_not_a_duplicate() -> None:
    exact, near = classify_image_matches(
        sha256="new-file",
        phash="0000000000000000",
        priors=[{"analysis_id": "other", "sha256": "other-file", "phash": "ffffffffffffffff"}],
        exclude_analysis_id=None,
    )
    assert exact == []
    assert near == []


def test_validate_image_accepts_png_and_rejects_text() -> None:
    png = _png_halves(dark_left=True)
    assert validate_image_upload(png) == "image/png"
    with pytest.raises(HTTPException) as rejected:
        validate_image_upload(b"not-an-image")
    assert rejected.value.status_code == 415
    with pytest.raises(HTTPException) as empty:
        validate_image_upload(b"")
    assert empty.value.status_code == 400


@pytest.mark.asyncio
async def test_vision_failure_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.vision.get_settings",
        lambda: SimpleNamespace(ai_vision_api_key="test-key", ai_vision_model="gpt-4o-mini"),
    )

    class BrokenClient:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        async def __aenter__(self) -> object:
            return self

        async def __aexit__(self, *args: object) -> bool:
            return False

        async def post(self, *args: object, **kwargs: object) -> object:
            raise httpx.ConnectError("vision down")

    monkeypatch.setattr("app.services.vision.httpx.AsyncClient", BrokenClient)
    result = await VisionAnalysisService().analyze_image(b"\xff\xd8\xff", "image/jpeg")
    assert result == {}


@pytest.mark.asyncio
async def test_vision_uses_png_content_type(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.vision.get_settings",
        lambda: SimpleNamespace(ai_vision_api_key="test-key", ai_vision_model=""),
    )
    seen: dict[str, str] = {}

    class RecordingResponse:
        status_code = 503

        def json(self) -> dict:
            return {}

    class RecordingClient:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        async def __aenter__(self) -> object:
            return self

        async def __aexit__(self, *args: object) -> bool:
            return False

        async def post(self, url: str, json: dict, headers: dict) -> RecordingResponse:
            _ = url, headers
            image = json["messages"][1]["content"][1]["image_url"]["url"]
            seen["url"] = image
            return RecordingResponse()

    monkeypatch.setattr("app.services.vision.httpx.AsyncClient", RecordingClient)
    result = await VisionAnalysisService().analyze_image(b"png-bytes", "image/png")
    assert result == {}
    assert seen["url"].startswith("data:image/png;base64,")
