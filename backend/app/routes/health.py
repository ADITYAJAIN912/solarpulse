"""
app/routes/health.py — application health check endpoints.

Two tiers:
  GET /health        — shallow ping (used by Railway's health check probe).
                       Returns 200 immediately without touching the database.
                       This is what Railway calls to decide whether the
                       container is ready to receive traffic.

  GET /health/full   — deep check that also pings the database.
                       Use this in monitoring dashboards or uptime robots
                       to detect database connectivity issues.

Design notes:
- Neither endpoint requires authentication — health checks are called by
  infrastructure, not users, and exposing basic health status is safe.
- The full check intentionally returns 503 (not 200) when the DB is down
  so that load balancers and uptime monitors detect the failure correctly.
"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.database import SessionLocal

router = APIRouter(prefix="/health", tags=["health"])

# Application version — bump when making significant changes
APP_VERSION = "2.0.0"


@router.get("", summary="Shallow health ping")
def health_ping() -> dict:
    """
    Shallow health check — always returns 200 if the process is alive.

    Used by Railway's internal health-check probe.  Returns immediately
    without any I/O.
    """
    return {
        "status": "ok",
        "version": APP_VERSION,
        "ts": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/full", summary="Deep health check including database connectivity")
def health_full() -> JSONResponse:
    """
    Deep health check that pings the database.

    Returns 200 with status="ok" if everything is healthy.
    Returns 503 with status="degraded" and an error message if the
    database cannot be reached.
    """
    start_ms = time.monotonic()

    db_status = "ok"
    db_error: str | None = None
    db_latency_ms: float | None = None

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.monotonic() - start_ms) * 1000, 2)
    except Exception as exc:
        db_status = "error"
        db_error = str(exc)
    finally:
        db.close()

    overall = "ok" if db_status == "ok" else "degraded"
    http_status = 200 if overall == "ok" else 503

    payload = {
        "status": overall,
        "version": APP_VERSION,
        "ts": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": db_status,
            "backend": "postgresql" if settings.is_postgres else "sqlite",
            "latency_ms": db_latency_ms,
            "error": db_error,
        },
    }

    return JSONResponse(content=payload, status_code=http_status)
