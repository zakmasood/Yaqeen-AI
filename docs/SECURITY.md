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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Browser (auth cookies)      |
| `SUPABASE_SERVICE_ROLE_KEY`          | API / trusted jobs **only** |
| `AI_VISION_API_KEY`                  | API only                    |
| `WHATSAPP_APP_SECRET` / access token | API only                    |

- Never commit `.env` or real keys.
- Frontend must not import service-role credentials.
- Dashboard API calls use the user JWT; the API verifies it then queries with the service role.

## Logging restrictions

- Structured logs are fine for request metadata and analysis IDs.
- Do **not** log raw screenshot bytes, full OCR dumps with PII, or secrets.
- Prefer hashed identifiers when correlating media.

## Row-level security

- RLS is enabled on merchant-scoped tables. Authenticated clients may **select** only rows for `merchant_users.auth_user_id = auth.uid()`.
- Inserts/updates go through the API with the service role (bypasses RLS).
- Public customer submit is slug-scoped (`POST /api/v1/public/submissions`); it must not accept an arbitrary `merchant_id`.

## Data retention

- Define retention for screenshots and extracted text (e.g. delete after N days or after order closure).
- Support merchant-driven deletion / export where legally required.
- Document retention choices before production launch — scaffold does not enforce them yet.

## Webhooks

- Validate WhatsApp webhook signatures before trusting payloads (not yet enforced).
- Keep verify tokens out of client code and public repos.
- Ignore inbound media when no merchant matches the WhatsApp business number — do not invent a tenant.
