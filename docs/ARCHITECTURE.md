# Architecture — Yaqeen AI

## High-level

```text
WhatsApp Cloud API ──► FastAPI (apps/api) ──► Supabase (DB + private storage)
                              ▲
Next.js (apps/web) ───────────┘
        │
        └── Supabase anon client (auth / limited reads under future RLS)
```

## Frontend (`apps/web`)

- Next.js App Router + Tailwind
- Routes: `/`, `/upload`, `/analyses`, `/analyses/[id]`, `/settings`
- Uses `@yaqeen/shared` for domain types and status badges
- Browser Supabase client: **URL + anon key only**
- Calls FastAPI via `NEXT_PUBLIC_API_URL`

## Backend (`apps/api`)

- FastAPI with CORS from `CORS_ORIGINS`
- Structured JSON logging (no screenshot payloads in logs)
- Routers:
  - `GET /health`
  - `/api/v1/analyses`
  - `/api/v1/orders`
  - `/api/v1/merchant-accounts`
  - `/api/v1/webhooks/whatsapp`
- Service boundaries (stubs in scaffold):
  - OCR
  - Vision analysis
  - Duplicate detection
  - Risk scoring → operational status only
  - Storage (private bucket, signed URLs)
  - WhatsApp ingestion

## Analysis pipeline (target)

1. Ingest (WhatsApp media or upload) → private storage
2. OCR + vision → extracted fields + image consistency signals
3. Match against order / merchant payment account expectations
4. Duplicate / reused transaction-id checks
5. Risk scoring → `READY_FOR_CONFIRMATION` | `MANUAL_REVIEW` | `SUSPICIOUS`
6. Persist analysis, signals, extraction; notify merchant UI / WhatsApp reply

Scaffold ships **boundaries only** — no fake AI.

## Supabase

- Tables: merchants, merchant_users, merchant_payment_accounts, orders, analyses, screenshots, extracted_transactions, risk_signals
- Migrations under `supabase/migrations/`
- **Service role** used only by the API / trusted jobs
- RLS policies are planned (commented guidance in migration); enable before production

## WhatsApp boundary

- Meta verifies webhook via GET challenge (`WHATSAPP_VERIFY_TOKEN`)
- POST payloads accepted and handed to `WhatsAppIngestionService` (stub)
- Signature validation and media download belong in that service — not in route handlers long-term

## Shared package (`packages/shared`)

TypeScript source of truth for statuses, providers, and result shapes. Python enums/schemas mirror the same string values.
