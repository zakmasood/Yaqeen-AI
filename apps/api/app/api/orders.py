"""Orders placeholder router."""

from fastapi import APIRouter, HTTPException, status

from app.schemas import OrderCreateRequest, OrderResponse

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("")
def list_orders() -> dict[str, list]:
    return {"items": []}


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str) -> OrderResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Order lookup not implemented yet ({order_id})",
    )


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def create_order(_body: OrderCreateRequest) -> dict[str, str]:
    return {"detail": "Order creation not implemented — scaffold only"}
