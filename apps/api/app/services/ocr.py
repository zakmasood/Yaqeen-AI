"""OCR service boundary — extract text from payment screenshots."""

from __future__ import annotations


class OcrService:
    """Passthrough until a real OCR provider is wired. Do not invent transaction fields."""

    async def extract_text(self, image_bytes: bytes) -> str:
        _ = image_bytes
        return ""
