"""Duplicate / reused transaction-id detection against prior analyses."""

from __future__ import annotations

from app.core.supabase import require_supabase


class DuplicateDetectionService:
    """Look up prior extracted transaction IDs for the same merchant. No mock matches."""

    async def find_duplicates(
        self,
        transaction_id: str,
        merchant_id: str,
        exclude_analysis_id: str | None = None,
    ) -> list[str]:
        txn = transaction_id.strip()
        if not txn:
            return []
        client = require_supabase()
        hits = (
            client.table("extracted_transactions")
            .select("analysis_id")
            .eq("transaction_id", txn)
            .execute()
        )
        analysis_ids = [
            str(row["analysis_id"])
            for row in (hits.data or [])
            if row.get("analysis_id") and str(row["analysis_id"]) != str(exclude_analysis_id or "")
        ]
        if not analysis_ids:
            return []
        owned = (
            client.table("analyses")
            .select("id")
            .eq("merchant_id", merchant_id)
            .in_("id", analysis_ids)
            .execute()
        )
        return [str(row["id"]) for row in (owned.data or []) if row.get("id")]
