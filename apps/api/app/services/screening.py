"""Screening outcome from extraction, matching, and duplicate lookup. No fake scores."""

from __future__ import annotations

from app.models.enums import AnalysisStatus, PaymentProvider, RiskSeverity
from app.schemas import ExtractedTransaction, RiskSignal
from app.services.risk_scoring import RiskScoringService

PKR_EPSILON = 0.5

SCREENING_UNAVAILABLE = RiskSignal(
    code="SCREENING_UNAVAILABLE",
    severity=RiskSeverity.MEDIUM,
    message="OCR/vision providers are not configured; human review required.",
)

TXN_REUSED = RiskSignal(
    code="TXN_REUSED",
    severity=RiskSeverity.HIGH,
    message="This transaction ID appears on a prior analysis.",
)

AMOUNT_MISMATCH = RiskSignal(
    code="AMOUNT_MISMATCH",
    severity=RiskSeverity.HIGH,
    message="Extracted amount does not match the expected payment.",
)

PROVIDER_MISMATCH = RiskSignal(
    code="PROVIDER_MISMATCH",
    severity=RiskSeverity.MEDIUM,
    message="Extracted provider does not match the expected provider.",
)

PAYEE_MISMATCH = RiskSignal(
    code="PAYEE_MISMATCH",
    severity=RiskSeverity.MEDIUM,
    message="Extracted payee does not match the merchant receiving account.",
)

EXTRACTION_AMBIGUOUS = RiskSignal(
    code="EXTRACTION_AMBIGUOUS",
    severity=RiskSeverity.MEDIUM,
    message="Extraction is incomplete or low-confidence; human review required.",
)


def extraction_is_empty(extracted: ExtractedTransaction | None) -> bool:
    if extracted is None:
        return True
    return (
        extracted.amount is None
        and not extracted.transaction_id
        and not extracted.raw_text_snippet
        and not extracted.payer_hint
        and not extracted.payee_hint
        and extracted.provider == PaymentProvider.UNKNOWN
    )


def _normalize_account(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


def payee_loosely_matches(extracted_payee: str | None, expected_identifier: str | None) -> bool:
    if not extracted_payee or not expected_identifier:
        return True
    left = _normalize_account(extracted_payee)
    right = _normalize_account(expected_identifier)
    if not left or not right:
        return True
    return right in left or left in right


def collect_screening_outcome(
    *,
    extracted: ExtractedTransaction | None,
    vision_result: dict,
    duplicate_ids: list[str],
    expected_amount: float | None = None,
    expected_provider: PaymentProvider | None = None,
    expected_payee: str | None = None,
    ambiguous: bool = False,
) -> tuple[AnalysisStatus, list[RiskSignal]]:
    """
    Map extraction + expectations to status + signals.
    Empty extraction → MANUAL_REVIEW via SCREENING_UNAVAILABLE.
    """
    _ = vision_result
    signals: list[RiskSignal] = []
    if extraction_is_empty(extracted):
        signals.append(SCREENING_UNAVAILABLE)
        status = RiskScoringService().score_signals(signals)
        return status, signals

    assert extracted is not None
    if ambiguous or (extracted.amount is None and not extracted.transaction_id):
        signals.append(EXTRACTION_AMBIGUOUS)
    if (
        expected_amount is not None
        and extracted.amount is not None
        and abs(extracted.amount - expected_amount) > PKR_EPSILON
    ):
        signals.append(AMOUNT_MISMATCH)
    if (
        expected_provider
        and expected_provider != PaymentProvider.UNKNOWN
        and extracted.provider != PaymentProvider.UNKNOWN
        and extracted.provider != expected_provider
    ):
        signals.append(PROVIDER_MISMATCH)
    if not payee_loosely_matches(extracted.payee_hint, expected_payee):
        signals.append(PAYEE_MISMATCH)
    if duplicate_ids:
        signals.append(TXN_REUSED)
    status = RiskScoringService().score_signals(signals)
    return status, signals
