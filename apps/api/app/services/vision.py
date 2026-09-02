"""Vision analysis — structured field extraction from payment screenshots."""

from __future__ import annotations

import base64
import json
import logging
import re
from datetime import datetime

import httpx

from app.core.config import get_settings
from app.models.enums import PaymentProvider
from app.schemas import ExtractedTransaction

logger = logging.getLogger(__name__)

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_MODEL = "gpt-4o-mini"

EXTRACTION_PROMPT = """You extract fields from a Pakistani payment-app screenshot
(Easypaisa, JazzCash, Raast, or bank transfer). Return JSON only, no markdown.

{
  "provider": "EASYPAISA" | "JAZZCASH" | "RAAST" | "BANK_TRANSFER" | "UNKNOWN",
  "amount": number or null,
  "currency": "PKR",
  "transaction_id": string or null,
  "occurred_at": ISO-8601 datetime or null,
  "payer_hint": string or null,
  "payee_hint": string or null,
  "ambiguous": boolean
}

Rules:
- If a field is unreadable, use null. Do not guess or invent transaction IDs or amounts.
- Set ambiguous=true if you cannot clearly read both amount and transaction_id,
  or if the image is not a payment receipt.
- Never include authenticity scores or claims that funds were received.
"""


def parse_json_object(text: str) -> dict:
    raw = text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _parse_amount(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int | float):
        if value < 0:
            return None
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace(",", "").replace("PKR", "").replace("Rs", "").strip()
        if not re.fullmatch(r"-?\d+(\.\d+)?", cleaned):
            return None
        number = float(cleaned)
        return number if number >= 0 else None
    return None


def _parse_optional_str(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    return text or None


def _parse_provider(value: object) -> PaymentProvider:
    if not isinstance(value, str):
        return PaymentProvider.UNKNOWN
    try:
        return PaymentProvider(value.strip().upper())
    except ValueError:
        return PaymentProvider.UNKNOWN


def _parse_occurred_at(value: object) -> datetime | None:
    text = _parse_optional_str(value)
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def extracted_from_vision(payload: dict) -> tuple[ExtractedTransaction | None, bool]:
    """Map provider JSON to fields. Refuse garbage; do not invent detections."""
    if not payload:
        return None, False
    ambiguous = bool(payload.get("ambiguous") or payload.get("low_confidence"))
    extracted = ExtractedTransaction(
        provider=_parse_provider(payload.get("provider")),
        amount=_parse_amount(payload.get("amount")),
        currency=_parse_optional_str(payload.get("currency")) or "PKR",
        transaction_id=_parse_optional_str(payload.get("transaction_id")),
        occurred_at=_parse_occurred_at(payload.get("occurred_at")),
        payer_hint=_parse_optional_str(payload.get("payer_hint")),
        payee_hint=_parse_optional_str(payload.get("payee_hint")),
        raw_text_snippet=None,
    )
    has_fields = (
        extracted.amount is not None
        or extracted.transaction_id
        or extracted.payer_hint
        or extracted.payee_hint
        or extracted.provider != PaymentProvider.UNKNOWN
    )
    if not has_fields:
        return None, ambiguous
    return extracted, ambiguous


class VisionAnalysisService:
    """OpenAI-compatible image JSON extraction. Empty dict when the API key is unset."""

    async def analyze_image(self, image_bytes: bytes) -> dict:
        settings = get_settings()
        if not settings.ai_vision_api_key or not image_bytes:
            return {}
        mime = "image/jpeg"
        b64 = base64.standard_b64encode(image_bytes).decode("ascii")
        model = settings.ai_vision_model.strip() or DEFAULT_MODEL
        payload = {
            "model": model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": EXTRACTION_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract payment fields from this screenshot."},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                    ],
                },
            ],
        }
        headers = {
            "Authorization": f"Bearer {settings.ai_vision_api_key}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=45.0) as http:
                response = await http.post(OPENAI_CHAT_URL, json=payload, headers=headers)
        except httpx.HTTPError:
            logger.info("Vision provider request failed")
            return {}
        if response.status_code != 200:
            logger.info("Vision provider unavailable", extra={"status": response.status_code})
            return {}
        try:
            body = response.json()
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, ValueError):
            return {}
        if not isinstance(content, str):
            return {}
        return parse_json_object(content)
