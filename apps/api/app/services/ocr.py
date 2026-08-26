"""OCR service boundary — extract text from payment screenshots."""

from __future__ import annotations


class OcrService:
    """Stub: wire a real OCR provider later. Do not invent transaction fields."""

    async def extract_text(self, image_bytes: bytes) -> str:
        raise NotImplementedError("OCR not implemented in scaffold")
