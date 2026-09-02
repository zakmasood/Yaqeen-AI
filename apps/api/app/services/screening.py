"""Screening outcome from stub (or future real) provider results. No fake scores."""

from __future__ import annotations

from app.models.enums import AnalysisStatus, RiskSeverity
from app.schemas import ExtractedTransaction, RiskSignal
from app.services.risk_scoring import RiskScoringService

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


def extraction_is_empty(extracted: ExtractedTransaction | None) -> bool:
    if extracted is None:
        return True
    return (
        extracted.amount is None
        and not extracted.transaction_id
        and not extracted.raw_text_snippet
        and not extracted.payer_hint
        and not extracted.payee_hint
    )


def collect_screening_outcome(
    *,
    extracted: ExtractedTransaction | None,
    vision_result: dict,
    duplicate_ids: list[str],
) -> tuple[AnalysisStatus, list[RiskSignal]]:
    """
    Map provider output to status + signals.
    Stub OCR/vision yield empty extraction → MANUAL_REVIEW, never READY_FOR_CONFIRMATION.
    """
    _ = vision_result  # reserved for layout signals when a provider is wired
    signals: list[RiskSignal] = []
    if extraction_is_empty(extracted):
        signals.append(SCREENING_UNAVAILABLE)
    if duplicate_ids:
        signals.append(TXN_REUSED)
    status = RiskScoringService().score_signals(signals)
    return status, signals
