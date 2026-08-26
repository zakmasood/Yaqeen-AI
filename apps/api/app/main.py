"""Yaqeen AI FastAPI application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    settings = get_settings()
    logger.info("Starting Yaqeen AI API", extra={"app_env": settings.app_env})
    yield
    logger.info("Shutting down Yaqeen AI API")


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="Yaqeen AI API",
        description=(
            "Payment-proof screening for Pakistani merchants. "
            "Operational statuses only — never claims funds were received."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api_router)
    return application


app = create_app()
