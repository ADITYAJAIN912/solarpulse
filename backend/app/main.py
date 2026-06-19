from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.migrations import run_migrations
from app.models import Alert, EnergyReading, Inverter, Plant, User  # noqa: F401
from app.routes import alerts, auth, plants


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

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)   

app.include_router(auth.router)
app.include_router(plants.router)
app.include_router(alerts.router)


@app.get("/")
def health_check() -> dict[str, str]:
    """Health check endpoint to verify the API is running."""
    return {"status": "ok"}