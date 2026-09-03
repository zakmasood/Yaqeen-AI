"""Difference hash for near-duplicate payment screenshots."""

from __future__ import annotations

from io import BytesIO

from PIL import Image

# 64-bit dHash. Hamming <= this counts as the same picture after recompress/crop.
NEAR_DUPLICATE_DISTANCE = 10


def difference_hash(image_bytes: bytes) -> str | None:
    """9x8 grayscale dHash as 16 hex chars. None if the bytes are not an image."""
    try:
        image = Image.open(BytesIO(image_bytes)).convert("L")
    except Exception:  # noqa: BLE001 — PIL raises many types for bad bytes
        return None
    # 8 comparisons per row × 8 rows = 64 bits
    image = image.resize((9, 8), Image.Resampling.LANCZOS)
    bits = 0
    for row in range(8):
        for col in range(8):
            left = image.getpixel((col, row))
            right = image.getpixel((col + 1, row))
            bits = (bits << 1) | (1 if left > right else 0)
    return f"{bits:016x}"


def hamming_distance(left: str, right: str) -> int | None:
    if not left or not right or len(left) != len(right):
        return None
    try:
        return (int(left, 16) ^ int(right, 16)).bit_count()
    except ValueError:
        return None
