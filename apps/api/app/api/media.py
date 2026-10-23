"""Short-lived screenshot URLs for the local file store."""

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.services.storage import open_media_token

router = APIRouter(prefix="/media", tags=["media"])

_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}


@router.get("/{token}")
def read_media(token: str) -> FileResponse:
    path = open_media_token(token)
    media_type = _TYPES.get(path.suffix.lower(), "application/octet-stream")
    return FileResponse(path, media_type=media_type)
