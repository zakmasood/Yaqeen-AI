"""Cross-merchant reference matching.

Payment providers do not share one global transaction-id space. Easypaisa,
JazzCash, Raast, and bank transfers are separate namespaces, and short
references collide inside a provider. The canonical identity is:

    PROVIDER + newline + normalized reference

The fingerprint is HMAC-SHA256 with NETWORK_CLAIM_KEY, which stays on the
server. A match means another merchant submitted the same provider reference.
It does not name that merchant and it does not prove the payment is fraudulent.
References shorter than 8 characters, and UNKNOWN provider, do not create an
identity. ponytail: per-provider length rules can replace the single floor of 8.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from enum import StrEnum

from app.core.config import get_settings
from app.core.supabase import require_supabase
from app.models.enums import PaymentProvider

logger = logging.getLogger(__name__)

MIN_REFERENCE_LENGTH = 8


class NetworkCheck(StrEnum):
    """Result of one cross-merchant lookup. A failure is not a clean miss."""

    CHECKED_NO_MATCH = "CHECKED_NO_MATCH"
    CHECKED_MATCH = "CHECKED_MATCH"
    SKIPPED = "SKIPPED"
    UNAVAILABLE = "UNAVAILABLE"


def reference_can_identify(provider: PaymentProvider, normalized: str | None) -> bool:
    if provider == PaymentProvider.UNKNOWN or not normalized:
        return False
    return len(normalized) >= MIN_REFERENCE_LENGTH


def fingerprint(provider: str, normalized: str, key: str) -> str:
    canonical = f"{provider}\n{normalized}".encode()
    return hmac.new(key.encode(), canonical, hashlib.sha256).hexdigest()


def observe_network(
    *,
    merchant_id: str,
    provider: PaymentProvider,
    normalized_reference: str | None,
    analysis_id: str,
) -> NetworkCheck:
    """Look up one reference. Does not invent a match when the check cannot run.

    The log line names the failure class only. It does not include the key,
    the fingerprint, or the reference.
    """
    if not reference_can_identify(provider, normalized_reference):
        return NetworkCheck.SKIPPED
    key = get_settings().network_claim_key.strip()
    if not key:
        logger.warning("Cross-merchant check unavailable (missing configuration)")
        return NetworkCheck.UNAVAILABLE
    assert normalized_reference is not None
    digest = fingerprint(provider.value, normalized_reference, key)
    try:
        result = (
            require_supabase()
            .rpc(
                "register_network_observation",
                {
                    "p_fingerprint": digest,
                    "p_provider": provider.value,
                    "p_merchant_id": merchant_id,
                    "p_analysis_id": analysis_id,
                },
            )
            .execute()
        )
    except Exception as exc:
        logger.error("Cross-merchant check unavailable (%s)", type(exc).__name__)
        return NetworkCheck.UNAVAILABLE
    if result.data is True:
        return NetworkCheck.CHECKED_MATCH
    if result.data is False:
        return NetworkCheck.CHECKED_NO_MATCH
    logger.error("Cross-merchant check unavailable (unexpected result)")
    return NetworkCheck.UNAVAILABLE
