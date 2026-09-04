# Development — Yaqeen AI

## Branching

- `main` — stable / protected
- Feature / chore branches: `feat/...`, `fix/...`, `chore/...`
- Prefer small MRs; conventional commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`)
- Reference GitLab issues with `#<number>` when applicable

## Setup

1. Copy `.env.example` → `.env` (and `apps/web/.env.local` for Next public vars).
2. `pnpm install` at repo root.
3. Create API venv and install: `pip install -e ".[dev]"` inside `apps/api`.
4. Apply Supabase migrations (`supabase db push` or SQL editor), including Phase 2 (`20260902000000_phase2_auth_pipeline.sql`) and Phase 4 (`20260903000000_phase4_image_hash.sql`).
5. Run `supabase/seed.sql` for the demo merchant (`slug = manoversa`, order `MV-1048`).

### Auth user (required for the dashboard)

Auth users cannot be inserted from `seed.sql`. In the Supabase dashboard:

1. Authentication → Users → add a user (email/password).
2. Copy the user UUID.
3. Link it to the demo merchant:

```sql
insert into public.merchant_users (merchant_id, auth_user_id, email, role)
values (
  '00000000-0000-0000-0000-000000000001',
  '<auth-user-uuid>',
  'you@example.com',
  'owner'
);
```

Without this row, login succeeds at Supabase but API calls return 403.

Without `AI_VISION_API_KEY`, extraction is empty and screening stays on `MANUAL_REVIEW` (`SCREENING_UNAVAILABLE`), unless the same screenshot file or a near-duplicate image was already submitted for that merchant (`EXACT_IMAGE_REUSED` / `NEAR_DUPLICATE_IMAGE` → `SUSPICIOUS`). Set `AI_VISION_API_KEY` (and optionally `AI_VISION_MODEL`, default `gpt-4o-mini`) for structured extraction and matching.

Local web is pinned to port 3008 (`next dev -p 3008`) so it does not collide with Postgres on 3000. Keep `http://localhost:3008` in `CORS_ORIGINS`.

## Running locally

```bash
# Terminal A — web (http://localhost:3008)
pnpm dev:web

# Terminal B — api (venv activated)
cd apps/api
uvicorn app.main:app --reload --port 8000
```

Sign in at http://localhost:3008/login. Customer submit: http://localhost:3008/submit?merchant=manoversa.

Without Supabase env vars, the UI shows a setup message on `/login` and does not fall back to fake analyses.

## Testing

```bash
pnpm test              # shared + web (Vitest)
pnpm test:api          # pytest (mocked / no live Supabase)

pnpm lint
pnpm typecheck
pnpm build
pnpm lint:api          # ruff check
```

## Contribution workflow

1. Branch from latest `main`.
2. Implement with the smallest change that works; reuse existing patterns.
3. Keep product language honest: operational statuses only; include the screening disclaimer where `READY_FOR_CONFIRMATION` is shown.
4. Add or update tests for domain validation, auth gates, and screening outcome mapping.
5. Open an MR; ensure GitLab CI stages pass: install → lint → type-check → test → build.

## Product language checklist

- Do **not** say a screenshot “proves” or “verifies” payment.
- Do **not** invent authenticity percentages or `/100` risk scores.
- Prefer: ready for merchant confirmation / manual review / suspicious.
