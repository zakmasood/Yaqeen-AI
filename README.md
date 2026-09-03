# Yaqeen AI

WhatsApp-first **payment-proof risk assessment** for Pakistani merchants.

Yaqeen AI screens screenshots from Easypaisa, JazzCash, Raast, and banking apps. It extracts payment details and surfaces mismatches, duplicate submissions, reused transaction IDs, image inconsistencies, and known risk patterns.

**Important:** The system never claims that a screenshot proves funds were received.

> Payment proof passed screening, but receipt of funds is not independently confirmed.

Operational outcomes:

| Status                   | Meaning                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `READY_FOR_CONFIRMATION` | Screening passed; merchant should still confirm funds in their own ledger |
| `MANUAL_REVIEW`          | Ambiguous — human inspection required                                     |
| `SUSPICIOUS`             | Strong risk indicators — do not treat as confirmed payment                |

Formerly known as Tasdeeq AI.

## Stack

| Layer                 | Technology                                     |
| --------------------- | ---------------------------------------------- |
| Frontend              | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend               | FastAPI, Python                                |
| Data / auth / storage | Supabase                                       |
| JS packages           | pnpm workspaces                                |
| Python packages       | `pyproject.toml`                               |
| Tests                 | Vitest (TS), Pytest (Python)                   |
| Lint / format         | ESLint, Prettier, Ruff                         |
| CI                    | GitLab CI                                      |

## Repository layout

```text
yaqeen-ai/
├── apps/
│   ├── web/          # Next.js merchant UI
│   └── api/          # FastAPI screening API
├── packages/
│   └── shared/       # Shared domain types
├── supabase/         # Migrations + seed
├── docs/             # Product & engineering docs
├── docker-compose.yml
├── .gitlab-ci.yml
└── .env.example
```

## Quick start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Python 3.11+
- (Optional) Docker, Supabase CLI

### 1. Clone and env

```bash
cp .env.example .env
# Fill placeholders — never commit real secrets
```

### 2. Install JS dependencies

```bash
pnpm install
```

### 3. Frontend

```bash
pnpm dev:web
# http://localhost:3008
# Sign in at /login after linking a Supabase user — see docs/DEVELOPMENT.md
```

### 4. Backend

```bash
cd apps/api
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
# http://localhost:8000/health
```

Or from the repo root: `pnpm dev:api` (expects the venv’s Python on your PATH / activated).

### 5. Docker (optional)

```bash
docker compose up api
```

## Common commands

| Command          | Description            |
| ---------------- | ---------------------- |
| `pnpm lint`      | ESLint (shared + web)  |
| `pnpm typecheck` | TypeScript checks      |
| `pnpm test`      | Vitest (shared + web)  |
| `pnpm build`     | Build shared + Next.js |
| `pnpm format`    | Prettier               |
| `pnpm lint:api`  | Ruff on the API        |
| `pnpm test:api`  | Pytest                 |

## Documentation

- [Product spec](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Security](docs/SECURITY.md)

## License

Proprietary — Manoversa / Yaqeen AI team.
