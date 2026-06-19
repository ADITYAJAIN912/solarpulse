# SolarPulse — Backend

AI-powered solar plant performance monitoring API built with FastAPI, SQLAlchemy, and Groq LLM.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.1 |
| Database | SQLite (local) / PostgreSQL (production) |
| ORM | SQLAlchemy 2 with typed `Mapped[]` columns |
| Auth | JWT via `python-jose`, passwords hashed with `bcrypt` |
| AI | Groq API (`llama-3.3-70b-versatile`) for root-cause analysis |
| ML | Isolation Forest (scikit-learn) for anomaly detection |
| Tests | pytest + httpx (3 tests covering auth lifecycle and ownership boundary) |

## Local Development

```bash
# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate        # Windows
source venv/bin/activate       # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env
# Edit .env and fill in JWT_SECRET and GROQ_API_KEY

# 4. Start the server
uvicorn app.main:app --reload --port 8001
```

API docs are available at `http://127.0.0.1:8001/docs`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No | SQLAlchemy URL. Defaults to `sqlite:///./solarpulse.db` |
| `JWT_SECRET` | **Yes** | Secret key for signing JWTs. Use a long random string in production |
| `JWT_ALGORITHM` | No | JWT algorithm. Defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Token lifetime. Defaults to `60` |
| `GROQ_API_KEY` | **Yes** | Groq API key for AI root-cause analysis |
| `GROQ_MODEL` | No | Groq model ID. Defaults to `llama-3.3-70b-versatile` |
| `CORS_ORIGINS` | **Yes (production)** | Comma-separated list of allowed frontend origins, e.g. `https://solarpulse.vercel.app` |

## Deployment (Railway)

1. Create a new Railway project and connect this GitHub repository.
2. Set **Root Directory** to `backend`.
3. Railway will detect the `Procfile` automatically:
   ```
   web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Add environment variables in the Railway dashboard:
   - `JWT_SECRET` — generate with `python -c "import secrets; print(secrets.token_hex(32))"`
   - `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com)
   - `CORS_ORIGINS` — set to your Vercel frontend URL after deploying the frontend

## Running Tests

```bash
pytest tests/ -v
```

Expected output:
```
tests/test_auth.py::test_register_and_login_success          PASSED
tests/test_plants.py::test_create_and_get_own_plant          PASSED
tests/test_plants.py::test_cannot_access_other_users_plant   PASSED
3 passed in ~2s
```

Tests use an isolated in-memory SQLite database — the real `solarpulse.db` is never touched.

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/login` | Authenticate and receive JWT |
| GET | `/plants` | List authenticated user's plants |
| POST | `/plants` | Register a new plant |
| GET | `/plants/{id}` | Get a single plant (ownership checked) |
| GET | `/plants/{id}/performance?date=YYYY-MM-DD` | Daily PR, risk score, alerts |
| GET | `/plants/{id}/sustainability` | CO₂ saved, kWh generated |
| GET | `/alerts/{id}` | AI root-cause analysis for a flagged alert |
