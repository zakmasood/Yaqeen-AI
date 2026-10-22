"""WhatsApp webhook. Live delivery stays off until the app secret is set."""

import hashlib
import hmac

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from pydantic import ValidationError

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
    if (
        hub_mode == "subscribe"
        and settings.whatsapp_verify_token
        and hub_verify_token == settings.whatsapp_verify_token
        and hub_challenge
    ):
        return PlainTextResponse(content=hub_challenge)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")


def _signature_matches(secret: str, body: bytes, header: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)


@router.post("")
async def receive_webhook(request: Request) -> dict[str, str]:
    settings = get_settings()
    if not settings.whatsapp_app_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp webhook is disabled until WHATSAPP_APP_SECRET is set",
        )
    body = await request.body()
    header = request.headers.get("x-hub-signature-256", "")
    if not header or not _signature_matches(settings.whatsapp_app_secret, body, header):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid signature")
    try:
        payload = WhatsAppWebhookPayload.model_validate_json(body)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook body",
        ) from exc
    service = WhatsAppIngestionService()
    await service.enqueue(payload)
    return {"status": "accepted"}
