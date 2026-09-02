"""JWT merchant context — verify Supabase Auth, then resolve merchant_users."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.core.supabase import require_supabase


@dataclass(frozen=True)
class MerchantContext:
    merchant_id: str
    merchant_name: str
    merchant_slug: str
    auth_user_id: str
    email: str | None
    role: str


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token.strip()


def get_current_merchant(
    authorization: Annotated[str | None, Header()] = None,
) -> MerchantContext:
    token = _bearer_token(authorization)
    client = require_supabase()
    try:
        user_response = client.auth.get_user(token)
    except Exception as exc:  # noqa: BLE001 — GoTrue raises several types for bad JWTs
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = getattr(user_response, "user", None)
    user_id = getattr(user, "id", None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = (
        client.table("merchant_users")
        .select("role, email, merchants(id, name, slug)")
        .eq("auth_user_id", str(user_id))
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No merchant membership for this account",
        )

    row = rows[0]
    merchant = row.get("merchants") or {}
    merchant_id = merchant.get("id")
    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No merchant membership for this account",
        )

    return MerchantContext(
        merchant_id=str(merchant_id),
        merchant_name=str(merchant.get("name") or ""),
        merchant_slug=str(merchant.get("slug") or ""),
        auth_user_id=str(user_id),
        email=row.get("email") or getattr(user, "email", None),
        role=str(row.get("role") or "member"),
    )


MerchantAuth = Annotated[MerchantContext, Depends(get_current_merchant)]
