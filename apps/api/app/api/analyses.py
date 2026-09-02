"""Analyses — persist screenshots and run the screening pipeline."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.auth import MerchantAuth
from app.models.enums import PaymentProvider
from app.schemas import AnalysisListResponse, AnalysisResult
from app.services.analyses import find_or_create_order, get_analysis, list_analyses, mark_reviewed
from app.services.pipeline import AnalysisPipeline

router = APIRouter(prefix="/analyses", tags=["analyses"])


def _parse_provider(value: str | None) -> PaymentProvider | None:
    if not value:
        return None
    try:
        return PaymentProvider(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unknown payment provider",
        ) from exc


@router.get("", response_model=AnalysisListResponse)
def list_merchant_analyses(merchant: MerchantAuth) -> AnalysisListResponse:
    items = list_analyses(merchant.merchant_id)
    return AnalysisListResponse(items=items, total=len(items))


@router.get("/{analysis_id}", response_model=AnalysisResult)
def get_merchant_analysis(analysis_id: str, merchant: MerchantAuth) -> AnalysisResult:
    return get_analysis(merchant.merchant_id, analysis_id)


@router.patch("/{analysis_id}/review", response_model=AnalysisResult)
def review_analysis(analysis_id: str, merchant: MerchantAuth) -> AnalysisResult:
    return mark_reviewed(merchant.merchant_id, analysis_id)


@router.post("", response_model=AnalysisResult, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    merchant: MerchantAuth,
    file: Annotated[UploadFile, File()],
    order_reference: Annotated[str | None, Form()] = None,
    expected_amount: Annotated[float | None, Form()] = None,
    expected_provider: Annotated[str | None, Form()] = None,
    expected_account_id: Annotated[str | None, Form()] = None,
) -> AnalysisResult:
    provider = _parse_provider(expected_provider)
    order_id, stored_ref, _amount = find_or_create_order(
        merchant.merchant_id,
        order_reference.strip() if order_reference else None,
        expected_amount,
        provider.value if provider else None,
        expected_account_id,
    )
    image_bytes = await file.read()
    return await AnalysisPipeline().run(
        merchant_id=merchant.merchant_id,
        source="upload",
        image_bytes=image_bytes,
        filename=file.filename,
        content_type=file.content_type,
        order_id=order_id,
        order_reference=stored_ref,
        expected_provider=provider,
    )
