"""WhatsApp webhook placeholder — verify challenge only; no fake ingestion logic."""

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse

from app.core.config import get_settings
from app.schemas import WhatsAppWebhookPayload
from app.services.whatsapp_ingestion import WhatsAppIngestionService

router = APIRouter(prefix="/webhooks/whatsapp", tags=["webhooks"])


@router.get("")
def verify_webhook(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
) -> PlainTextResponse:
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token and hub_challenge:
        if settings.whatsapp_verify_token and hub_verify_token == settings.whatsapp_verify_token:
            return PlainTextResponse(content=hub_challenge)
        if not settings.whatsapp_verify_token:
            # Scaffold: allow challenge echo when token not configured (local only)
            return PlainTextResponse(content=hub_challenge)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")


@router.post("")
async def receive_webhook(request: Request, payload: WhatsAppWebhookPayload) -> dict[str, str]:
    # Signature validation + parsing belong in WhatsAppIngestionService (not implemented).
    _ = request
    service = WhatsAppIngestionService()
    await service.enqueue(payload)
    return {"status": "accepted"}
