"""Per-ask proof invites. Token is the only public identifier."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import require_supabase
from app.schemas import InviteCreateResponse, PublicInviteResponse
from app.services.analyses import find_or_create_order, parse_dt

INVITE_TTL = timedelta(days=7)


def _rel(value: Any) -> dict:
    if isinstance(value, list):
        return value[0] if value else {}
    return value if isinstance(value, dict) else {}


def invite_path(token: str) -> str:
    return f"/s/{token}"


def _expired(expires_at: Any) -> bool:
    return parse_dt(expires_at) <= datetime.now(UTC)


def create_invite(
    *,
    merchant_id: str,
    merchant_name: str,
    order_reference: str,
    expected_amount: float,
    invited_phone: str | None,
) -> InviteCreateResponse:
    reference = order_reference.strip()
    if not reference:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Order reference is required",
        )
    if expected_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Expected amount must be greater than zero",
        )
    phone = invited_phone.strip() if invited_phone and invited_phone.strip() else None
    order_id, stored_ref, amount = find_or_create_order(
        merchant_id,
        reference,
        expected_amount,
        None,
        None,
    )
    if not order_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not create order for this invite",
        )
    expires_at = datetime.now(UTC) + INVITE_TTL
    token = secrets.token_urlsafe(18)
    client = require_supabase()
    result = (
        client.table("proof_invites")
        .insert(
            {
                "token": token,
                "merchant_id": merchant_id,
                "order_id": order_id,
                "invited_phone": phone,
                "expires_at": expires_at.isoformat(),
            }
        )
        .execute()
    )
    row = (result.data or [None])[0]
    if not row:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invite",
        )
    return InviteCreateResponse(
        token=token,
        path=invite_path(token),
        order_reference=stored_ref or reference,
        expected_amount=float(amount if amount is not None else expected_amount),
        invited_phone=phone,
        expires_at=expires_at,
        merchant_name=merchant_name,
    )


def get_invite_by_token(token: str) -> dict:
    cleaned = token.strip()
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    client = require_supabase()
    result = (
        client.table("proof_invites")
        .select("*, orders(order_reference, expected_amount), merchants(name, slug)")
        .eq("token", cleaned)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    row = rows[0]
    if _expired(row.get("expires_at")):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This invite has expired. Ask the merchant for a new link.",
        )
    row["orders"] = _rel(row.get("orders"))
    row["merchants"] = _rel(row.get("merchants"))
    return row


def public_invite(token: str) -> PublicInviteResponse:
    row = get_invite_by_token(token)
    order = _rel(row.get("orders"))
    merchant = _rel(row.get("merchants"))
    amount = order.get("expected_amount")
    return PublicInviteResponse(
        merchant_name=str(merchant.get("name") or "Merchant"),
        merchant_slug=str(merchant.get("slug") or ""),
        order_reference=str(order.get("order_reference") or ""),
        expected_amount=float(amount) if amount is not None else 0,
        invited_phone=row.get("invited_phone"),
        expires_at=parse_dt(row["expires_at"]),
    )


def mark_invite_used(invite_id: str) -> None:
    client = require_supabase()
    client.table("proof_invites").update({"used_at": datetime.now(UTC).isoformat()}).eq(
        "id", invite_id
    ).execute()
