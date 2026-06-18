"""
Quick smoke-test for the solar simulator.

Run from the backend/ folder:
    python scripts/test_simulator.py

Creates a throwaway user + plant, simulates two days (one normal, one
with a fault), prints a readable summary, then exits.  Safe to run
multiple times — uses overwrite=True so no duplicate rows accumulate.
"""

import sys
from datetime import date, datetime, timezone
from pathlib import Path

# Make sure backend/ is on sys.path when running as a script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base, SessionLocal, engine
from app.models import Inverter, Plant, User  # noqa: F401 — needed for create_all
from app.models.reading import EnergyReading
from app.services.auth_service import hash_password
from app.services.solar_simulator import simulate_plant_day

Base.metadata.create_all(bind=engine)

DEMO_EMAIL = "sim_test@solarpulse.io"
DEMO_PLANT_NAME = "Simulator Test Plant"
CAPACITY_MW = 50.0


def _get_or_create_demo_plant(db) -> Plant:
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not user:
        user = User(email=DEMO_EMAIL, password_hash=hash_password("demo"))
        db.add(user)
        db.flush()

    plant = db.query(Plant).filter(Plant.name == DEMO_PLANT_NAME).first()
    if not plant:
        plant = Plant(
            name=DEMO_PLANT_NAME,
            location="Jaisalmer, Rajasthan",
            latitude=26.91,
            longitude=70.90,
            capacity_mw=CAPACITY_MW,
            owner_id=user.id,
        )
        db.add(plant)
        db.flush()
    return plant


def _print_hourly_table(db: object, plant_id: int, sim_date: date) -> None:
    day_start = datetime(sim_date.year, sim_date.month, sim_date.day, 0, 0, tzinfo=timezone.utc)
    day_end = datetime(sim_date.year, sim_date.month, sim_date.day, 23, 59, tzinfo=timezone.utc)
    rows = (
        db.query(EnergyReading)
        .filter(
            EnergyReading.plant_id == plant_id,
            EnergyReading.inverter_id.is_(None),
            EnergyReading.timestamp >= day_start,
            EnergyReading.timestamp <= day_end,
        )
        .order_by(EnergyReading.timestamp)
        .all()
    )
    print(f"\n  {'Hour':>4}  {'Expected kWh':>14}  {'Actual kWh':>12}  {'PR %':>6}")
    print(f"  {'----':>4}  {'------------':>14}  {'----------':>12}  {'----':>6}")
    for r in rows:
        hour = r.timestamp.hour
        if r.expected_output_kwh == 0:
            print(f"  {hour:>4}  {r.expected_output_kwh:>14.1f}  {r.actual_output_kwh:>12.1f}  {'N/A':>6}")
        else:
            pr = r.actual_output_kwh / r.expected_output_kwh * 100
            flag = " <-- FAULT" if pr < 85 else ""
            print(f"  {hour:>4}  {r.expected_output_kwh:>14.1f}  {r.actual_output_kwh:>12.1f}  {pr:>5.1f}%{flag}")


def main() -> None:
    db = SessionLocal()
    try:
        plant = _get_or_create_demo_plant(db)
        db.commit()

        print(f"\n{'='*60}")
        print(f"  Plant : {plant.name}  (id={plant.id})")
        print(f"  Cap   : {plant.capacity_mw} MW")
        print(f"{'='*60}")

        # --- Day 1: normal operation ---
        day1 = date(2026, 6, 17)
        print(f"\n[Day 1] Normal operation — {day1}")
        s1 = simulate_plant_day(
            plant_id=plant.id,
            capacity_mw=plant.capacity_mw,
            db=db,
            sim_date=day1,
            inject_fault_at_hour=None,
            overwrite=True,
        )
        print(f"  Plant readings    : {s1.plant_readings_created}")
        print(f"  Inverter readings : {s1.inverter_readings_created}")
        print(f"  Total expected    : {s1.total_expected_kwh:,.1f} kWh")
        print(f"  Total actual      : {s1.total_actual_kwh:,.1f} kWh")
        print(f"  Overall PR        : {s1.performance_ratio_pct:.1f}%")
        _print_hourly_table(db, plant.id, day1)

        # --- Day 2: Inverter A faults at 12:00 (peak hour) ---
        day2 = date(2026, 6, 18)
        print(f"\n[Day 2] Fault injected at hour 12 — {day2}")
        s2 = simulate_plant_day(
            plant_id=plant.id,
            capacity_mw=plant.capacity_mw,
            db=db,
            sim_date=day2,
            inject_fault_at_hour=12,
            overwrite=True,
        )
        print(f"  Plant readings    : {s2.plant_readings_created}")
        print(f"  Inverter readings : {s2.inverter_readings_created}")
        print(f"  Total expected    : {s2.total_expected_kwh:,.1f} kWh")
        print(f"  Total actual      : {s2.total_actual_kwh:,.1f} kWh")
        print(f"  Overall PR        : {s2.performance_ratio_pct:.1f}%")
        print(f"  Fault hour        : {s2.fault_injected_at_hour}:00")
        _print_hourly_table(db, plant.id, day2)

        print(f"\n{'='*60}")
        print("  All checks passed — simulator is working correctly.")
        print(f"{'='*60}\n")

    finally:
        db.close()


if __name__ == "__main__":
    main()
