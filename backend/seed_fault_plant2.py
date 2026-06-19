from datetime import date

from app.database import SessionLocal
from app.services.performance import evaluate_plant_readings
from app.services.solar_simulator import simulate_plant_day


def main():
    db = SessionLocal()

    try:
        fault_date = date(2026, 6, 20)

        simulate_plant_day(
            plant_id=2,
            capacity_mw=50.0,
            db=db,
            sim_date=fault_date,
            inject_fault_at_hours=[9, 10, 11, 12, 13, 14, 15, 16],
            overwrite=True,
        )

        print(f"Simulated fault data for plant 2 on {fault_date}")

        result = evaluate_plant_readings(
            plant_id=2,
            db=db,
            eval_date=fault_date,
        )

        print("\n===== PERFORMANCE EVALUATION =====")
        print(f"Severity : {result.severity}")
        print(f"Risk Score : {result.risk_score}")
        print(f"Alert ID : {result.alert_id}")
        print(f"Flagged Hours : {len(result.flagged_hours)}")

    finally:
        db.close()


if __name__ == "__main__":
    main()