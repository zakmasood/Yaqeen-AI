"""Orders CRUD for the authenticated merchant."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.auth import MerchantAuth
from app.core.supabase import require_supabase
from app.schemas import OrderCreateRequest, OrderListResponse, OrderResponse
from app.services.analyses import parse_dt

router = APIRouter(prefix="/orders", tags=["orders"])


def _to_order(row: dict) -> OrderResponse:
    return OrderResponse(
        id=str(row["id"]),
        merchant_id=str(row["merchant_id"]),
        order_reference=str(row["order_reference"]),
        expected_amount=float(row["expected_amount"]),
        currency=str(row.get("currency") or "PKR"),
        expected_provider=row.get("expected_provider"),
        expected_account_id=str(row["expected_account_id"])
        if row.get("expected_account_id")
        else None,
        created_at=parse_dt(row["created_at"]),
    )


@router.get("", response_model=OrderListResponse)
def list_orders(merchant: MerchantAuth) -> OrderListResponse:
    client = require_supabase()
    result = (
        client.table("orders")
        .select("*")
        .eq("merchant_id", merchant.merchant_id)
        .order("created_at", desc=True)
        .execute()
    )
    return OrderListResponse(items=[_to_order(row) for row in (result.data or [])])


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str, merchant: MerchantAuth) -> OrderResponse:
    client = require_supabase()
    result = (
        client.table("orders")
        .select("*")
        .eq("merchant_id", merchant.merchant_id)
        .eq("id", order_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _to_order(rows[0])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(body: OrderCreateRequest, merchant: MerchantAuth) -> OrderResponse:
    client = require_supabase()
    result = (
        client.table("orders")
        .insert(
            {
                "merchant_id": merchant.merchant_id,
                "order_reference": body.order_reference,
                "expected_amount": body.expected_amount,
                "currency": body.currency,
                "expected_provider": body.expected_provider.value
                if body.expected_provider
                else None,
                "expected_account_id": body.expected_account_id,
            }
        )
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order",
        )
    return _to_order(rows[0])
