"""API routers."""

from fastapi import APIRouter

from app.api import analyses, health, merchant_accounts, orders, whatsapp

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(analyses.router, prefix="/api/v1")
api_router.include_router(orders.router, prefix="/api/v1")
api_router.include_router(merchant_accounts.router, prefix="/api/v1")
api_router.include_router(whatsapp.router, prefix="/api/v1")
