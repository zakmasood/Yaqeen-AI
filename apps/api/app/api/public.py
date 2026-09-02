"""Public customer proof submission — scoped by merchant slug, no dashboard auth."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.schemas import AnalysisResult
from app.services.analyses import find_or_create_order, get_merchant_by_slug
from app.services.pipeline import AnalysisPipeline

router = APIRouter(prefix="/public", tags=["public"])


@router.post("/submissions", response_model=AnalysisResult, status_code=status.HTTP_201_CREATED)
async def create_public_submission(
    file: Annotated[UploadFile, File()],
    merchant_slug: Annotated[str, Form()],
    order_reference: Annotated[str, Form()],
    name: Annotated[str | None, Form()] = None,
    phone: Annotated[str | None, Form()] = None,
) -> AnalysisResult:
    slug = merchant_slug.strip()
    reference = order_reference.strip()
    if not slug or not reference:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Merchant slug and order reference are required",
        )
    merchant = get_merchant_by_slug(slug)
    order_id, stored_ref, _amount = find_or_create_order(
        str(merchant["id"]),
        reference,
        expected_amount=None,
        expected_provider=None,
        expected_account_id=None,
    )
    image_bytes = await file.read()
    return await AnalysisPipeline().run(
        merchant_id=str(merchant["id"]),
        source="upload",
        image_bytes=image_bytes,
        filename=file.filename,
        content_type=file.content_type,
        order_id=order_id,
        order_reference=stored_ref or reference,
        expected_provider=None,
        submitter_name=name.strip() if name else None,
        submitter_phone=phone.strip() if phone else None,
    )
