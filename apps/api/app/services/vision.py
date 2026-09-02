"""Vision analysis boundary — layout / UI consistency checks."""

from __future__ import annotations


class VisionAnalysisService:
    """Passthrough until AI_VISION_PROVIDER is wired. No fake authenticity scores."""

    async def analyze_image(self, image_bytes: bytes) -> dict:
        _ = image_bytes
        return {}
