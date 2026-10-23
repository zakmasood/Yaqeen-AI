"""Email and password sessions for the local Postgres stack. Not used with Supabase."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from fastapi import HTTPException, status

PBKDF2_ROUNDS = 120_000


def hash_password(password: str, salt: str = "yaqeen-local-demo") -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ROUNDS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, _, _digest = stored.partition("$")
    if not salt or not _digest:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored)


def issue_token(user_id: str, secret: str, ttl_seconds: int = 60 * 60 * 24 * 7) -> str:
    payload = {"sub": user_id, "exp": int(time.time()) + ttl_seconds}
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def read_token(token: str, secret: str) -> str:
    body, _, sig = token.partition(".")
    if not body or not sig:
        raise _unauthorized()
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise _unauthorized()
    padded = body + "=" * (-len(body) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(padded))
        exp = int(payload["exp"])
        user_id = str(payload["sub"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise _unauthorized() from None
    if exp < int(time.time()) or not user_id:
        raise _unauthorized()
    return user_id


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session",
        headers={"WWW-Authenticate": "Bearer"},
    )
