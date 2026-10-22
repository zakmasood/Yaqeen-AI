"""Yaqeen AI FastAPI application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.services.rate_limit import allow_public_submission, is_public_submission

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

    @application.middleware("http")
    async def json_errors(request: Request, call_next):
        """Catch failures inside CORS. The type name is logged, not the exception text."""
        try:
            return await call_next(request)
        except Exception as exc:
            logger.error("Request failed (%s)", type(exc).__name__)
            return JSONResponse(
                status_code=500,
                content={"detail": "Yaqeen could not complete that request."},
            )

    @application.middleware("http")
    async def limit_public_submissions(request: Request, call_next):
        if is_public_submission(request.method, request.url.path):
            host = request.client.host if request.client else "unknown"
            if not allow_public_submission(host):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many submissions. Try again shortly."},
                )
        return await call_next(request)

    # Added after the limiter so browser clients still receive CORS headers on 429.
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
