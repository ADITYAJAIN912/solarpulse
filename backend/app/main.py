from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import Base, engine
from app.migrations import run_migrations
from app.models import Alert, EnergyReading, Inverter, Plant, User  # noqa: F401
from app.routes import admin, alerts, auth, plants


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    yield


app = FastAPI(
    title="SolarPulse",
    description="AI-powered solar plant performance monitoring API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — origins come from config.py which reads the CORS_ORIGINS env var.
# Set CORS_ORIGINS=https://your-app.vercel.app in the Railway dashboard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(plants.router)
app.include_router(alerts.router)
app.include_router(admin.router)


@app.get("/")
def health_check() -> dict[str, str]:
    """Health check endpoint to verify the API is running."""
    return {"status": "ok"}