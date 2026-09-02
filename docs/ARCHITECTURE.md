# Architecture — Yaqeen AI

## High-level

```text
WhatsApp Cloud API ──► FastAPI (apps/api) ──► Supabase (DB + private storage)
                              ▲
Next.js (apps/web) ───────────┘
        │
        └── Supabase anon client (auth cookies only)
```

Merchant dashboard sends `Authorization: Bearer <access_token>`. The API verifies the JWT with the service-role client, then scopes rows by `merchant_users.auth_user_id`. Public `/submit` is unauthenticated and scoped by `merchant_slug`.

## Frontend (`apps/web`)

- Next.js App Router + Tailwind
- Auth: `/login` (email/password). Middleware protects dashboard routes.
- Public: `/submit?merchant=<slug>`
- Dashboard: `/`, `/upload`, `/analyses`, `/analyses/[id]`, `/settings`
- Browser Supabase client: **URL + anon key only**
- Calls FastAPI via `NEXT_PUBLIC_API_URL` with the session access token

## Backend (`apps/api`)

- FastAPI with CORS from `CORS_ORIGINS`
- Structured JSON logging (no screenshot payloads in logs)
- Routers:
  - `GET /health`
  - `GET /api/v1/me`
  - `/api/v1/analyses` (JWT)
  - `/api/v1/orders` (JWT)
  - `/api/v1/merchant-accounts` (JWT)
  - `POST /api/v1/public/submissions` (slug-scoped)
  - `/api/v1/webhooks/whatsapp`
- Service boundaries:
  - OCR / vision / duplicate detection — passthrough stubs (empty results, no invented detections)
  - Risk scoring — maps discrete signals to operational status only
  - Storage — private bucket, short-lived signed URLs
  - WhatsApp ingestion — match merchant by `whatsapp_business_number`, then same pipeline

## Analysis pipeline

Runs **in-request** (upgrade to a job queue when real OCR/vision are wired):

1. Ingest (WhatsApp media or upload) → private storage
2. OCR + vision stubs → empty extraction unless a real provider is added
3. Duplicate / reused transaction-id stub
4. If extraction is empty, emit `SCREENING_UNAVAILABLE` (MEDIUM) → `MANUAL_REVIEW`
5. Persist analysis, signals, extraction; merchant UI reads via API

Stubs must not emit `READY_FOR_CONFIRMATION`. That status is reserved for a future provider that actually extracts fields and finds no blocking signals.

## Supabase

- Tables: merchants, merchant_users, merchant_payment_accounts, orders, analyses, screenshots, extracted_transactions, risk_signals
- Extra Phase 2 columns: `merchants.slug`, `analyses.order_reference`, `reviewed_at`, `submitter_name`, `submitter_phone`, `screenshots.original_filename`
- Private bucket `payment-screenshots`
- **Service role** used only by the API / trusted jobs
- RLS enabled with merchant isolation via `merchant_users.auth_user_id = auth.uid()` (service role bypasses for writes)

## WhatsApp boundary

- Meta verifies webhook via GET challenge (`WHATSAPP_VERIFY_TOKEN`)
- POST: parse image `media_id`; if a merchant matches the display number, enqueue the pipeline
- Download media only when `WHATSAPP_ACCESS_TOKEN` is set; otherwise persist `SCREENING_UNAVAILABLE`
- No matching merchant → accept and log; do not invent a tenant
- Signature validation still belongs in the ingestion service

## Shared package (`packages/shared`)

TypeScript source of truth for statuses, providers, and result shapes. Python enums/schemas mirror the same string values.
