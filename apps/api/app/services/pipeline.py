"""In-request screening pipeline. Upgrade path: a job queue when providers are slow."""

from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime

from app.core.supabase import require_supabase
from app.models.enums import PAYMENT_SCREENING_DISCLAIMER, PaymentProvider
from app.schemas import AnalysisResult
from app.services.analyses import get_analysis_by_id, get_screening_expectation
from app.services.duplicate_detection import DuplicateDetectionService
from app.services.image_hash import difference_hash
from app.services.network_claims import observe_network
from app.services.ocr import OcrService
from app.services.screening import collect_screening_outcome, extraction_is_empty
from app.services.storage import StorageService, validate_image_upload
from app.services.transaction_claims import ClaimResult, claim_owner_analysis_id, register_claim
from app.services.txn_ref import normalize_transaction_reference
from app.services.vision import VisionAnalysisService, extracted_from_vision

logger = logging.getLogger(__name__)


class AnalysisPipeline:
    """
    Store screenshot → vision extract → match / duplicate lookup → persist.
    ponytail: runs in-request. Move to a queue if vision calls become too slow.
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
        expected_amount: float | None = None,
        expected_account_id: str | None = None,
        submitter_name: str | None = None,
        submitter_phone: str | None = None,
    ) -> AnalysisResult:
        image_type: str | None = None
        if image_bytes is not None:
            image_type = validate_image_upload(image_bytes)

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
        sha256_hex: str | None = None
        phash: str | None = None
        if image_bytes and image_type:
            path = self.storage.store_screenshot(
                merchant_id, filename or "proof", image_bytes, image_type
            )
            sha256_hex = hashlib.sha256(image_bytes).hexdigest()
            phash = difference_hash(image_bytes)
            client.table("screenshots").insert(
                {
                    "analysis_id": analysis_id,
                    "merchant_id": merchant_id,
                    "storage_path": path,
                    "content_type": image_type,
                    "byte_size": len(image_bytes),
                    "sha256": sha256_hex,
                    "phash": phash,
                    "original_filename": filename,
                }
            ).execute()
            stored_bytes = image_bytes

        _ = await self.ocr.extract_text(stored_bytes)
        vision_result = await self.vision.analyze_image(
            stored_bytes,
            image_type or "image/jpeg",
        )
        extracted, ambiguous = extracted_from_vision(vision_result)

        expectation = get_screening_expectation(
            merchant_id,
            order_id,
            expected_amount,
            expected_provider,
            expected_account_id,
        )
        expected_amount = expectation.amount
        expected_currency = expectation.currency
        expected_provider = expectation.provider
        expected_payee = expectation.payee

        normalized_ref = normalize_transaction_reference(
            extracted.transaction_id if extracted else None
        )
        claim_provider = extracted.provider if extracted else provider
        claim = register_claim(
            merchant_id=merchant_id,
            provider=claim_provider,
            normalized_reference=normalized_ref,
            analysis_id=analysis_id,
        )
        duplicate_ids: list[str] = []
        if claim == ClaimResult.DUPLICATE:
            prior_id = claim_owner_analysis_id(
                merchant_id=merchant_id,
                provider=claim_provider,
                normalized_reference=normalized_ref,
            )
            duplicate_ids = [prior_id or "claim"]
        elif extracted and extracted.transaction_id:
            duplicate_ids = await self.duplicates.find_duplicates(
                extracted.transaction_id,
                merchant_id,
                exclude_analysis_id=analysis_id,
            )

        exact_image_ids: list[str] = []
        near_image_ids: list[str] = []
        if sha256_hex or phash:
            exact_image_ids, near_image_ids = await self.duplicates.find_image_matches(
                merchant_id=merchant_id,
                sha256=sha256_hex,
                phash=phash,
                exclude_analysis_id=analysis_id,
            )

        network_check = observe_network(
            merchant_id=merchant_id,
            provider=claim_provider,
            normalized_reference=normalized_ref,
            analysis_id=analysis_id,
        )
        status, signals = collect_screening_outcome(
            extracted=extracted,
            vision_result=vision_result,
            duplicate_ids=duplicate_ids,
            expected_amount=expected_amount,
            expected_currency=expected_currency,
            expected_provider=expected_provider,
            expected_payee=expected_payee,
            ambiguous=ambiguous,
            exact_image_ids=exact_image_ids,
            near_image_ids=near_image_ids,
            network_check=network_check,
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
                    "currency": extracted.currency or None,
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
                        **(
                            {"related_analysis_id": signal.related_analysis_id}
                            if signal.related_analysis_id
                            else {}
                        ),
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
