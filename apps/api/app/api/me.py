"""Current merchant from the Supabase JWT."""

from fastapi import APIRouter

from app.core.auth import MerchantAuth
from app.schemas import MeResponse

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=MeResponse)
def me(merchant: MerchantAuth) -> MeResponse:
    return MeResponse(
        merchant_id=merchant.merchant_id,
        name=merchant.merchant_name,
        slug=merchant.merchant_slug,
        email=merchant.email,
        role=merchant.role,
    )
