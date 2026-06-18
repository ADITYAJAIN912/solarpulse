from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import Base, engine
from app.models import Alert, EnergyReading, Inverter, Plant, User  # noqa: F401
from app.routes import auth, plants


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SolarPulse",
    description="AI-powered solar plant performance monitoring API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(auth.router)
app.include_router(plants.router)


@app.get("/")
def health_check() -> dict[str, str]:
    """Health check endpoint to verify the API is running."""
    return {"status": "ok"}
