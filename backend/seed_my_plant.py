from datetime import date
from app.database import SessionLocal
from app.services.solar_simulator import simulate_plant_day

db = SessionLocal()

for d in [date(2026, 6, 17), date(2026, 6, 18), date(2026, 6, 19)]:
    summary = simulate_plant_day(
        plant_id=2,
        capacity_mw=50.0,
        db=db,
        sim_date=d,
        overwrite=True
    )
    print(f"Created data for {d}")

db.close()
print("Done — plant 2 now has 3 days of simulated readings")