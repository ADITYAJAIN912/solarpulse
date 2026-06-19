"""
seed_june_2026.py
=================
Seeds one full month (June 1–30, 2026) of hourly energy readings for
every plant in the database.

Safety
------
- Uses overwrite=True → safe to run multiple times (idempotent).
- Auto-discovers all plants and their capacities from the DB.
- Does NOT call evaluate_plant_readings / AI services — performance
  evaluation happens lazily when the frontend queries each date.

Fault calendar
--------------
Faults are realistic Jaisalmer desert scenarios:
  - Dust-storm soiling  → gradual output loss across peak hours
  - Thermal de-rating   → midday dip due to 45 °C+ panel temps
  - Inverter trip       → sharp drop on Inverter A for several hours
  - Critical failure    → most daylight hours affected (severity=critical)

Severity is determined by the PR thresholds in performance.py:
  healthy  → PR ≥ 85 %   (normal weather variance ±10 % rarely triggers)
  warning  → PR 60–84 %  (one inverter degraded for several peak hours)
  critical → PR < 60 %   (most peak hours faulted)
"""

from datetime import date, timedelta

from app.database import SessionLocal
from app.models.plant import Plant
from app.services.solar_simulator import simulate_plant_day

# ---------------------------------------------------------------------------
# Fault schedule — {plant_id: {day_of_month: [fault_hours]}}
# ---------------------------------------------------------------------------
# Fault hours are only meaningful during daylight (6–18).
# warning  ≈ 3–5 peak hours faulted
# critical ≈ 7+ hours faulted (covers most of the bell curve)

FAULT_SCHEDULE: dict[int, dict[int, list[int]]] = {
    # Plant 1 fault days
    1: {
        5:  [8, 9, 10, 11],              # warning  — morning inverter trip
        10: [11, 12, 13, 14, 15],        # warning  — afternoon thermal de-rating
        15: [7, 8, 9, 10, 11, 12, 13,
             14, 15, 16, 17],            # CRITICAL — dust-storm soiling event
        20: [9, 10, 11, 12, 13, 14,
             15, 16],                    # CRITICAL — inverter A major fault
        24: [10, 11, 12, 13, 14],        # warning  — panel soiling
        28: [9, 10, 11, 12, 13, 14, 15], # warning  — equipment degradation
    },
    # Plant 2 fault days
    2: {
        4:  [12, 13, 14, 15],            # warning  — peak-hour thermal trip
        8:  [7, 8, 9, 10, 11],           # warning  — morning startup failure
        9:  [7, 8, 9, 10, 11, 12, 13,
             14, 15, 16, 17],            # CRITICAL — full-day inverter failure
        12: [10, 11, 12, 13, 14],        # warning  — dust soiling
        15: [9, 10, 11, 12, 13],         # warning  — thermal de-rating
        # Jun 17/18/19 — already seeded clean; overwrite keeps them clean
        20: [9, 10, 11, 12, 13, 14,
             15, 16],                    # CRITICAL — already seeded fault (preserve)
        24: [11, 12, 13],                # warning  — brief midday fault
        27: [8, 9, 10, 11, 12, 13,
             14, 15, 16],               # CRITICAL — major inverter trip
        29: [10, 11, 12, 13, 14],        # warning  — late-month degradation
    },
}


def main() -> None:
    db = SessionLocal()

    try:
        # ── Discover plants ────────────────────────────────────────────
        plants = db.query(Plant).all()
        if not plants:
            print("No plants found in the database. Register plants first.")
            return

        print(f"\n{'-'*60}")
        print(f"  SolarPulse -- June 2026 full-month seed")
        print(f"{'-'*60}")
        print(f"  Plants found: {len(plants)}")
        for p in plants:
            print(f"    Plant {p.id}: {p.name!r}  ({p.capacity_mw} MW)")
        print(f"{'-'*60}\n")

        # ── Seed every day ─────────────────────────────────────────────
        june_start = date(2026, 6, 1)
        fault_summary: list[str] = []

        for plant in plants:
            plant_faults = FAULT_SCHEDULE.get(plant.id, {})
            print(f"Seeding Plant {plant.id}: {plant.name!r}")

            for day_offset in range(30):                  # Jun 1–30
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

                if fault_hours:
                    approx_pr = result.performance_ratio_pct
                    severity  = (
                        "CRITICAL" if approx_pr < 60
                        else "warning" if approx_pr < 85
                        else "healthy"
                    )
                    fault_summary.append(
                        f"  {sim_date}  Plant {plant.id}: {plant.name!r}"
                        f"  PR={approx_pr:.1f}%  [{severity}]"
                        f"  fault hours {min(fault_hours)}-{max(fault_hours)}"
                    )
                    print(f"  + {sim_date}  PR={approx_pr:5.1f}%  FAULT hrs {fault_hours}")
                else:
                    print(f"  . {sim_date}  PR={result.performance_ratio_pct:5.1f}%")

            print()

        # ── Print fault calendar ────────────────────────────────────────
        print(f"\n{'='*60}")
        print("  FAULT CALENDAR  (dates to explore in the dashboard)")
        print(f"{'='*60}")
        for line in sorted(fault_summary):
            print(line)
        print(f"{'='*60}")
        print(f"\n  Total fault days seeded: {len(fault_summary)}")
        print("  All other dates are healthy (clean generation).")
        print("\n  Done — reload the frontend and pick any June date.\n")

    finally:
        db.close()


if __name__ == "__main__":
    main()
