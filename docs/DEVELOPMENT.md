# Development — Yaqeen AI

## Branching

- `main` — stable / protected
- Feature / chore branches: `feat/...`, `fix/...`, `chore/...`
- Prefer small MRs; conventional commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`)
- Reference GitLab issues with `#<number>` when applicable

## Setup

1. Copy `.env.example` → `.env` (and optionally `apps/web/.env.local` for Next public vars).
2. `pnpm install` at repo root.
3. Create API venv and install: `pip install -e ".[dev]"` inside `apps/api`.
4. Apply Supabase migrations when a project is ready (`supabase db push` or SQL editor).

## Running locally

```bash
# Terminal A — web
pnpm dev:web

# Terminal B — api (venv activated)
cd apps/api
uvicorn app.main:app --reload --port 8000
```

## Testing

```bash
pnpm test              # shared + web (Vitest)
pnpm test:api          # pytest

pnpm lint
pnpm typecheck
pnpm build
pnpm lint:api          # ruff check
```

## Contribution workflow

1. Branch from latest `main`.
2. Implement with the smallest change that works; reuse existing patterns.
3. Keep product language honest: operational statuses only; include the screening disclaimer where `READY_FOR_CONFIRMATION` is shown.
4. Add or update tests for domain validation and API health as needed.
5. Open an MR; ensure GitLab CI stages pass: install → lint → type-check → test → build.

## Product language checklist

- Do **not** say a screenshot “proves” or “verifies” payment.
- Do **not** invent authenticity percentages.
- Prefer: ready for merchant confirmation / manual review / suspicious.
