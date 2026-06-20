"""
Admin routes — protected utility endpoints for demo data management.

These endpoints are NOT part of the public API.  They are protected by a
static SEED_TOKEN (set as an environment variable in Railway) rather than
JWT so they can be invoked with a single curl command without first logging
in as a user.

Endpoint
--------
POST /admin/seed?token=<SEED_TOKEN>
    Seeds one full month (June 2026) of hourly energy readings for every
    plant currently registered in the production database.  Uses the same
    fault schedule as seed_june_2026.py so the dashboard shows realistic
    performance charts, alerts, and AI insight data.

    Safe to call multiple times — overwrite=True makes it idempotent.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import SEED_TOKEN
from app.database import get_db
from app.models.plant import Plant
from app.services.solar_simulator import simulate_plant_day

router = APIRouter(prefix="/admin", tags=["admin"])

# ---------------------------------------------------------------------------
# Fault schedule — mirrors seed_june_2026.py exactly
# ---------------------------------------------------------------------------
_FAULT_SCHEDULE: dict[int, dict[int, list[int]]] = {
    1: {
        5:  [8, 9, 10, 11],
        10: [11, 12, 13, 14, 15],
        15: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        20: [9, 10, 11, 12, 13, 14, 15, 16],
        24: [10, 11, 12, 13, 14],
        28: [9, 10, 11, 12, 13, 14, 15],
    },
    2: {
        4:  [12, 13, 14, 15],
        8:  [7, 8, 9, 10, 11],
        9:  [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        12: [10, 11, 12, 13, 14],
        15: [9, 10, 11, 12, 13],
        20: [9, 10, 11, 12, 13, 14, 15, 16],
        24: [11, 12, 13],
        27: [8, 9, 10, 11, 12, 13, 14, 15, 16],
        29: [10, 11, 12, 13, 14],
    },
}


def _require_token(token: str = Query("", alias="token")) -> None:
    """Dependency that rejects requests with a missing or wrong seed token."""
    if not SEED_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Seed endpoint is disabled — set the SEED_TOKEN environment variable in Railway.",
        )
    if token != SEED_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid seed token.",
        )


@router.post("/seed", dependencies=[Depends(_require_token)])
def seed_demo_data(db: Session = Depends(get_db)) -> dict:
    """
    Seed June 2026 demo data for all registered plants.

    Runs the same fault-injection simulation used locally in seed_june_2026.py.
    Returns a summary of every fault day so you can verify which dates to
    explore in the dashboard.

    Call once after deploying:
        curl -X POST "https://<railway-url>/admin/seed?token=<SEED_TOKEN>"
    """
    plants = db.query(Plant).all()
    if not plants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No plants found in the database. Register at least one plant first.",
        )

    june_start = date(2026, 6, 1)
    fault_days: list[dict] = []
    plants_seeded: list[dict] = []

    for plant in plants:
        plant_faults = _FAULT_SCHEDULE.get(plant.id, {})
        days_written = 0

        for day_offset in range(30):
            sim_date = june_start + timedelta(days=day_offset)
            fault_hours = plant_faults.get(sim_date.day)

            result = simulate_plant_day(
                plant_id=plant.id,
                capacity_mw=plant.capacity_mw,
                db=db,
                sim_date=sim_date,
                inject_fault_at_hours=fault_hours,
                overwrite=True,
            )
            days_written += 1

            if fault_hours:
                pr = result.performance_ratio_pct
                severity = (
                    "critical" if pr < 60
                    else "warning" if pr < 85
                    else "healthy"
                )
                fault_days.append({
                    "date": str(sim_date),
                    "plant_id": plant.id,
                    "plant_name": plant.name,
                    "pr_pct": round(pr, 1),
                    "severity": severity,
                    "fault_hours": fault_hours,
                })

        plants_seeded.append({
            "plant_id": plant.id,
            "plant_name": plant.name,
            "capacity_mw": plant.capacity_mw,
            "days_seeded": days_written,
        })

    return {
        "status": "ok",
        "message": f"Seeded June 2026 data for {len(plants)} plant(s).",
        "plants_seeded": plants_seeded,
        "fault_calendar": sorted(fault_days, key=lambda x: x["date"]),
        "tip": (
            "Open the dashboard and select any date in June 2026. "
            "Fault dates listed above will show alerts and AI analysis."
        ),
    }
