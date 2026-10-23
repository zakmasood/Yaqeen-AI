"""Local email login. Used when DATABASE_URL is set."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.local_auth import issue_token, verify_password
from app.core.supabase import require_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    settings = get_settings()
    if not settings.database_url or not settings.local_auth_secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    found = (
        require_supabase()
        .table("local_users")
        .select("id, password_hash")
        .eq("email", body.email.lower())
        .limit(1)
        .execute()
    )
    rows = found.data or []
    if not rows or not verify_password(body.password, str(rows[0].get("password_hash") or "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is wrong",
        )
    return LoginResponse(access_token=issue_token(str(rows[0]["id"]), settings.local_auth_secret))
