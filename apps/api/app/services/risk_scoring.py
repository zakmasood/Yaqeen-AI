"""Risk scoring — map discrete signals to an operational status. No authenticity %."""

from __future__ import annotations

from app.models.enums import AnalysisStatus, RiskSeverity
from app.schemas import RiskSignal


class RiskScoringService:
    """
    HIGH → SUSPICIOUS.
    MEDIUM / LOW → MANUAL_REVIEW.
    No blocking signals (and real extraction upstream) → READY_FOR_CONFIRMATION.
    Never emit authenticity percentages or 'verified payment' claims.
    """

    def score_signals(self, signals: list[RiskSignal]) -> AnalysisStatus:
        if any(signal.severity == RiskSeverity.HIGH for signal in signals):
            return AnalysisStatus.SUSPICIOUS
        if any(signal.severity in (RiskSeverity.MEDIUM, RiskSeverity.LOW) for signal in signals):
            return AnalysisStatus.MANUAL_REVIEW
        return AnalysisStatus.READY_FOR_CONFIRMATION

    async def score(self, signals: list[RiskSignal]) -> AnalysisStatus:
        return self.score_signals(signals)
