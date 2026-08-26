"""Duplicate / reused transaction-id detection boundary."""

from __future__ import annotations


class DuplicateDetectionService:
    """Stub: compare against prior analyses. No mock matches."""

    async def find_duplicates(self, transaction_id: str, merchant_id: str) -> list[str]:
        raise NotImplementedError("Duplicate detection not implemented in scaffold")
