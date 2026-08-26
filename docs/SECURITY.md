# Security — Yaqeen AI

## Screenshot sensitivity

Payment screenshots often contain:

- Account numbers / IBAN fragments
- Names and phone numbers
- Transaction IDs and balances

Treat them as **sensitive personal and financial data**.

## Private storage

- Store objects in a **private** Supabase Storage bucket (`SUPABASE_STORAGE_BUCKET`).
- Serve via short-lived **signed URLs** from the API only.
- Never make screenshot buckets publicly listable or anonymously readable.

## Credential handling

| Secret                               | Allowed where               |
| ------------------------------------ | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Browser                     |
| `SUPABASE_SERVICE_ROLE_KEY`          | API / trusted jobs **only** |
| `AI_VISION_API_KEY`                  | API only                    |
| `WHATSAPP_APP_SECRET` / access token | API only                    |

- Never commit `.env` or real keys.
- Frontend must not import service-role credentials.

## Logging restrictions

- Structured logs are fine for request metadata and analysis IDs.
- Do **not** log raw screenshot bytes, full OCR dumps with PII, or secrets.
- Prefer hashed identifiers when correlating media.

## Row-level security

- Migrations document future RLS direction.
- Enable and test RLS before exposing merchant data to authenticated clients.
- Until RLS is live, prefer API-mediated access with service role on the server.

## Data retention

- Define retention for screenshots and extracted text (e.g. delete after N days or after order closure).
- Support merchant-driven deletion / export where legally required.
- Document retention choices before production launch — scaffold does not enforce them yet.

## Webhooks

- Validate WhatsApp webhook signatures before trusting payloads.
- Keep verify tokens out of client code and public repos.
