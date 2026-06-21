"""
app/services/startup.py — automatic demo data seeding on application startup.

This module solves the "empty database" problem that plagues deployed
demo applications: a fresh Supabase/Railway deployment has no users,
no plants, and no readings, so the frontend shows nothing.

Seeding strategy:
  1. Check if the demo account (settings.demo_email) exists.
     If not → create the user account.
  2. Check if the demo user has any plants.
     If not → create one demo plant.
  3. Check if the demo plant has any energy readings.
     If not → seed a full month (June 1–30, 2026) of hourly readings
     with a realistic fault schedule injected on specific days.

All operations are idempotent — calling seed_demo_data() multiple times
(e.g., on each redeploy) is safe.  Existing data is never overwritten.

Why here and not in alembic?
  Alembic handles schema (DDL).  Business data like demo accounts belongs
  in application code, not migrations, so it can be changed without a
  new migration revision.
"""

import logging
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import SessionLocal
from app.models.reading import EnergyReading
from app.repositories.plant_repository import plant_repo
from app.repositories.user_repository import user_repo
from app.services.auth_service import hash_password
from app.services.solar_simulator import simulate_plant_day

logger = logging.getLogger(__name__)

# ── Fault schedule for the demo plant ────────────────────────────────────────
# Maps day-of-month → list of fault hours (daylight: 6–18).
# Severity is determined at query time by performance.py PR thresholds:
#   PR ≥ 85 % → healthy   |   60–84 % → warning   |   < 60 % → critical
DEMO_FAULT_SCHEDULE: dict[int, list[int]] = {
    5:  [8, 9, 10, 11],                          # warning  — morning inverter trip
    10: [11, 12, 13, 14, 15],                    # warning  — afternoon thermal de-rating
    15: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],  # CRITICAL — dust-storm soiling event
    20: [9, 10, 11, 12, 13, 14, 15, 16],         # CRITICAL — inverter A major fault
    24: [10, 11, 12, 13, 14],                    # warning  — panel soiling
    28: [9, 10, 11, 12, 13, 14, 15],             # warning  — equipment degradation
}


def _has_readings(db: Session, plant_id: int) -> bool:
    """Return True if the plant has at least one EnergyReading row."""
    return (
        db.query(EnergyReading)
        .filter(EnergyReading.plant_id == plant_id)
        .first()
    ) is not None


def seed_demo_data() -> None:
    """
    Ensure the demo account, demo plant, and June 2026 readings exist.

    Called once during application startup (in main.py lifespan).
    Safe to call multiple times — each step checks before acting.
    """
    db: Session = SessionLocal()
    try:
        # ── Step 1: Demo user ─────────────────────────────────────────────
        demo_user = user_repo.get_by_email(db, settings.demo_email)
        if demo_user is None:
            logger.info("startup.seed: creating demo user", extra={"email": settings.demo_email})
            demo_user = user_repo.create(
                db,
                email=settings.demo_email,
                password_hash=hash_password(settings.demo_password),
            )
            logger.info("startup.seed: demo user created", extra={"user_id": demo_user.id})
        else:
            logger.info("startup.seed: demo user exists", extra={"user_id": demo_user.id})

        # ── Step 2: Demo plant ────────────────────────────────────────────
        plants = plant_repo.get_by_owner(db, demo_user.id)
        if not plants:
            logger.info("startup.seed: creating demo plant")
            from app.schemas.plant import PlantCreate
            demo_plant = plant_repo.create(
                db,
                payload=PlantCreate(
                    name=settings.demo_plant_name,
                    location=settings.demo_plant_location,
                    latitude=settings.demo_plant_latitude,
                    longitude=settings.demo_plant_longitude,
                    capacity_mw=settings.demo_plant_capacity_mw,
                ),
                owner_id=demo_user.id,
            )
            logger.info("startup.seed: demo plant created", extra={"plant_id": demo_plant.id})
        else:
            demo_plant = plants[0]
            logger.info("startup.seed: demo plant exists", extra={"plant_id": demo_plant.id})

        # ── Step 3: June 2026 energy readings ────────────────────────────
        if _has_readings(db, demo_plant.id):
            logger.info(
                "startup.seed: readings already exist — skipping",
                extra={"plant_id": demo_plant.id},
            )
            return

        logger.info(
            "startup.seed: seeding June 2026 readings",
            extra={"plant_id": demo_plant.id, "days": 30},
        )

        june_start = date(2026, 6, 1)
        fault_days_seeded: list[str] = []

        for day_offset in range(30):              # June 1–30
            sim_date = june_start + timedelta(days=day_offset)
            fault_hours = DEMO_FAULT_SCHEDULE.get(sim_date.day)

            result = simulate_plant_day(
                plant_id=demo_plant.id,
                capacity_mw=demo_plant.capacity_mw,
                db=db,
                sim_date=sim_date,
                inject_fault_at_hours=fault_hours,
                overwrite=False,   # Never overwrite existing rows
            )

            if fault_hours:
                pr = result.performance_ratio_pct
                severity = (
                    "CRITICAL" if pr < 60
                    else "warning" if pr < 85
                    else "healthy"
                )
                fault_days_seeded.append(
                    f"{sim_date} [{severity}] PR={pr:.1f}% fault-hrs={fault_hours}"
                )

        logger.info(
            "startup.seed: June 2026 readings complete",
            extra={
                "plant_id": demo_plant.id,
                "fault_days": len(fault_days_seeded),
                "fault_calendar": fault_days_seeded,
            },
        )

    except Exception:
        logger.exception("startup.seed: seeding failed — application will continue but may show empty data")
    finally:
        db.close()
