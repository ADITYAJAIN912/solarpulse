# SolarPulse

**AI-powered solar fleet performance monitoring platform.**

SolarPulse is a full-stack web application that simulates a real-world solar energy operations dashboard used by asset managers to monitor utility-scale solar plants. It demonstrates end-to-end full-stack engineering: a FastAPI backend with PostgreSQL, a React frontend with Framer Motion animations, and LLM-powered root-cause analysis via the Groq API.

**Live Demo:** [solarpulse-blond.vercel.app](https://solarpulse-blond.vercel.app)

> Demo credentials: `demo@solarpulse.io` / `demo2026`

---

## Screenshots

| Login | Dashboard | Plant Detail + AI Insight |
|---|---|---|
| Split-screen login with animated solar illustration | KPI row, Alert Banner, plant grid | Performance chart, severity badges, Groq AI analysis |

---

## Features

- **JWT Authentication** — register, login, logout with bcrypt password hashing and signed JWT tokens
- **Multi-plant dashboard** — KPI row showing total capacity, fleet health, and CO₂ savings computed from real data
- **Alert Banner** — automatically surfaces plants operating below expected performance, linking directly to the investigation view
- **Performance charts** — hourly actual vs. expected output visualised with Recharts, draw-in animations, custom tooltip
- **AI root-cause analysis** — Groq LLM (`llama-3.3-70b-versatile`) generates structured fault explanations and recommended maintenance actions for any flagged date
- **Add plant** — authenticated users can register new solar plants via a modal form
- **Hourly background evaluation** — APScheduler runs performance evaluation for all plants every hour so the Alert Banner always shows fresh data
- **Health checks** — `GET /health` (shallow) and `GET /health/full` (DB ping with latency) for monitoring
- **Production-ready backend** — pydantic-settings config, Alembic migrations, repository layer, structured JSON logging

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling with CSS custom properties |
| Framer Motion | Page transitions, staggered reveals, count-up animations |
| Recharts | Performance line charts |
| Axios | API client with JWT interceptor |
| React Router v6 | Client-side routing, protected routes |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| SQLAlchemy 2.0 | ORM with repository pattern |
| Alembic | Database migrations |
| Supabase PostgreSQL | Persistent cloud database |
| pydantic-settings | Type-safe environment variable management |
| bcrypt + python-jose | Password hashing and JWT signing |
| Groq API | LLM-powered fault analysis |
| APScheduler | Hourly background performance evaluation |
| scikit-learn | Isolation Forest anomaly detection |

### Infrastructure
| Service | Role |
|---|---|
| Railway | Backend hosting (auto-deploy from GitHub) |
| Vercel | Frontend hosting (auto-deploy from GitHub) |
| Supabase | Managed PostgreSQL database |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                     │
│  React + TypeScript + Tailwind + Framer Motion          │
│  Axios client  →  VITE_API_BASE_URL (Railway)           │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS + JWT
┌───────────────────────▼─────────────────────────────────┐
│                   Backend (Railway)                      │
│  FastAPI  │  Repository Layer  │  APScheduler           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Routes: /auth  /plants  /alerts  /health       │   │
│  │  Services: performance │ solar_simulator         │   │
│  │           anomaly_detection │ ai_insights (Groq) │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ SQLAlchemy + psycopg2
┌───────────────────────▼─────────────────────────────────┐
│              Supabase PostgreSQL                         │
│  users │ plants │ inverters │ energy_readings │ alerts  │
└─────────────────────────────────────────────────────────┘
```

### Data flow for fault detection
```
Startup seed  →  720 hourly readings (June 2026, 30 days)
                 ↓
User opens Plant Detail page for a date
                 ↓
GET /plants/{id}/performance?date=X
                 ↓
evaluate_plant_readings()  →  calculates PR for each hour
                 ↓
PR < 85%?  →  upsert Alert row  →  call Groq API
                 ↓
Alert returned to frontend  →  AIInsightCard renders analysis
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Create backend/.env
cp .env.example .env
# Edit .env and set JWT_SECRET and GROQ_API_KEY at minimum

uvicorn app.main:app --reload --port 8001
```

The backend starts at `http://127.0.0.1:8001`.  
Swagger UI: `http://127.0.0.1:8001/docs`

On first startup, the app will automatically:
1. Create all database tables (SQLite locally)
2. Create the demo user `demo@solarpulse.io`
3. Create a demo plant "Jaisalmer Solar Alpha"
4. Seed 30 days of June 2026 hourly readings with realistic fault scenarios
5. Pre-evaluate all fault dates so Alert rows exist immediately

### Frontend

```bash
cd frontend
npm install

# Create frontend/.env
echo "VITE_API_BASE_URL=http://127.0.0.1:8001" > .env

npm run dev
```

Frontend starts at `http://localhost:5173`.

### Seeding data manually (optional)

If you want to re-seed or seed additional plants:

```bash
cd backend
python seed_june_2026.py
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new account |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/plants` | Yes | List user's plants |
| POST | `/plants` | Yes | Create a new plant |
| GET | `/plants/{id}` | Yes | Get plant details |
| GET | `/plants/{id}/performance?date=YYYY-MM-DD` | Yes | Daily PR + severity + hourly readings |
| GET | `/plants/{id}/sustainability` | Yes | CO₂ savings summary |
| GET | `/plants/{id}/anomalies?date=YYYY-MM-DD` | Yes | Isolation Forest anomaly scan |
| GET | `/alerts/{alert_id}` | Yes | Full alert with AI explanation |
| GET | `/health` | No | Shallow health ping |
| GET | `/health/full` | No | Deep health check with DB latency |

All protected endpoints require `Authorization: Bearer <token>` header.

---

## Deployment

### Environment variables (Railway backend)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Yes | Random 32+ char secret for signing tokens |
| `GROQ_API_KEY` | Yes | Groq API key for AI analysis |
| `CORS_ORIGINS_RAW` | Yes | Comma-separated allowed frontend origins |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `DEMO_EMAIL` | No | Default: `demo@solarpulse.io` |
| `DEMO_PASSWORD` | No | Default: `demo2026` |
| `SEED_TOKEN` | No | Token for `POST /admin/seed` endpoint |

### Environment variables (Vercel frontend)

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Your Railway backend URL |

---

## Demo Account vs New Accounts

> **Important note for evaluators and interviewers**

The demo account (`demo@solarpulse.io`) comes pre-loaded with:
- A full month of June 2026 hourly energy readings (720 data points)
- Realistic fault scenarios injected on specific dates (see fault calendar below)
- Pre-generated AI root-cause analysis for each fault

**New accounts start empty** — the dashboard will show zero plants and no data. This is intentional and reflects how the system would work in production: a new customer would register, add their plant, and the system would begin ingesting live readings from their inverter hardware via SCADA integration. Since this is a portfolio project without real hardware, new accounts demonstrate the UI and CRUD flows but not the full analytics pipeline.

**To see the full AI-powered analytics experience, use the demo account.**

### Fault calendar (demo account, June 2026)

| Date | Severity | Fault scenario |
|---|---|---|
| June 5 | Warning | Morning inverter trip (hours 8–11) |
| June 10 | Warning | Afternoon thermal de-rating (hours 11–15) |
| June 15 | Critical | Dust-storm soiling event (hours 7–17) |
| June 20 | Critical | Inverter A major fault (hours 9–16) |
| June 24 | Warning | Panel soiling (hours 10–14) |
| June 28 | Warning | Equipment degradation (hours 9–15) |

All other June dates show healthy generation (PR ≥ 85%).

---

## Project Structure

```
solarpulse/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # pydantic-settings config
│   │   │   └── logging.py         # structured JSON logging
│   │   ├── models/                # SQLAlchemy ORM models
│   │   ├── repositories/          # data access layer
│   │   ├── routes/                # FastAPI route handlers
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai_insights.py     # Groq LLM integration
│   │   │   ├── anomaly_detection.py  # Isolation Forest
│   │   │   ├── performance.py     # PR calculation + alerting
│   │   │   ├── scheduler.py       # APScheduler background jobs
│   │   │   ├── solar_simulator.py # synthetic data generation
│   │   │   └── startup.py        # auto-seed demo data
│   │   └── main.py               # FastAPI app + lifespan
│   ├── alembic/                   # database migrations
│   ├── tests/                     # pytest suite
│   ├── Procfile                   # Railway start command
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/                   # Axios API clients
    │   ├── components/            # reusable UI components
    │   ├── hooks/                 # custom React hooks
    │   ├── pages/                 # page-level components
    │   └── types/                 # TypeScript interfaces
    └── vercel.json                # Vercel SPA routing config
```

---

## Testing

```bash
cd backend
pytest tests/ -v
```

Three tests covering authentication lifecycle and ownership security boundaries:
- `test_register_and_login_success` — full auth flow
- `test_create_and_get_own_plant` — plant CRUD
- `test_cannot_access_other_users_plant` — ownership boundary (403 enforcement)

---

## Author

Built by Aditya Jain as a full-stack portfolio project demonstrating:
- Production-grade FastAPI architecture (repositories, migrations, background jobs)
- React with TypeScript and advanced Framer Motion animations
- LLM integration for domain-specific analysis
- Full deployment pipeline (Railway + Vercel + Supabase)
