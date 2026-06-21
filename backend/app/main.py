"""
app/main.py — FastAPI application factory and startup lifecycle.

Startup sequence (inside lifespan):
  1. Structured logging is initialised so all subsequent log output
     is formatted correctly (JSON in production, colourised text locally).
  2. Alembic migrations are run — on a fresh Supabase PostgreSQL database
     this creates all tables; on existing databases only new migrations run.
     SQLAlchemy's `create_all` is kept as a fallback for SQLite so local
     development still works without running alembic manually.
  3. Additive SQLite migrations (legacy) are run for local SQLite only.
  4. Demo data seeding — creates the demo account, demo plant, and
     June 2026 energy readings if they do not already exist.
  5. APScheduler starts — evaluates performance for all plants hourly
     so the Alert Banner always reflects fresh data.

Shutdown sequence:
  6. APScheduler is shut down gracefully.
"""

import logging
from contextlib import asynccontextmanager

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.database import Base, engine
from app.models import Alert, EnergyReading, Inverter, Plant, User  # noqa: F401
from app.routes import admin, alerts, auth, plants
from app.routes.health import router as health_router
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.startup import seed_demo_data

logger = logging.getLogger(__name__)


def _run_alembic_migrations() -> None:
    """
    Apply all pending Alembic migrations to the target database.

    SQLite (local development):
      Migrations are skipped — SQLAlchemy's `create_all` in the lifespan
      handles schema creation for the ephemeral local database.  Running
      Alembic against SQLite is unnecessary and can conflict with tables
      that already exist from a previous `create_all` call.

    PostgreSQL (Supabase / Railway production):
      `alembic upgrade head` runs every startup.  On a fresh Supabase
      database this creates all tables from scratch; on existing instances
      only pending revisions are applied, making deployments incremental
      and safe.

    Tradeoff:
      Local SQLite diverges from the Alembic migration path.  Catch this
      in CI by running `alembic upgrade head` against a fresh PostgreSQL
      container in the test pipeline.
    """
    if settings.is_sqlite:
        logger.info("alembic: SQLite detected — using create_all (skipping Alembic)")
        return

    try:
        alembic_cfg = AlembicConfig("alembic.ini")
        alembic_command.upgrade(alembic_cfg, "head")
        logger.info("alembic: migrations applied")
    except Exception as exc:
        logger.warning("alembic: migration skipped — %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Logging
    setup_logging()
    logger.info("solarpulse: starting up", extra={"db": settings.database_url.split("@")[-1]})

    # 2. Alembic migrations (PostgreSQL) + create_all fallback (SQLite)
    _run_alembic_migrations()
    if settings.is_sqlite:
        # Ensures local SQLite always has all tables even without alembic
        Base.metadata.create_all(bind=engine)

    # 3. Legacy additive SQLite migrations (column additions not in initial schema)
    if settings.is_sqlite:
        try:
            from app.migrations import run_migrations
            run_migrations()
        except Exception as exc:
            logger.warning("legacy migrations skipped: %s", exc)

    # 4. Demo data seeding
    seed_demo_data()

    # 5. Background scheduler
    start_scheduler()

    yield

    # 6. Graceful shutdown
    stop_scheduler()
    logger.info("solarpulse: shutdown complete")


app = FastAPI(
    title="SolarPulse",
    description="AI-powered solar plant performance monitoring API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — settings.cors_origins always includes localhost dev origins,
# plus any production origins from the CORS_ORIGINS_RAW environment variable.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(plants.router)
app.include_router(alerts.router)
app.include_router(admin.router)
app.include_router(health_router)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    """Root redirect — shallow health check (used by Railway probe)."""
    return {"status": "ok", "version": "2.0.0"}
