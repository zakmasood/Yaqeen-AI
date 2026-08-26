"""Risk scoring boundary — produce AnalysisStatus + RiskSignal list."""

from __future__ import annotations

from app.models.enums import AnalysisStatus
from app.schemas import RiskSignal


class RiskScoringService:
    """
    Stub: map signals to READY_FOR_CONFIRMATION | MANUAL_REVIEW | SUSPICIOUS.
    Never emit authenticity percentages or 'verified payment' claims.
    """

    async def score(self, signals: list[RiskSignal]) -> AnalysisStatus:
        raise NotImplementedError("Risk scoring not implemented in scaffold")
