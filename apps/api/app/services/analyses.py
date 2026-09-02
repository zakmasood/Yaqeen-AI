"""Persist and assemble analysis rows. Service-role access only."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import require_supabase
from app.models.enums import PAYMENT_SCREENING_DISCLAIMER, AnalysisStatus, PaymentProvider
from app.schemas import AnalysisResult, ExtractedTransaction, RiskSignal
from app.services.storage import StorageService


def parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    text = str(value).replace("Z", "+00:00")
    return datetime.fromisoformat(text)


def _as_provider(value: Any) -> PaymentProvider:
    try:
        return PaymentProvider(str(value))
    except ValueError:
        return PaymentProvider.UNKNOWN


def _as_status(value: Any) -> AnalysisStatus:
    try:
        return AnalysisStatus(str(value))
    except ValueError:
        return AnalysisStatus.MANUAL_REVIEW


def _first(value: Any) -> dict | None:
    if isinstance(value, list):
        return value[0] if value else None
    if isinstance(value, dict):
        return value
    return None


def _extracted_from_row(row: dict | None) -> ExtractedTransaction | None:
    if not row:
        return None
    occurred = row.get("occurred_at")
    return ExtractedTransaction(
        provider=_as_provider(row.get("provider")),
        amount=float(row["amount"]) if row.get("amount") is not None else None,
        currency=str(row.get("currency") or "PKR"),
        transaction_id=row.get("transaction_id"),
        occurred_at=parse_dt(occurred) if occurred else None,
        payer_hint=row.get("payer_hint"),
        payee_hint=row.get("payee_hint"),
        raw_text_snippet=row.get("raw_text_snippet"),
    )


def _signals_from_rows(rows: Any) -> list[RiskSignal]:
    if not isinstance(rows, list):
        return []
    signals: list[RiskSignal] = []
    for row in rows:
        try:
            signals.append(
                RiskSignal(
                    code=str(row.get("code") or ""),
                    severity=row.get("severity") or "INFO",
                    message=str(row.get("message") or ""),
                )
            )
        except (ValueError, TypeError):
            continue
    return signals


def assemble_analysis(row: dict, *, signed_url: str | None = None) -> AnalysisResult:
    order = _first(row.get("orders"))
    screenshot = _first(row.get("screenshots"))
    extracted_row = _first(row.get("extracted_transactions"))
    order_reference = row.get("order_reference") or (order or {}).get("order_reference")
    expected_amount = (order or {}).get("expected_amount")
    file_name = None
    if screenshot:
        file_name = screenshot.get("original_filename") or screenshot.get("storage_path")
        if file_name and "/" in str(file_name):
            file_name = str(file_name).rsplit("/", 1)[-1]
    return AnalysisResult(
        id=str(row["id"]),
        order_id=str(row["order_id"]) if row.get("order_id") else None,
        order_reference=str(order_reference) if order_reference else None,
        status=_as_status(row.get("status")),
        provider=_as_provider(row.get("provider")),
        extracted=_extracted_from_row(extracted_row),
        signals=_signals_from_rows(row.get("risk_signals")),
        disclaimer=str(row.get("disclaimer") or PAYMENT_SCREENING_DISCLAIMER),
        created_at=parse_dt(row["created_at"]),
        updated_at=parse_dt(row["updated_at"]),
        source=str(row.get("source") or "upload"),
        expected_amount=float(expected_amount) if expected_amount is not None else None,
        screenshot_url=signed_url,
        file_name=str(file_name) if file_name else None,
        reviewed_at=parse_dt(row["reviewed_at"]) if row.get("reviewed_at") else None,
        submitter_name=row.get("submitter_name"),
        submitter_phone=row.get("submitter_phone"),
    )


_SELECT = (
    "*, orders(order_reference, expected_amount), "
    "extracted_transactions(*), risk_signals(*), screenshots(*)"
)


def _sign_row(row: dict) -> AnalysisResult:
    screenshot = _first(row.get("screenshots"))
    path = (screenshot or {}).get("storage_path")
    url = StorageService().create_signed_url(path) if path else None
    return assemble_analysis(row, signed_url=url)


def list_analyses(merchant_id: str) -> list[AnalysisResult]:
    client = require_supabase()
    result = (
        client.table("analyses")
        .select(_SELECT)
        .eq("merchant_id", merchant_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_sign_row(row) for row in (result.data or [])]


def get_analysis(merchant_id: str, analysis_id: str) -> AnalysisResult:
    client = require_supabase()
    result = (
        client.table("analyses")
        .select(_SELECT)
        .eq("merchant_id", merchant_id)
        .eq("id", analysis_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    return _sign_row(rows[0])


def get_analysis_by_id(analysis_id: str) -> AnalysisResult:
    client = require_supabase()
    result = client.table("analyses").select(_SELECT).eq("id", analysis_id).limit(1).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    return _sign_row(rows[0])


def mark_reviewed(merchant_id: str, analysis_id: str) -> AnalysisResult:
    client = require_supabase()
    existing = (
        client.table("analyses")
        .select("id")
        .eq("merchant_id", merchant_id)
        .eq("id", analysis_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    client.table("analyses").update({"reviewed_at": datetime.now(UTC).isoformat()}).eq(
        "id", analysis_id
    ).execute()
    return get_analysis(merchant_id, analysis_id)


def get_merchant_by_slug(slug: str) -> dict:
    client = require_supabase()
    result = client.table("merchants").select("id, name, slug").eq("slug", slug).limit(1).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown merchant")
    return rows[0]


def find_merchant_by_whatsapp(phone: str | None) -> dict | None:
    if not phone:
        return None
    client = require_supabase()
    result = (
        client.table("merchants")
        .select("id, name, slug, whatsapp_business_number")
        .eq("whatsapp_business_number", phone)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    return rows[0] if rows else None


def find_or_create_order(
    merchant_id: str,
    order_reference: str | None,
    expected_amount: float | None,
    expected_provider: str | None,
    expected_account_id: str | None,
) -> tuple[str | None, str | None, float | None]:
    if not order_reference:
        return None, None, expected_amount
    client = require_supabase()
    found = (
        client.table("orders")
        .select("id, order_reference, expected_amount, expected_provider, expected_account_id")
        .eq("merchant_id", merchant_id)
        .eq("order_reference", order_reference)
        .limit(1)
        .execute()
    )
    if found.data:
        row = found.data[0]
        amount = row.get("expected_amount")
        return (
            str(row["id"]),
            str(row["order_reference"]),
            float(amount) if amount is not None else expected_amount,
        )
    if expected_amount is None:
        return None, order_reference, None
    created = (
        client.table("orders")
        .insert(
            {
                "merchant_id": merchant_id,
                "order_reference": order_reference,
                "expected_amount": expected_amount,
                "currency": "PKR",
                "expected_provider": expected_provider,
                "expected_account_id": expected_account_id,
            }
        )
        .execute()
    )
    row = (created.data or [None])[0]
    if not row:
        return None, order_reference, expected_amount
    return str(row["id"]), str(row["order_reference"]), expected_amount


def _account_identifier(
    account_id: str | None,
    merchant_id: str,
    provider: str | None,
) -> str | None:
    if not account_id and not provider:
        return None
    client = require_supabase()
    if account_id:
        found = (
            client.table("merchant_payment_accounts")
            .select("account_identifier")
            .eq("id", account_id)
            .eq("merchant_id", merchant_id)
            .limit(1)
            .execute()
        )
        if found.data:
            return str(found.data[0].get("account_identifier") or "") or None
    if provider:
        found = (
            client.table("merchant_payment_accounts")
            .select("account_identifier")
            .eq("merchant_id", merchant_id)
            .eq("provider", provider)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        if found.data:
            return str(found.data[0].get("account_identifier") or "") or None
    return None


def get_screening_expectation(
    merchant_id: str,
    order_id: str | None,
    fallback_amount: float | None,
    fallback_provider: PaymentProvider | None,
    fallback_account_id: str | None = None,
) -> tuple[float | None, PaymentProvider | None, str | None]:
    """Resolve expected amount, provider, and payee identifier for matching."""
    amount = fallback_amount
    provider = fallback_provider
    account_id = fallback_account_id
    if order_id:
        client = require_supabase()
        found = (
            client.table("orders")
            .select("expected_amount, expected_provider, expected_account_id")
            .eq("id", order_id)
            .eq("merchant_id", merchant_id)
            .limit(1)
            .execute()
        )
        if found.data:
            row = found.data[0]
            if row.get("expected_amount") is not None:
                amount = float(row["expected_amount"])
            if row.get("expected_provider"):
                provider = _as_provider(row.get("expected_provider"))
            if row.get("expected_account_id"):
                account_id = str(row["expected_account_id"])
    payee = _account_identifier(
        account_id,
        merchant_id,
        provider.value if provider else None,
    )
    return amount, provider, payee
