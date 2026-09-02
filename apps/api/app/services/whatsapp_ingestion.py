"""WhatsApp Cloud API ingestion — enqueue the same screening pipeline."""

from __future__ import annotations

import logging
from collections.abc import Iterator

import httpx

from app.core.config import get_settings
from app.core.supabase import get_supabase_client
from app.models.enums import PaymentProvider
from app.schemas import WhatsAppWebhookPayload
from app.services.analyses import find_merchant_by_whatsapp
from app.services.pipeline import AnalysisPipeline

logger = logging.getLogger(__name__)


def iter_inbound_images(
    payload: WhatsAppWebhookPayload,
) -> Iterator[tuple[str | None, str, str | None]]:
    """Yield (display_phone, media_id, sender) from a Meta Cloud API payload."""
    for entry in payload.entry:
        if not isinstance(entry, dict):
            continue
        for change in entry.get("changes") or []:
            if not isinstance(change, dict):
                continue
            value = change.get("value") or {}
            if not isinstance(value, dict):
                continue
            metadata = value.get("metadata") or {}
            display = None
            if isinstance(metadata, dict):
                display = metadata.get("display_phone_number") or metadata.get("phone_number_id")
            for message in value.get("messages") or []:
                if not isinstance(message, dict) or message.get("type") != "image":
                    continue
                image = message.get("image") or {}
                media_id = image.get("id") if isinstance(image, dict) else None
                if media_id:
                    yield display, str(media_id), message.get("from")


async def download_whatsapp_media(media_id: str) -> tuple[bytes, str, str] | None:
    settings = get_settings()
    if not settings.whatsapp_access_token:
        return None
    headers = {"Authorization": f"Bearer {settings.whatsapp_access_token}"}
    async with httpx.AsyncClient(timeout=30.0) as http:
        meta = await http.get(
            f"https://graph.facebook.com/v21.0/{media_id}",
            headers=headers,
        )
        if meta.status_code != 200:
            logger.info(
                "WhatsApp media metadata unavailable",
                extra={"media_id": media_id, "status": meta.status_code},
            )
            return None
        body = meta.json()
        url = body.get("url")
        mime = str(body.get("mime_type") or "image/jpeg")
        if not url:
            return None
        media = await http.get(url, headers=headers)
        if media.status_code != 200:
            logger.info(
                "WhatsApp media download unavailable",
                extra={"media_id": media_id, "status": media.status_code},
            )
            return None
        return media.content, mime, f"{media_id}.jpg"


class WhatsAppIngestionService:
    """Validate/parse inbound media and run AnalysisPipeline. No fake analyses."""

    async def enqueue(self, payload: WhatsAppWebhookPayload) -> None:
        images = list(iter_inbound_images(payload))
        if not images:
            logger.info(
                "WhatsApp webhook accepted (no image messages)",
                extra={"entry_count": len(payload.entry)},
            )
            return
        if get_supabase_client() is None:
            logger.info("WhatsApp image ignored; Supabase is not configured")
            return

        pipeline = AnalysisPipeline()
        for display_phone, media_id, sender in images:
            merchant = find_merchant_by_whatsapp(display_phone)
            if not merchant:
                logger.info(
                    "WhatsApp image ignored; no merchant for number",
                    extra={"has_phone": bool(display_phone)},
                )
                continue
            downloaded = await download_whatsapp_media(media_id)
            image_bytes, content_type, filename = downloaded if downloaded else (None, None, None)
            await pipeline.run(
                merchant_id=str(merchant["id"]),
                source="whatsapp",
                image_bytes=image_bytes,
                filename=filename,
                content_type=content_type,
                order_id=None,
                order_reference=None,
                expected_provider=PaymentProvider.UNKNOWN,
                submitter_phone=sender,
            )
