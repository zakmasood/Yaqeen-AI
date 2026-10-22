"""Public customer proof submission — slug fallback or per-ask invite token."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.schemas import PublicInviteResponse, PublicSubmissionAck
from app.services.analyses import find_or_create_order, get_merchant_by_slug
from app.services.invites import (
    attach_invite_analysis,
    claim_invite_for_submission,
    public_invite,
    release_invite_claim,
)
from app.services.pipeline import AnalysisPipeline

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/invites/{token}", response_model=PublicInviteResponse)
def get_public_invite(token: str) -> PublicInviteResponse:
    return public_invite(token)


@router.post(
    "/invites/{token}/submissions",
    response_model=PublicSubmissionAck,
    status_code=status.HTTP_201_CREATED,
)
async def create_invite_submission(
    token: str,
    file: Annotated[UploadFile, File()],
    name: Annotated[str | None, Form()] = None,
    phone: Annotated[str | None, Form()] = None,
) -> PublicSubmissionAck:
    row = claim_invite_for_submission(token)
    order = row.get("orders") or {}
    merchant_id = str(row["merchant_id"])
    order_id = str(row["order_id"])
    order_reference = str(order.get("order_reference") or "")
    amount = order.get("expected_amount")
    expected_amount = float(amount) if amount is not None else None
    submitter_phone = (phone.strip() if phone and phone.strip() else None) or row.get(
        "invited_phone"
    )
    image_bytes = await file.read()
    try:
        result = await AnalysisPipeline().run(
            merchant_id=merchant_id,
            source="upload",
            image_bytes=image_bytes,
            filename=file.filename,
            content_type=file.content_type,
            order_id=order_id,
            order_reference=order_reference,
            expected_provider=None,
            expected_amount=expected_amount,
            submitter_name=name.strip() if name else None,
            submitter_phone=submitter_phone,
        )
    except Exception:
        release_invite_claim(str(row["id"]))
        raise
    attach_invite_analysis(str(row["id"]), result.id)
    return PublicSubmissionAck(id=result.id)


@router.post(
    "/submissions",
    response_model=PublicSubmissionAck,
    status_code=status.HTTP_201_CREATED,
)
async def create_public_submission(
    file: Annotated[UploadFile, File()],
    merchant_slug: Annotated[str, Form()],
    order_reference: Annotated[str, Form()],
    name: Annotated[str | None, Form()] = None,
    phone: Annotated[str | None, Form()] = None,
) -> PublicSubmissionAck:
    slug = merchant_slug.strip()
    reference = order_reference.strip()
    if not slug or not reference:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Merchant slug and order reference are required",
        )
    merchant = get_merchant_by_slug(slug)
    order_id, stored_ref, amount = find_or_create_order(
        str(merchant["id"]),
        reference,
        expected_amount=None,
        expected_provider=None,
        expected_account_id=None,
    )
    image_bytes = await file.read()
    result = await AnalysisPipeline().run(
        merchant_id=str(merchant["id"]),
        source="upload",
        image_bytes=image_bytes,
        filename=file.filename,
        content_type=file.content_type,
        order_id=order_id,
        order_reference=stored_ref or reference,
        expected_provider=None,
        expected_amount=amount,
        submitter_name=name.strip() if name else None,
        submitter_phone=phone.strip() if phone else None,
    )
    return PublicSubmissionAck(id=result.id)
