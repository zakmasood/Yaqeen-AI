"""WhatsApp Cloud API ingestion boundary."""

from __future__ import annotations

import logging

from app.schemas import WhatsAppWebhookPayload

logger = logging.getLogger(__name__)


class WhatsAppIngestionService:
    """Stub: validate signatures, download media, enqueue analysis jobs."""

    async def enqueue(self, payload: WhatsAppWebhookPayload) -> None:
        # Accept webhook for scaffold wiring; do not parse media or invent analyses.
        logger.info(
            "WhatsApp webhook accepted (ingestion not implemented)",
            extra={"entry_count": len(payload.entry)},
        )
