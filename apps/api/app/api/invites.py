"""Authenticated proof-invite minting."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.core.auth import MerchantAuth
from app.schemas import InviteCreateRequest, InviteCreateResponse
from app.services.invites import create_invite

router = APIRouter(prefix="/invites", tags=["invites"])


@router.post("", response_model=InviteCreateResponse, status_code=status.HTTP_201_CREATED)
def create_proof_invite(body: InviteCreateRequest, merchant: MerchantAuth) -> InviteCreateResponse:
    return create_invite(
        merchant_id=merchant.merchant_id,
        merchant_name=merchant.merchant_name,
        order_reference=body.order_reference,
        expected_amount=body.expected_amount,
        invited_phone=body.invited_phone,
    )
