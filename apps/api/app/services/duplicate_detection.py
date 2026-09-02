"""Duplicate / reused transaction-id detection boundary."""

from __future__ import annotations


class DuplicateDetectionService:
    """Passthrough until prior-analysis lookup is wired. No mock matches."""

    async def find_duplicates(self, transaction_id: str, merchant_id: str) -> list[str]:
        _ = transaction_id, merchant_id
        return []
