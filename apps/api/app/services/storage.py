"""Object storage for payment screenshots (private Supabase bucket)."""

from __future__ import annotations

import re
import uuid

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.supabase import require_supabase

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = frozenset({"image/png", "image/jpeg", "image/webp"})
_UNSAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def normalize_content_type(content_type: str | None) -> str:
    raw = (content_type or "").split(";", 1)[0].strip().lower()
    if raw == "image/jpg":
        raw = "image/jpeg"
    if raw not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PNG, JPEG, or WEBP screenshots are accepted",
        )
    return raw


def resolve_content_type(content_type: str | None, filename: str | None) -> str:
    raw = (content_type or "").split(";", 1)[0].strip().lower()
    if raw and raw != "application/octet-stream":
        return normalize_content_type(raw)
    name = (filename or "").lower()
    if name.endswith(".png"):
        return "image/png"
    if name.endswith(".webp"):
        return "image/webp"
    if name.endswith(".jpg") or name.endswith(".jpeg"):
        return "image/jpeg"
    return normalize_content_type(content_type)


def validate_upload_size(size: int) -> None:
    if size <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Screenshot file is empty",
        )
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Screenshot exceeds 10 MB",
        )


class StorageService:
    """Upload and sign objects with the service role. Never log raw bytes."""

    def __init__(self, bucket: str | None = None) -> None:
        settings = get_settings()
        self.bucket = bucket or settings.supabase_storage_bucket

    def store_screenshot(
        self,
        merchant_id: str,
        filename: str,
        data: bytes,
        content_type: str,
    ) -> str:
        validate_upload_size(len(data))
        content_type = normalize_content_type(content_type)
        safe_name = _UNSAFE_NAME.sub("_", filename or "proof")[:80] or "proof"
        object_path = f"{merchant_id}/{uuid.uuid4().hex}_{safe_name}"
        client = require_supabase()
        client.storage.from_(self.bucket).upload(
            object_path,
            data,
            file_options={"content-type": content_type, "upsert": "false"},
        )
        return object_path

    def create_signed_url(self, object_path: str, expires_in: int = 300) -> str | None:
        if not object_path:
            return None
        client = require_supabase()
        response = client.storage.from_(self.bucket).create_signed_url(object_path, expires_in)
        if not isinstance(response, dict):
            return None
        url = response.get("signedURL") or response.get("signedUrl")
        if not url:
            return None
        if str(url).startswith("http"):
            return str(url)
        settings = get_settings()
        return f"{settings.supabase_url.rstrip('/')}{url}"
