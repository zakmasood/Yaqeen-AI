"""Per-merchant transaction claim registry.

The first insert wins the unique key. A conflicting insert is a duplicate
claim: the new analysis is still stored. Owning a claim does not mean the
transfer happened.
"""

from __future__ import annotations

from enum import StrEnum

from app.core.supabase import require_supabase
from app.models.enums import PaymentProvider


class ClaimResult(StrEnum):
    RECORDED = "recorded"
    DUPLICATE = "duplicate"
    SKIPPED = "skipped"


def is_unique_violation(exc: Exception) -> bool:
    text = str(exc).lower()
    code = str(getattr(exc, "code", "") or "")
    return code == "23505" or "23505" in text or "duplicate key" in text


def register_claim(
    *,
    merchant_id: str,
    provider: PaymentProvider,
    normalized_reference: str | None,
    analysis_id: str,
) -> ClaimResult:
    """Insert a claim. Unique (merchant, provider, reference) is the lock."""
    if not normalized_reference:
        return ClaimResult.SKIPPED
    client = require_supabase()
    try:
        client.table("transaction_claims").insert(
            {
                "merchant_id": merchant_id,
                "provider": provider.value,
                "normalized_reference": normalized_reference,
                "analysis_id": analysis_id,
            }
        ).execute()
    except Exception as exc:
        if is_unique_violation(exc):
            return ClaimResult.DUPLICATE
        raise
    return ClaimResult.RECORDED


def claim_owner_analysis_id(
    *,
    merchant_id: str,
    provider: PaymentProvider,
    normalized_reference: str | None,
) -> str | None:
    """Analysis that already holds this merchant's claim. Never another merchant's."""
    if not normalized_reference:
        return None
    found = (
        require_supabase()
        .table("transaction_claims")
        .select("analysis_id")
        .eq("merchant_id", merchant_id)
        .eq("provider", provider.value)
        .eq("normalized_reference", normalized_reference)
        .limit(1)
        .execute()
    )
    rows = found.data or []
    if not rows or not rows[0].get("analysis_id"):
        return None
    return str(rows[0]["analysis_id"])
