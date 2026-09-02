"""In-request screening pipeline. Upgrade path: a job queue when providers are slow."""

from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime

from app.core.supabase import require_supabase
from app.models.enums import PAYMENT_SCREENING_DISCLAIMER, PaymentProvider
from app.schemas import AnalysisResult, ExtractedTransaction
from app.services.analyses import get_analysis_by_id
from app.services.duplicate_detection import DuplicateDetectionService
from app.services.ocr import OcrService
from app.services.screening import collect_screening_outcome, extraction_is_empty
from app.services.storage import StorageService, resolve_content_type, validate_upload_size
from app.services.vision import VisionAnalysisService

logger = logging.getLogger(__name__)


class AnalysisPipeline:
    """
    Store screenshot → OCR stub → vision stub → duplicate stub → risk score → persist.
    ponytail: runs in-request. Move to a queue if OCR/vision ever become real network calls.
    """

    def __init__(
        self,
        storage: StorageService | None = None,
        ocr: OcrService | None = None,
        vision: VisionAnalysisService | None = None,
        duplicates: DuplicateDetectionService | None = None,
    ) -> None:
        self.storage = storage or StorageService()
        self.ocr = ocr or OcrService()
        self.vision = vision or VisionAnalysisService()
        self.duplicates = duplicates or DuplicateDetectionService()

    async def run(
        self,
        *,
        merchant_id: str,
        source: str,
        image_bytes: bytes | None,
        filename: str | None,
        content_type: str | None,
        order_id: str | None,
        order_reference: str | None,
        expected_provider: PaymentProvider | None,
        submitter_name: str | None = None,
        submitter_phone: str | None = None,
    ) -> AnalysisResult:
        client = require_supabase()
        provider = expected_provider or PaymentProvider.UNKNOWN
        inserted = (
            client.table("analyses")
            .insert(
                {
                    "merchant_id": merchant_id,
                    "order_id": order_id,
                    "order_reference": order_reference,
                    "status": "MANUAL_REVIEW",
                    "provider": provider.value,
                    "disclaimer": PAYMENT_SCREENING_DISCLAIMER,
                    "source": source,
                    "submitter_name": submitter_name,
                    "submitter_phone": submitter_phone,
                }
            )
            .execute()
        )
        row = (inserted.data or [None])[0]
        if not row:
            raise RuntimeError("Failed to create analysis")
        analysis_id = str(row["id"])

        stored_bytes = b""
        if image_bytes:
            validate_upload_size(len(image_bytes))
            normalized_type = resolve_content_type(content_type, filename)
            path = self.storage.store_screenshot(
                merchant_id, filename or "proof", image_bytes, normalized_type
            )
            client.table("screenshots").insert(
                {
                    "analysis_id": analysis_id,
                    "merchant_id": merchant_id,
                    "storage_path": path,
                    "content_type": normalized_type,
                    "byte_size": len(image_bytes),
                    "sha256": hashlib.sha256(image_bytes).hexdigest(),
                    "original_filename": filename,
                }
            ).execute()
            stored_bytes = image_bytes

        ocr_text = await self.ocr.extract_text(stored_bytes)
        vision_result = await self.vision.analyze_image(stored_bytes)
        extracted: ExtractedTransaction | None = None
        if ocr_text.strip():
            # Real providers will parse fields; do not invent them from stub output.
            extracted = ExtractedTransaction(
                provider=provider,
                raw_text_snippet=ocr_text[:500],
            )

        duplicate_ids: list[str] = []
        if extracted and extracted.transaction_id:
            duplicate_ids = await self.duplicates.find_duplicates(
                extracted.transaction_id, merchant_id
            )

        status, signals = collect_screening_outcome(
            extracted=extracted,
            vision_result=vision_result,
            duplicate_ids=duplicate_ids,
        )

        now = datetime.now(UTC).isoformat()
        update: dict = {"status": status.value, "updated_at": now}
        if extracted and not extraction_is_empty(extracted):
            update["provider"] = extracted.provider.value
            client.table("extracted_transactions").insert(
                {
                    "analysis_id": analysis_id,
                    "provider": extracted.provider.value,
                    "amount": extracted.amount,
                    "currency": extracted.currency,
                    "transaction_id": extracted.transaction_id,
                    "occurred_at": extracted.occurred_at.isoformat()
                    if extracted.occurred_at
                    else None,
                    "payer_hint": extracted.payer_hint,
                    "payee_hint": extracted.payee_hint,
                    "raw_text_snippet": extracted.raw_text_snippet,
                }
            ).execute()

        if signals:
            client.table("risk_signals").insert(
                [
                    {
                        "analysis_id": analysis_id,
                        "code": signal.code,
                        "severity": signal.severity.value,
                        "message": signal.message,
                    }
                    for signal in signals
                ]
            ).execute()

        client.table("analyses").update(update).eq("id", analysis_id).execute()
        logger.info(
            "Analysis pipeline finished",
            extra={"analysis_id": analysis_id, "status": status.value},
        )
        return get_analysis_by_id(analysis_id)
