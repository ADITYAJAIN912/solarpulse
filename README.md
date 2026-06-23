# SolarPulse

**AI-powered solar fleet performance monitoring platform.**

SolarPulse is a full-stack web application that gives solar plant operators a live view of every plant's health — flagging underperformance, running anomaly detection, and generating AI-written root-cause analysis. Built end-to-end: FastAPI backend on PostgreSQL, React frontend, and an LLM pipeline via the Groq API. Deployed and live.

**Live Demo:** [solarpulse-blond.vercel.app](https://solarpulse-blond.vercel.app)

> Demo credentials: `demo@solarpulse.io` / `demo2026`

---

## What It Does

1. **Login and see your fleet** — a dashboard shows all your plants with total installed capacity, CO₂ saved (computed from real readings), and a fleet health status.

2. **Alert Banner** — if any plant is operating below expected performance, a banner surfaces automatically on the dashboard with the severity and a direct link to investigate.

3. **Plant Detail with hourly chart** — click a plant, pick a date, and see an hour-by-hour chart of actual vs. expected generation. The gap between the two lines is the underperformance.

4. **AI root-cause analysis** — when a date is flagged, the system calls a Groq LLM which reads the anomaly data and writes a structured diagnosis: what caused the drop (panel soiling, inverter fault, shading, etc.), a confidence level, and a specific recommended maintenance action.

5. **Live weather conditions** — each plant's detail page shows real current weather for that plant's exact coordinates: temperature, cloud cover, UV index, wind speed, sunrise/sunset, and a "Solar Impact" rating that tells operators whether underperformance is weather-driven or a hardware fault.

6. **Upload your own data** — three ways to bring in real readings:
   - **Manual entry** — type hourly values into a form; expected output auto-populates from the irradiance model
   - **Paste from spreadsheet** — copy a column from Excel or your inverter portal and paste it; the system parses, validates, and shows a preview before saving
   - **CSV upload** — drag and drop a `.csv` file; download a pre-filled template to get the format right

7. **Add your own plants** — register any plant with its coordinates and capacity, then start uploading data immediately.

---

## Features

- **JWT Authentication** — register, login, logout with bcrypt password hashing and signed JWT tokens
- **Multi-plant dashboard** — KPI row: total capacity, CO₂ savings, fleet health, plant count — all from real data
- **Alert Banner** — auto-surfaces warning/critical plants, links to AI investigation view
- **Performance chart** — hourly actual vs. expected output, Recharts line chart with animated draw-in and custom tooltip
- **Anomaly detection** — scikit-learn Isolation Forest trained on 30-day rolling history, per-hour anomaly scores
- **AI root-cause analysis** — Groq LLM (`llama-3.3-70b-versatile`) generates structured fault reports: cause, confidence, explanation, recommended action
- **Live weather** — Open-Meteo API (free, no key) for real weather at each plant's lat/lon: temp, humidity, wind, UV index, cloud cover, sunrise/sunset
- **Data ingestion** — manual entry form, paste-from-spreadsheet parser, CSV upload with drag-and-drop and template download
- **Add plant** — modal form to register new plants with coordinates and capacity
- **Hourly background evaluation** — APScheduler runs performance evaluation every hour so alerts are always current
- **Health checks** — `GET /health` (shallow) and `GET /health/full` (DB ping + latency)
- **Production-ready backend** — pydantic-settings config, Alembic migrations, repository pattern, structured JSON logging

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
| Open-Meteo API | Free live weather data (no API key) |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| SQLAlchemy 2.0 | ORM with repository pattern |
| Alembic | Database migrations |
| Supabase PostgreSQL | Persistent cloud database |
| pydantic-settings | Type-safe environment variable management |
| bcrypt + python-jose | Password hashing and JWT signing |
| Groq API | LLM-powered fault analysis (Llama 3.3 70B) |
| scikit-learn | Isolation Forest anomaly detection |
| APScheduler | Hourly background performance evaluation |
| python-multipart | CSV/file upload support |

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
│  Open-Meteo API  →  called directly from browser        │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS + JWT
┌───────────────────────▼─────────────────────────────────┐
│                   Backend (Railway)                      │
│  FastAPI  │  Repository Layer  │  APScheduler           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Routes: /auth  /plants  /readings  /alerts      │   │
│  │           /health                                │   │
│  │  Services: performance  │  solar_simulator        │   │
│  │            anomaly_detection  │  ai_insights      │   │
│  │            startup (auto-seed)                    │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ SQLAlchemy + psycopg2
┌───────────────────────▼─────────────────────────────────┐
│              Supabase PostgreSQL                         │
│  users │ plants │ inverters │ energy_readings │ alerts  │
└─────────────────────────────────────────────────────────┘
```

### Data flow — fault detection

```
User uploads readings  (or auto-seed on startup)
              ↓
energy_readings table (hourly actual + expected kWh)
              ↓
GET /plants/{id}/performance?date=X
              ↓
evaluate_plant_readings()  →  PR calculated per hour
              ↓
PR < 85%?  →  upsert Alert row  →  call Groq LLM
              ↓
Isolation Forest anomaly scan  →  anomaly score per hour
              ↓
Alert + AI analysis returned to frontend
              ↓
PerformanceChart + AIInsightCard rendered
```

### Data flow — user uploads readings

```
Manual form / Paste / CSV
              ↓
POST /plants/{id}/readings  or  /readings/upload
              ↓
Expected output auto-calculated (solar irradiance model)
              ↓
energy_readings table  →  evaluate_plant_readings() triggered
              ↓
Full analytics pipeline runs on user's real data
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
# Edit .env — set JWT_SECRET and GROQ_API_KEY at minimum

uvicorn app.main:app --reload --port 8001
```

Backend starts at `http://127.0.0.1:8001`.  
Swagger UI: `http://127.0.0.1:8001/docs`

On first startup, the app automatically:
1. Creates all database tables
2. Creates the demo user `demo@solarpulse.io`
3. Creates demo plant "Jaisalmer Solar Alpha"
4. Seeds 30 days of June 2026 hourly readings with realistic fault scenarios
5. Pre-evaluates all fault dates so alerts exist immediately

### Frontend

```bash
cd frontend
npm install

# Create frontend/.env
echo "VITE_API_BASE_URL=http://127.0.0.1:8001" > .env

npm run dev
```

Frontend starts at `http://localhost:5173`.

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
| GET | `/plants/{id}/readings/expected?date=YYYY-MM-DD` | Yes | Auto-calculated expected kWh per hour |
| GET | `/plants/{id}/readings/template?date=YYYY-MM-DD` | Yes | Download pre-filled CSV template |
| POST | `/plants/{id}/readings` | Yes | Upload manual / paste readings (JSON) |
| POST | `/plants/{id}/readings/upload` | Yes | Upload CSV file |
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

### Environment variables (Vercel frontend)

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Your Railway backend URL |

---

## Demo Account vs New Accounts

> **Note for evaluators and interviewers**

The demo account (`demo@solarpulse.io`) comes pre-loaded with:
- A full month of June 2026 hourly energy readings (720 data points)
- Realistic fault scenarios on specific dates
- Pre-generated AI root-cause analysis for each fault

**New accounts start empty.** This is intentional — it reflects how the system works in production. A new user registers, adds their plant, and uploads their own data using the three ingestion methods (manual entry, paste, or CSV). The full analytics pipeline — PR calculation, anomaly detection, and AI analysis — runs immediately on whatever data they provide.

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
│   │   │   ├── config.py             # pydantic-settings config
│   │   │   └── logging.py            # structured JSON logging
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   ├── repositories/             # data access layer (repository pattern)
│   │   ├── routes/
│   │   │   ├── auth.py               # register + login
│   │   │   ├── plants.py             # plant CRUD + performance + sustainability
│   │   │   ├── readings.py           # data ingestion (manual, paste, CSV)
│   │   │   ├── alerts.py             # alert + AI analysis retrieval
│   │   │   └── health.py             # health check endpoints
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai_insights.py        # Groq LLM integration
│   │   │   ├── anomaly_detection.py  # Isolation Forest
│   │   │   ├── performance.py        # PR calculation + alert creation
│   │   │   ├── scheduler.py          # APScheduler hourly jobs
│   │   │   ├── solar_simulator.py    # irradiance model + expected output
│   │   │   └── startup.py            # auto-seed demo data on first boot
│   │   └── main.py                   # FastAPI app + lifespan
│   ├── alembic/                      # database migrations
│   ├── tests/                        # pytest suite
│   ├── Procfile                      # Railway start command
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.ts             # Axios instance + JWT interceptor
    │   │   ├── plants.ts             # plant API calls
    │   │   ├── performance.ts        # performance API calls
    │   │   ├── alerts.ts             # alert API calls
    │   │   ├── readings.ts           # readings upload API calls
    │   │   ├── sustainability.ts     # CO₂ API calls
    │   │   └── weather.ts            # Open-Meteo weather API
    │   ├── components/
    │   │   ├── plant-detail/         # PerformanceChart, AIInsightCard, WeatherCard
    │   │   ├── readings/             # UploadReadingsModal, ManualEntryTab, PasteDataTab, CsvUploadTab
    │   │   └── ui/                   # shared primitives
    │   ├── hooks/                    # usePlantDetail, useCountUp
    │   ├── pages/                    # DashboardPage, PlantDetailPage, LoginPage
    │   └── types/                    # TypeScript interfaces
    └── vercel.json                   # Vercel SPA routing config
```

---

## Testing

```bash
cd backend
pytest tests/ -v
```

Three tests covering what actually matters — auth lifecycle and ownership security boundaries:

- `test_register_and_login_success` — full auth flow end-to-end
- `test_create_and_get_own_plant` — plant CRUD with ownership check
- `test_cannot_access_other_users_plant` — 403 enforcement: users cannot access other users' plants

---

## Key Engineering Decisions

**Why PostgreSQL instead of SQLite for production?**  
SQLite is file-based — on Railway, the filesystem is ephemeral and resets on every deploy. PostgreSQL on Supabase is persistent, cloud-hosted, and survives redeployments.

**Why Isolation Forest for anomaly detection?**  
It requires no labeled fault data to train. Since new users have no fault history, a supervised classifier has nothing to learn from. Isolation Forest detects anomalies relative to each plant's own historical baseline, which generalizes across any plant configuration.

**Why Groq/Llama instead of a rule-based fault classifier?**  
A fixed classifier would need labeled training examples for every fault type. The LLM brings solar domain knowledge out of the box and produces human-readable explanations — not just a fault code.

**Why Open-Meteo for weather?**  
It's completely free with no API key, CORS-enabled (browser can call it directly), and provides the solar-critical metrics needed: UV index, cloud cover, and sunrise/sunset times. No backend proxy required.

**Why lift the weather fetch to the parent page?**  
Both the WeatherCard and LocationCard need the same weather data. Fetching once in PlantDetailPage and passing it as a prop means one network request instead of two, regardless of component re-renders.

---

## Author

Built by Aditya Jain as a full-stack portfolio project demonstrating:
- Production-grade FastAPI architecture (repository pattern, Alembic migrations, background jobs, structured logging)
- React with TypeScript, Framer Motion animations, and real-time data visualisation
- LLM integration for domain-specific structured analysis
- Three-method data ingestion pipeline (manual, paste, CSV)
- Live third-party API integration (weather)
- Full deployment pipeline (Railway + Vercel + Supabase)
