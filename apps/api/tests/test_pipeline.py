"""Screening pipeline unit tests — no live Supabase, no fake authenticity scores."""

from io import BytesIO
from types import SimpleNamespace

import pytest
from PIL import Image, ImageDraw

from app.models.enums import AnalysisStatus, PaymentProvider
from app.schemas import ExtractedTransaction, WhatsAppWebhookPayload
from app.services.duplicate_detection import classify_image_matches
from app.services.image_hash import difference_hash, hamming_distance
from app.services.screening import collect_screening_outcome
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


def test_ready_extraction_near_image_is_suspicious() -> None:
    extracted = ExtractedTransaction(transaction_id="ABC-1", amount=100)
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={},
        duplicate_ids=[],
        near_image_ids=["prior-analysis"],
    )
    assert status == AnalysisStatus.SUSPICIOUS
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


def test_pipeline_real_extraction_without_signals_ready() -> None:
    extracted = ExtractedTransaction(transaction_id="ABC-1", amount=100)
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={},
        duplicate_ids=[],
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
