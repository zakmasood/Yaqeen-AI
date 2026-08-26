"""Object storage boundary for payment screenshots (private bucket)."""

from __future__ import annotations


class StorageService:
    """Stub: use Supabase Storage with service role on the server only."""

    async def store_screenshot(self, merchant_id: str, filename: str, data: bytes) -> str:
        raise NotImplementedError("Storage not implemented in scaffold")

    async def create_signed_url(self, object_path: str, expires_in: int = 300) -> str:
        raise NotImplementedError("Signed URL generation not implemented in scaffold")
