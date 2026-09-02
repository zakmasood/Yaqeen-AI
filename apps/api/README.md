# Yaqeen AI API

Local development:

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Health: `GET /health`

Protected routes need `Authorization: Bearer <supabase-access-token>`. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Public customer uploads: `POST /api/v1/public/submissions`.
