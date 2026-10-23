"""Screening outcome from extraction, matching, and duplicate lookup. No fake scores."""

from __future__ import annotations

from app.models.enums import AnalysisStatus, PaymentProvider, RiskSeverity
from app.schemas import ExtractedTransaction, RiskSignal
from app.services.network_claims import NetworkCheck
from app.services.risk_scoring import RiskScoringService
from app.services.txn_ref import normalize_transaction_reference

PKR_EPSILON = 0.5

SCREENING_UNAVAILABLE = RiskSignal(
    code="SCREENING_UNAVAILABLE",
    severity=RiskSeverity.MEDIUM,
    message="The screenshot reader is not set up. Review this proof yourself.",
)

TXN_REUSED = RiskSignal(
    code="TXN_REUSED",
    severity=RiskSeverity.HIGH,
    message="This transaction ID is already on an earlier proof from your shop.",
)

EXACT_IMAGE_REUSED = RiskSignal(
    code="EXACT_IMAGE_REUSED",
    severity=RiskSeverity.HIGH,
    message="This exact screenshot was submitted before.",
)

NEAR_DUPLICATE_IMAGE = RiskSignal(
    code="NEAR_DUPLICATE_IMAGE",
    severity=RiskSeverity.MEDIUM,
    message="This looks like a screenshot you already received. Check it before you fulfil the order.",
)

AMOUNT_MISMATCH = RiskSignal(
    code="AMOUNT_MISMATCH",
    severity=RiskSeverity.HIGH,
    message="The amount on the screenshot doesn't match the order.",
)

PROVIDER_MISMATCH = RiskSignal(
    code="PROVIDER_MISMATCH",
    severity=RiskSeverity.MEDIUM,
    message="The provider on the screenshot doesn't match the one you expected.",
)

PAYEE_MISMATCH = RiskSignal(
    code="PAYEE_MISMATCH",
    severity=RiskSeverity.MEDIUM,
    message="The recipient on the screenshot doesn't match your receiving account.",
)

EXTRACTION_AMBIGUOUS = RiskSignal(
    code="EXTRACTION_AMBIGUOUS",
    severity=RiskSeverity.MEDIUM,
    message="The screenshot is hard to read. Review it yourself.",
)

AMOUNT_UNAVAILABLE = RiskSignal(
    code="AMOUNT_UNAVAILABLE",
    severity=RiskSeverity.MEDIUM,
    message="No amount could be read from this screenshot.",
)

CURRENCY_UNAVAILABLE = RiskSignal(
    code="CURRENCY_UNAVAILABLE",
    severity=RiskSeverity.MEDIUM,
    message="No currency could be read from this screenshot.",
)

CURRENCY_MISMATCH = RiskSignal(
    code="CURRENCY_MISMATCH",
    severity=RiskSeverity.MEDIUM,
    message="Extracted currency does not match the expected currency.",
)

PROVIDER_UNAVAILABLE = RiskSignal(
    code="PROVIDER_UNAVAILABLE",
    severity=RiskSeverity.MEDIUM,
    message="No payment provider could be read from this screenshot.",
)

PAYEE_UNAVAILABLE = RiskSignal(
    code="PAYEE_UNAVAILABLE",
    severity=RiskSeverity.MEDIUM,
    message="No recipient could be read from this screenshot.",
)

TXN_REFERENCE_UNAVAILABLE = RiskSignal(
    code="TXN_REFERENCE_UNAVAILABLE",
    severity=RiskSeverity.MEDIUM,
    message="No transaction reference could be read from this screenshot.",
)

NETWORK_REFERENCE_REUSED = RiskSignal(
    code="NETWORK_REFERENCE_REUSED",
    severity=RiskSeverity.MEDIUM,
    message=(
        "This reference was also submitted to another Yaqeen merchant. "
        "That is a risk indicator, not confirmation of fraud. "
        "The other merchant is not named."
    ),
)

NETWORK_CHECK_CLEAR = RiskSignal(
    code="NETWORK_CHECK_CLEAR",
    severity=RiskSeverity.INFO,
    message=(
        "The check finished. No other Yaqeen merchant has submitted this reference."
    ),
)

NETWORK_CHECK_SKIPPED = RiskSignal(
    code="NETWORK_CHECK_SKIPPED",
    severity=RiskSeverity.INFO,
    message=(
        "This check did not run. The reference was missing, too short, or the provider was unknown."
    ),
)

NETWORK_CHECK_UNAVAILABLE = RiskSignal(
    code="NETWORK_CHECK_UNAVAILABLE",
    severity=RiskSeverity.INFO,
    message=(
        "This check did not finish. No warning here does not mean the reference is unique."
    ),
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
    """True only when both sides are present and one contains the other.

    A missing value is not a match. Callers record PAYEE_UNAVAILABLE instead.
    """
    if not extracted_payee or not expected_identifier:
        return False
    left = _normalize_account(extracted_payee)
    right = _normalize_account(expected_identifier)
    if not left or not right:
        return False
    return right in left or left in right


def collect_screening_outcome(
    *,
    extracted: ExtractedTransaction | None,
    vision_result: dict,
    duplicate_ids: list[str],
    expected_amount: float | None = None,
    expected_currency: str | None = None,
    expected_provider: PaymentProvider | None = None,
    expected_payee: str | None = None,
    ambiguous: bool = False,
    exact_image_ids: list[str] | None = None,
    near_image_ids: list[str] | None = None,
    network_check: NetworkCheck | None = None,
) -> tuple[AnalysisStatus, list[RiskSignal]]:
    """
    Map extraction + expectations + image matches to status + signals.

    READY_FOR_CONFIRMATION requires a complete read (amount, currency, provider,
    recipient, transaction reference) and no contradictions. A missing field is
    MANUAL_REVIEW, not a match. Merchant expectations that were never set are
    not treated as successful comparisons. Screening does not prove funds moved.
    """
    _ = vision_result
    signals: list[RiskSignal] = []
    if extraction_is_empty(extracted):
        signals.append(SCREENING_UNAVAILABLE)
    else:
        assert extracted is not None
        if ambiguous:
            signals.append(EXTRACTION_AMBIGUOUS)
        if extracted.amount is None:
            signals.append(AMOUNT_UNAVAILABLE)
        elif expected_amount is not None and abs(extracted.amount - expected_amount) > PKR_EPSILON:
            signals.append(AMOUNT_MISMATCH)
        currency = (extracted.currency or "").strip()
        if not currency:
            signals.append(CURRENCY_UNAVAILABLE)
        elif expected_currency and currency.upper() != expected_currency.strip().upper():
            signals.append(CURRENCY_MISMATCH)
        if extracted.provider == PaymentProvider.UNKNOWN:
            signals.append(PROVIDER_UNAVAILABLE)
        elif (
            expected_provider
            and expected_provider != PaymentProvider.UNKNOWN
            and extracted.provider != expected_provider
        ):
            signals.append(PROVIDER_MISMATCH)
        if not (extracted.payee_hint or "").strip():
            signals.append(PAYEE_UNAVAILABLE)
        elif expected_payee and not payee_loosely_matches(extracted.payee_hint, expected_payee):
            signals.append(PAYEE_MISMATCH)
        if normalize_transaction_reference(extracted.transaction_id) is None:
            signals.append(TXN_REFERENCE_UNAVAILABLE)
    if duplicate_ids:
        signals.append(_with_related(TXN_REUSED, duplicate_ids))
    if exact_image_ids:
        signals.append(_with_related(EXACT_IMAGE_REUSED, exact_image_ids))
    elif near_image_ids:
        signals.append(_with_related(NEAR_DUPLICATE_IMAGE, near_image_ids))
    signals.extend(_network_signals(network_check))
    status = RiskScoringService().score_signals(signals)
    return status, signals


def _network_signals(network_check: NetworkCheck | None) -> list[RiskSignal]:
    """Availability is recorded. Only a real match becomes a risk signal."""
    if network_check == NetworkCheck.CHECKED_MATCH:
        return [NETWORK_REFERENCE_REUSED]
    if network_check == NetworkCheck.CHECKED_NO_MATCH:
        return [NETWORK_CHECK_CLEAR]
    if network_check == NetworkCheck.SKIPPED:
        return [NETWORK_CHECK_SKIPPED]
    if network_check == NetworkCheck.UNAVAILABLE:
        return [NETWORK_CHECK_UNAVAILABLE]
    return []


def _with_related(signal: RiskSignal, analysis_ids: list[str]) -> RiskSignal:
    """Link a same-merchant prior analysis. Cross-merchant matches stay unlinkable."""
    prior = next((item for item in analysis_ids if item and item != "claim"), None)
    if not prior:
        return signal
    return signal.model_copy(update={"related_analysis_id": prior})
