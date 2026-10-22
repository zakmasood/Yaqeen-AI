"""Synthetic screening cases for the finals demo. These are not model-accuracy metrics.

No receipt image in this file was read by a vision model. Outcomes are the
deterministic screening rules, labeled synthetic.
"""

from app.models.enums import AnalysisStatus, PaymentProvider
from app.schemas import ExtractedTransaction
from app.services.network_claims import NetworkCheck
from app.services.screening import collect_screening_outcome
from app.services.txn_ref import normalize_transaction_reference
from app.services.vision import extracted_from_vision


def _proof(**overrides: object) -> ExtractedTransaction:
    fields: dict[str, object] = {
        "provider": PaymentProvider.EASYPAISA,
        "amount": 5000,
        "currency": "PKR",
        "transaction_id": "EP12345678",
        "payee_hint": "Shop Easypaisa",
    }
    fields.update(overrides)
    return ExtractedTransaction(**fields)  # type: ignore[arg-type]


def _screen(extracted: ExtractedTransaction | None, **kwargs: object):
    fields: dict[str, object] = {
        "extracted": extracted,
        "vision_result": {"synthetic": True},
        "duplicate_ids": [],
        "expected_amount": 5000,
        "expected_currency": "PKR",
        "expected_provider": PaymentProvider.EASYPAISA,
        "expected_payee": "Shop Easypaisa",
    }
    fields.update(kwargs)
    return collect_screening_outcome(**fields)  # type: ignore[arg-type]


def test_synthetic_legitimate_match() -> None:
    status, signals = _screen(_proof())
    assert status == AnalysisStatus.READY_FOR_CONFIRMATION
    assert signals == []


def test_synthetic_same_image_twice() -> None:
    status, signals = _screen(_proof(), exact_image_ids=["analysis-earlier"])
    assert status == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "EXACT_IMAGE_REUSED" for signal in signals)


def test_synthetic_same_reference_different_encoding() -> None:
    assert normalize_transaction_reference("EP-12345678") == normalize_transaction_reference(
        "ep 12345678"
    )
    status, signals = _screen(
        _proof(transaction_id="ep 12345678"), duplicate_ids=["analysis-earlier"]
    )
    assert status == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "TXN_REUSED" for signal in signals)


def test_synthetic_similar_receipt_different_reference() -> None:
    status, signals = _screen(
        _proof(transaction_id="EP99998888"),
        near_image_ids=["analysis-earlier"],
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "NEAR_DUPLICATE_IMAGE" for signal in signals)
    assert not any(signal.code == "TXN_REUSED" for signal in signals)


def test_synthetic_incorrect_amount() -> None:
    status, signals = _screen(_proof(amount=50))
    assert status == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "AMOUNT_MISMATCH" for signal in signals)


def test_synthetic_missing_payee() -> None:
    status, signals = _screen(_proof(payee_hint=None))
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "PAYEE_UNAVAILABLE" for signal in signals)
    assert not any(signal.code == "PAYEE_MISMATCH" for signal in signals)


def test_synthetic_unreadable_reference() -> None:
    status, signals = _screen(_proof(transaction_id="***"))
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "TXN_REFERENCE_UNAVAILABLE" for signal in signals)


def test_synthetic_cross_merchant_replay_is_not_conclusive() -> None:
    status, signals = _screen(_proof(), network_check=NetworkCheck.CHECKED_MATCH)
    assert status == AnalysisStatus.MANUAL_REVIEW
    network = next(signal for signal in signals if signal.code == "NETWORK_REFERENCE_REUSED")
    assert network.related_analysis_id is None


def test_demo_a_matching_submission_stays_ready() -> None:
    """Synthetic demo A. Not a vision-model result."""
    status, signals = _screen(_proof(), network_check=NetworkCheck.CHECKED_NO_MATCH)
    assert status == AnalysisStatus.READY_FOR_CONFIRMATION
    assert [signal.code for signal in signals] == ["NETWORK_CHECK_CLEAR"]


def test_demo_b_reformatted_reference_links_same_merchant() -> None:
    """Synthetic demo B. Encoding difference is normalization, not a second image."""
    assert normalize_transaction_reference("EP-12345678") == normalize_transaction_reference(
        "ep 12345678"
    )
    status, signals = _screen(
        _proof(transaction_id="ep 12345678"),
        duplicate_ids=["analysis-a"],
        network_check=NetworkCheck.CHECKED_NO_MATCH,
    )
    assert status == AnalysisStatus.SUSPICIOUS
    reused = next(signal for signal in signals if signal.code == "TXN_REUSED")
    assert reused.related_analysis_id == "analysis-a"
    assert not any(signal.code == "NETWORK_REFERENCE_REUSED" for signal in signals)


def test_demo_c_other_merchant_warns_without_a_link() -> None:
    """Synthetic demo C. The warning names no other merchant."""
    status, signals = _screen(_proof(), network_check=NetworkCheck.CHECKED_MATCH)
    assert status == AnalysisStatus.MANUAL_REVIEW
    network = next(signal for signal in signals if signal.code == "NETWORK_REFERENCE_REUSED")
    assert network.related_analysis_id is None
    assert "Shop A" not in network.message


def test_synthetic_vision_failure_is_manual_review() -> None:
    extracted, _ambiguous = extracted_from_vision({})
    status, signals = _screen(extracted)
    assert extracted is None
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert any(signal.code == "SCREENING_UNAVAILABLE" for signal in signals)
