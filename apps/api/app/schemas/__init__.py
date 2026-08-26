"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import (
    PAYMENT_SCREENING_DISCLAIMER,
    AnalysisStatus,
    PaymentProvider,
    RiskSeverity,
)


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "yaqeen-api"


class ExtractedTransaction(BaseModel):
    provider: PaymentProvider = PaymentProvider.UNKNOWN
    amount: float | None = None
    currency: str = "PKR"
    transaction_id: str | None = None
    occurred_at: datetime | None = None
    payer_hint: str | None = None
    payee_hint: str | None = None
    raw_text_snippet: str | None = None


class RiskSignal(BaseModel):
    code: str
    severity: RiskSeverity
    message: str


class AnalysisResult(BaseModel):
    id: str
    order_id: str | None = None
    status: AnalysisStatus
    provider: PaymentProvider
    extracted: ExtractedTransaction | None = None
    signals: list[RiskSignal] = Field(default_factory=list)
    disclaimer: str = PAYMENT_SCREENING_DISCLAIMER
    created_at: datetime
    updated_at: datetime


class AnalysisCreateRequest(BaseModel):
    order_id: str | None = None
    merchant_id: str | None = None
    # Screenshot upload handled via multipart on a future endpoint — not fake AI here.
    notes: str | None = None


class AnalysisListResponse(BaseModel):
    items: list[AnalysisResult] = Field(default_factory=list)
    total: int = 0


class PaymentExpectation(BaseModel):
    order_id: str
    order_reference: str
    expected_amount: float
    currency: str = "PKR"
    expected_provider: PaymentProvider | None = None
    expected_account_id: str | None = None


class OrderCreateRequest(BaseModel):
    merchant_id: str
    order_reference: str
    expected_amount: float
    currency: str = "PKR"
    expected_provider: PaymentProvider | None = None
    expected_account_id: str | None = None


class OrderResponse(BaseModel):
    id: str
    merchant_id: str
    order_reference: str
    expected_amount: float
    currency: str = "PKR"
    expected_provider: PaymentProvider | None = None
    expected_account_id: str | None = None
    created_at: datetime


class MerchantAccountResponse(BaseModel):
    id: str
    merchant_id: str
    provider: PaymentProvider
    account_label: str
    account_identifier: str
    is_active: bool = True


class MerchantAccountCreateRequest(BaseModel):
    merchant_id: str
    provider: PaymentProvider
    account_label: str
    account_identifier: str


class WhatsAppWebhookChallenge(BaseModel):
    """Meta webhook verification query params (GET)."""

    hub_mode: str | None = Field(default=None, alias="hub.mode")
    hub_verify_token: str | None = Field(default=None, alias="hub.verify_token")
    hub_challenge: str | None = Field(default=None, alias="hub.challenge")

    model_config = {"populate_by_name": True}


class WhatsAppWebhookPayload(BaseModel):
    """Opaque inbound webhook body — ingestion service will parse later."""

    object: str | None = None
    entry: list[dict] = Field(default_factory=list)
