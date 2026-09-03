"""Duplicate detection: reused txn IDs and near-duplicate screenshots."""

from __future__ import annotations

from app.core.supabase import require_supabase
from app.services.image_hash import NEAR_DUPLICATE_DISTANCE, hamming_distance


def classify_image_matches(
    *,
    sha256: str | None,
    phash: str | None,
    priors: list[dict],
    exclude_analysis_id: str | None,
) -> tuple[list[str], list[str]]:
    """Return (exact_analysis_ids, near_analysis_ids). Exact wins over near."""
    exclude = str(exclude_analysis_id or "")
    exact: list[str] = []
    near: list[str] = []
    seen_exact: set[str] = set()
    seen_near: set[str] = set()
    for row in priors:
        analysis_id = str(row.get("analysis_id") or "")
        if not analysis_id or analysis_id == exclude:
            continue
        if sha256 and row.get("sha256") == sha256:
            if analysis_id not in seen_exact:
                exact.append(analysis_id)
                seen_exact.add(analysis_id)
            continue
        distance = hamming_distance(phash or "", str(row.get("phash") or ""))
        if distance is not None and distance <= NEAR_DUPLICATE_DISTANCE:
            if analysis_id not in seen_near and analysis_id not in seen_exact:
                near.append(analysis_id)
                seen_near.add(analysis_id)
    near = [item for item in near if item not in seen_exact]
    return exact, near


class DuplicateDetectionService:
    """Prior txn IDs and screenshot hashes for the same merchant. No mock matches."""

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

    async def find_image_matches(
        self,
        *,
        merchant_id: str,
        sha256: str | None,
        phash: str | None,
        exclude_analysis_id: str | None,
    ) -> tuple[list[str], list[str]]:
        if not sha256 and not phash:
            return [], []
        client = require_supabase()
        # ponytail: scan this merchant's screenshots. Index/ANN if the table gets large.
        result = (
            client.table("screenshots")
            .select("analysis_id, sha256, phash")
            .eq("merchant_id", merchant_id)
            .execute()
        )
        return classify_image_matches(
            sha256=sha256,
            phash=phash,
            priors=result.data or [],
            exclude_analysis_id=exclude_analysis_id,
        )
