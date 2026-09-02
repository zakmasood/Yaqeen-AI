"""Merchant payment accounts for the authenticated merchant."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.auth import MerchantAuth
from app.core.supabase import require_supabase
from app.models.enums import PaymentProvider
from app.schemas import (
    MerchantAccountCreateRequest,
    MerchantAccountListResponse,
    MerchantAccountResponse,
)

router = APIRouter(prefix="/merchant-accounts", tags=["merchant-accounts"])


def _to_account(row: dict) -> MerchantAccountResponse:
    try:
        provider = PaymentProvider(str(row.get("provider")))
    except ValueError:
        provider = PaymentProvider.UNKNOWN
    return MerchantAccountResponse(
        id=str(row["id"]),
        merchant_id=str(row["merchant_id"]),
        provider=provider,
        account_label=str(row["account_label"]),
        account_identifier=str(row["account_identifier"]),
        is_active=bool(row.get("is_active", True)),
    )


@router.get("", response_model=MerchantAccountListResponse)
def list_merchant_accounts(merchant: MerchantAuth) -> MerchantAccountListResponse:
    client = require_supabase()
    result = (
        client.table("merchant_payment_accounts")
        .select("*")
        .eq("merchant_id", merchant.merchant_id)
        .order("created_at", desc=True)
        .execute()
    )
    return MerchantAccountListResponse(items=[_to_account(row) for row in (result.data or [])])


@router.get("/{account_id}", response_model=MerchantAccountResponse)
def get_merchant_account(account_id: str, merchant: MerchantAuth) -> MerchantAccountResponse:
    client = require_supabase()
    result = (
        client.table("merchant_payment_accounts")
        .select("*")
        .eq("merchant_id", merchant.merchant_id)
        .eq("id", account_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Merchant account not found"
        )
    return _to_account(rows[0])


@router.post("", response_model=MerchantAccountResponse, status_code=status.HTTP_201_CREATED)
def create_merchant_account(
    body: MerchantAccountCreateRequest, merchant: MerchantAuth
) -> MerchantAccountResponse:
    client = require_supabase()
    result = (
        client.table("merchant_payment_accounts")
        .insert(
            {
                "merchant_id": merchant.merchant_id,
                "provider": body.provider.value,
                "account_label": body.account_label,
                "account_identifier": body.account_identifier,
            }
        )
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create merchant account",
        )
    return _to_account(rows[0])
