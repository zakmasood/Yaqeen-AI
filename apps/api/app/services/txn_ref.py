"""Provider-aware transaction reference normalization.

Separators are removed. Letters are kept: some rails use alphanumeric
references, so this does not strip every non-digit.
"""

from __future__ import annotations


def normalize_transaction_reference(raw: str | None) -> str | None:
    """Uppercase alphanumerics only. None when nothing claimable remains."""
    if not raw:
        return None
    normalized = "".join(ch for ch in raw.upper() if ch.isalnum())
    return normalized or None
