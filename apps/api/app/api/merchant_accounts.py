"""Merchant payment accounts placeholder router."""

from fastapi import APIRouter, HTTPException, status

from app.schemas import MerchantAccountCreateRequest, MerchantAccountResponse

router = APIRouter(prefix="/merchant-accounts", tags=["merchant-accounts"])


@router.get("")
def list_merchant_accounts() -> dict[str, list]:
    return {"items": []}


@router.get("/{account_id}", response_model=MerchantAccountResponse)
def get_merchant_account(account_id: str) -> MerchantAccountResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Merchant account lookup not implemented yet ({account_id})",
    )


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def create_merchant_account(_body: MerchantAccountCreateRequest) -> dict[str, str]:
    return {"detail": "Merchant account creation not implemented — scaffold only"}
