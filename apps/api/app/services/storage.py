"""Object storage for payment screenshots (private Supabase bucket)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import re
import time
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, status
from PIL import Image

from app.core.config import get_settings
from app.core.supabase import require_supabase

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
ALLOWED_CONTENT_TYPES = frozenset({"image/png", "image/jpeg", "image/webp"})
_UNSAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")
_FORMAT_FOR_TYPE = {"image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WEBP"}


def sign_media_token(object_path: str, ttl_seconds: int = 300) -> str:
    settings = get_settings()
    exp = int(time.time()) + ttl_seconds
    body = f"{exp}.{object_path}"
    sig = hmac.new(settings.local_auth_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    raw = f"{exp}.{sig}.{object_path}".encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def open_media_token(token: str) -> Path:
    settings = get_settings()
    padded = token + "=" * (-len(token) % 4)
    try:
        raw = base64.urlsafe_b64decode(padded).decode()
        exp_text, sig, object_path = raw.split(".", 2)
        exp = int(exp_text)
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc
    body = f"{exp}.{object_path}"
    expected = hmac.new(
        settings.local_auth_secret.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    if exp < int(time.time()) or not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    root = Path(settings.local_storage_dir).resolve()
    dest = (root / object_path).resolve()
    if root not in dest.parents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    if not dest.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return dest


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


def sniffed_image_type(data: bytes) -> str:
    """Return a supported image MIME type, or raise if the bytes are not one."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        sniffed = "image/png"
    elif data.startswith(b"\xff\xd8\xff"):
        sniffed = "image/jpeg"
    elif len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        sniffed = "image/webp"
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PNG, JPEG, or WEBP screenshots are accepted",
        )
    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()
        with Image.open(BytesIO(data)) as image:
            image.load()
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Screenshot dimensions are too large",
                )
            fmt = (image.format or "").upper()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Screenshot could not be decoded",
        ) from exc
    if fmt != _FORMAT_FOR_TYPE[sniffed]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Screenshot content does not match its image type",
        )
    return sniffed


def validate_image_upload(data: bytes) -> str:
    """Size, magic bytes, and a successful decode. Returns the sniffed MIME type."""
    validate_upload_size(len(data))
    return sniffed_image_type(data)


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
        content_type = validate_image_upload(data)
        safe_name = _UNSAFE_NAME.sub("_", filename or "proof")[:80] or "proof"
        object_path = f"{merchant_id}/{uuid.uuid4().hex}_{safe_name}"
        settings = get_settings()
        if settings.local_storage_dir:
            dest = Path(settings.local_storage_dir) / object_path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            return object_path
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
        settings = get_settings()
        if settings.local_storage_dir:
            token = sign_media_token(object_path)
            return f"{settings.public_api_url.rstrip('/')}/api/v1/media/{token}"
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
