"""
app/services/scheduler.py — APScheduler background jobs.

Runs periodic tasks inside the FastAPI process without requiring a
separate Celery worker or Redis broker.  For this project's scale
(tens of plants, hourly data), APScheduler's BackgroundScheduler is
sufficient and keeps the deployment to a single Railway service.

Current jobs:
  evaluate_all_plants_today — runs every hour.
    For every plant in the database, evaluates today's performance ratio
    using the readings stored so far.  This ensures the Alert Banner on
    the dashboard reflects fresh data without requiring the user to
    manually request a performance evaluation.

Production note:
  APScheduler stores job state in-memory by default — if the process
  restarts, jobs resume from scratch (they don't "catch up" on missed
  runs).  For this analytics use case, missing one hourly run is
  acceptable.  A production fleet management system would use a
  persistent job store (e.g., Redis or PostgreSQL-backed APScheduler).
"""

import logging
from datetime import date

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import SessionLocal
from app.repositories.plant_repository import plant_repo
from app.services.performance import evaluate_plant_readings

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="UTC")


def evaluate_all_plants_today() -> None:
    """
    Evaluate today's performance ratio for every plant in the database.

    Runs automatically once per hour via APScheduler.  Creates or updates
    Alert rows for plants whose PR falls below the warning threshold.

    Errors for individual plants are caught and logged so that one bad
    plant does not prevent the others from being evaluated.
    """
    today = date.today()
    db = SessionLocal()

    try:
        plants = plant_repo.get_all(db)
        if not plants:
            return

        logger.info("scheduler.evaluate: starting", extra={"date": str(today), "plants": len(plants)})

        success = 0
        for plant in plants:
            try:
                result = evaluate_plant_readings(plant_id=plant.id, db=db, eval_date=today)
                logger.debug(
                    "scheduler.evaluate: plant done",
                    extra={
                        "plant_id": plant.id,
                        "pr": result.overall_pr,
                        "severity": result.severity,
                    },
                )
                success += 1
            except Exception:
                logger.exception(
                    "scheduler.evaluate: plant failed",
                    extra={"plant_id": plant.id},
                )

        logger.info(
            "scheduler.evaluate: complete",
            extra={"date": str(today), "evaluated": success, "total": len(plants)},
        )

    except Exception:
        logger.exception("scheduler.evaluate: unexpected failure")
    finally:
        db.close()


def start_scheduler() -> None:
    """
    Register all background jobs and start the scheduler.

    Called once during application startup (in main.py lifespan).
    The scheduler runs in a daemon thread — it stops automatically
    when the process exits.
    """
    scheduler.add_job(
        evaluate_all_plants_today,
        trigger=IntervalTrigger(hours=1),
        id="evaluate_all_plants_today",
        name="Evaluate all plants for today",
        replace_existing=True,
        misfire_grace_time=300,  # Allow up to 5-minute delay before skipping
    )

    scheduler.start()
    logger.info("scheduler: started (hourly performance evaluation enabled)")


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler during application teardown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("scheduler: stopped")
