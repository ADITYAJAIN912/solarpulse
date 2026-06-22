"""
Solar output simulator for SolarPulse.

Generates realistic hourly energy production data without real SCADA feeds.
All generation values are mathematically derived from a solar irradiance
model and are suitable for demo, testing, and anomaly-detection development.
"""

import math
import random
from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models.inverter import Inverter
from app.models.reading import EnergyReading

# ---------------------------------------------------------------------------
# Solar curve constants
# ---------------------------------------------------------------------------

SUNRISE_HOUR: int = 6   # Generation starts at 6 AM
SUNSET_HOUR: int = 18   # Generation stops after 6 PM
SOLAR_HOURS: int = SUNSET_HOUR - SUNRISE_HOUR  # 12 productive hours

# At peak irradiance a real plant operates at ~80% of its DC nameplate
# capacity due to inverter losses, DC wiring losses, and temperature
# de-rating.  This is the industry-standard "performance ratio" baseline.
NAMEPLATE_EFFICIENCY: float = 0.80

# Normal weather variance: actual output swings ±10% around expected
WEATHER_VARIANCE_RANGE: float = 0.10

# Fault scenario: one inverter drops to 50–70% of expected output
FAULT_FLOOR: float = 0.50
FAULT_CEIL: float = 0.70

# Each inverter handles roughly half the plant capacity; allow ±3% split
# variance so the two units never look perfectly identical.
INVERTER_SPLIT_VARIANCE: float = 0.03

INVERTER_NAMES: list[str] = ["Inverter A", "Inverter B"]


# ---------------------------------------------------------------------------
# Core calculation
# ---------------------------------------------------------------------------

@dataclass
class HourlyOutput:
    expected_output_kwh: float
    actual_output_kwh: float


def generate_hourly_output(
    capacity_mw: float,
    hour_of_day: int,
    weather_variance: bool = True,
    fault_injection: bool = False,
) -> HourlyOutput:
    """
    Calculate expected and actual energy output (kWh) for a single hour.

    Solar irradiance curve
    ----------------------
    We use a half-sine wave to model the sun's arc across the sky:

        solar_fraction = sin(π × (hour − SUNRISE) / SOLAR_HOURS)

    This produces:
      • 0.0  at hour 6  (sunrise  — sun is on the horizon)
      • 1.0  at hour 12 (solar noon — sun is directly overhead)
      • 0.0  at hour 18 (sunset   — sun returns to the horizon)

    Multiplying by NAMEPLATE_EFFICIENCY (0.80) gives expected kWh:

        expected_kwh = capacity_MW × 1000 kW/MW × solar_fraction × 0.80

    Outside the 6–18 window the fraction is 0, so night hours produce
    nothing — matching real solar plant behaviour.

    Variance and faults
    -------------------
    weather_variance=True adds ±10% random noise to simulate cloud cover
    and temperature fluctuation.  fault_injection=True additionally drops
    output by 30–50% to simulate an equipment fault for testing.

    Args:
        capacity_mw:      Nameplate DC capacity of the unit (MW).
        hour_of_day:      Integer hour 0–23.
        weather_variance: Apply ±10% random weather noise.
        fault_injection:  Apply an additional 30–50% output drop.

    Returns:
        HourlyOutput with expected_output_kwh and actual_output_kwh.
    """
    if hour_of_day < SUNRISE_HOUR or hour_of_day >= SUNSET_HOUR:
        return HourlyOutput(expected_output_kwh=0.0, actual_output_kwh=0.0)

    # Fraction of peak irradiance at this hour (0.0 → 1.0 → 0.0)
    solar_fraction = math.sin(
        math.pi * (hour_of_day - SUNRISE_HOUR) / SOLAR_HOURS
    )

    # Expected output assumes perfect weather, nameplate efficiency only
    expected_kwh = capacity_mw * 1000.0 * solar_fraction * NAMEPLATE_EFFICIENCY

    # Actual output starts equal to expected, then noise is layered on
    actual_kwh = expected_kwh

    if weather_variance:
        noise = random.uniform(-WEATHER_VARIANCE_RANGE, WEATHER_VARIANCE_RANGE)
        actual_kwh *= 1.0 + noise

    if fault_injection:
        fault_multiplier = random.uniform(FAULT_FLOOR, FAULT_CEIL)
        actual_kwh *= fault_multiplier

    return HourlyOutput(
        expected_output_kwh=round(expected_kwh, 3),
        actual_output_kwh=round(max(actual_kwh, 0.0), 3),
    )


def calculate_expected_output_kwh(capacity_mw: float, hour_of_day: int) -> float:
    """
    Return the deterministic expected output (kWh) for a given capacity and hour.

    Uses the same half-sine irradiance model as generate_hourly_output but
    with no randomness — suitable for auto-populating the Expected column
    in the user-facing readings upload form.
    """
    return generate_hourly_output(
        capacity_mw, hour_of_day, weather_variance=False, fault_injection=False
    ).expected_output_kwh


# ---------------------------------------------------------------------------
# Day-level simulation
# ---------------------------------------------------------------------------

@dataclass
class SimulationSummary:
    plant_id: int
    date: date
    inverters_used: list[str]
    plant_readings_created: int
    inverter_readings_created: int
    total_expected_kwh: float
    total_actual_kwh: float
    performance_ratio_pct: float
    fault_injected_at_hour: int | None          # legacy single-hour field
    fault_injected_at_hours: list[int] | None   # multi-hour field


def simulate_plant_day(
    plant_id: int,
    capacity_mw: float,
    db: Session,
    sim_date: date,
    inject_fault_at_hour: int | None = None,
    inject_fault_at_hours: list[int] | None = None,
    overwrite: bool = False,
) -> SimulationSummary:
    """
    Simulate a full 24-hour day of generation for one plant.

    Inverter provisioning
    ---------------------
    Two inverters are created for the plant on the first call and reused
    on subsequent calls.  Each handles ~50% of plant capacity with small
    per-hour variance so they look like independent physical units.

    Reading hierarchy
    -----------------
    For every hour 0–23 this function writes three rows:
      1. Plant-level reading  (inverter_id=None)  — sum of both inverters.
         Used for plant PR calculation and alerting.
      2. Inverter A reading   (inverter_id set)   — ~50% of plant.
      3. Inverter B reading   (inverter_id set)   — ~50% of plant.

    Fault injection
    ---------------
    Both inject_fault_at_hour (single int, legacy) and inject_fault_at_hours
    (list of ints, multi-hour) are merged into a single fault-hour set at
    runtime.  Inverter A has fault_injection=True for every hour in that set.
    Inverter B always runs normally so the plant-level PR drops proportionally
    rather than completely — mirroring a real single-inverter degradation.

    Args:
        plant_id:               Database id of the Plant row.
        capacity_mw:            Nameplate capacity of the plant (MW).
        db:                     Active SQLAlchemy session.
        sim_date:               Calendar date to simulate.
        inject_fault_at_hour:   Single hour (0–23) at which Inverter A faults.
                                Kept for backward compatibility.
        inject_fault_at_hours:  List of hours at which Inverter A faults.
                                Use for multi-hour sustained fault scenarios.
        overwrite:              If True, delete existing readings for this
                                plant+date before inserting new ones.

    Returns:
        SimulationSummary dataclass with counts and aggregate metrics.
    """
    # ------------------------------------------------------------------
    # Optional: clear stale readings for this date so re-runs are clean
    # ------------------------------------------------------------------
    if overwrite:
        day_start = datetime(sim_date.year, sim_date.month, sim_date.day,
                             0, 0, 0, tzinfo=timezone.utc)
        day_end = datetime(sim_date.year, sim_date.month, sim_date.day,
                           23, 59, 59, tzinfo=timezone.utc)
        db.query(EnergyReading).filter(
            EnergyReading.plant_id == plant_id,
            EnergyReading.timestamp >= day_start,
            EnergyReading.timestamp <= day_end,
        ).delete(synchronize_session=False)
        db.flush()

    # ------------------------------------------------------------------
    # Provision inverters (idempotent — skips creation if they exist)
    # ------------------------------------------------------------------
    inverters: list[Inverter] = []
    for inv_name in INVERTER_NAMES:
        existing = (
            db.query(Inverter)
            .filter(Inverter.plant_id == plant_id, Inverter.name == inv_name)
            .first()
        )
        if existing:
            inverters.append(existing)
        else:
            inv = Inverter(plant_id=plant_id, name=inv_name)
            db.add(inv)
            db.flush()  # get the id before using it in readings
            inverters.append(inv)

    inv_a, inv_b = inverters[0], inverters[1]

    # Each inverter handles ~50% of capacity; small per-simulation variance
    # makes them look like independently calibrated physical units.
    split_a = 0.50 + random.uniform(-INVERTER_SPLIT_VARIANCE, INVERTER_SPLIT_VARIANCE)
    split_b = 1.0 - split_a
    cap_a = capacity_mw * split_a
    cap_b = capacity_mw * split_b

    plant_readings: list[EnergyReading] = []
    inverter_readings: list[EnergyReading] = []

    total_expected = 0.0
    total_actual = 0.0

    # Merge single-hour and multi-hour fault params into one set
    fault_hour_set: set[int] = set()
    if inject_fault_at_hour is not None:
        fault_hour_set.add(inject_fault_at_hour)
    if inject_fault_at_hours is not None:
        fault_hour_set.update(inject_fault_at_hours)

    for hour in range(24):
        ts = datetime(
            sim_date.year, sim_date.month, sim_date.day,
            hour, 0, 0, tzinfo=timezone.utc
        )

        fault_this_hour = hour in fault_hour_set

        out_a = generate_hourly_output(
            capacity_mw=cap_a,
            hour_of_day=hour,
            weather_variance=True,
            fault_injection=fault_this_hour,
        )
        out_b = generate_hourly_output(
            capacity_mw=cap_b,
            hour_of_day=hour,
            weather_variance=True,
            fault_injection=False,  # fault is on inverter A only
        )

        # Plant-level: sum both inverters
        plant_expected = round(out_a.expected_output_kwh + out_b.expected_output_kwh, 3)
        plant_actual = round(out_a.actual_output_kwh + out_b.actual_output_kwh, 3)

        plant_readings.append(EnergyReading(
            plant_id=plant_id,
            inverter_id=None,
            timestamp=ts,
            expected_output_kwh=plant_expected,
            actual_output_kwh=plant_actual,
        ))

        inverter_readings.append(EnergyReading(
            plant_id=plant_id,
            inverter_id=inv_a.id,
            timestamp=ts,
            expected_output_kwh=out_a.expected_output_kwh,
            actual_output_kwh=out_a.actual_output_kwh,
        ))

        inverter_readings.append(EnergyReading(
            plant_id=plant_id,
            inverter_id=inv_b.id,
            timestamp=ts,
            expected_output_kwh=out_b.expected_output_kwh,
            actual_output_kwh=out_b.actual_output_kwh,
        ))

        total_expected += plant_expected
        total_actual += plant_actual

    db.bulk_save_objects(plant_readings)
    db.bulk_save_objects(inverter_readings)
    db.commit()

    pr_pct = round((total_actual / total_expected * 100), 2) if total_expected > 0 else 0.0

    all_fault_hours = sorted(fault_hour_set) if fault_hour_set else None

    return SimulationSummary(
        plant_id=plant_id,
        date=sim_date,
        inverters_used=[inv_a.name, inv_b.name],
        plant_readings_created=len(plant_readings),
        inverter_readings_created=len(inverter_readings),
        total_expected_kwh=round(total_expected, 2),
        total_actual_kwh=round(total_actual, 2),
        performance_ratio_pct=pr_pct,
        fault_injected_at_hour=inject_fault_at_hour,
        fault_injected_at_hours=all_fault_hours,
    )
