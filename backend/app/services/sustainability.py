"""
CO₂ savings estimation for SolarPulse plants.

Uses India's approximate grid emission factor to translate generated solar
energy into avoided greenhouse-gas emissions.  Figures are indicative only —
real carbon accounting would require site-specific grid mix data and
certified methodology.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.reading import EnergyReading

# India's grid-average emission factor (approximate).
# Source: widely cited figure for India's electricity grid carbon intensity,
# ~0.82 kg CO₂ per kWh.  Actual intensity varies by region, season, and
# fuel mix; treat this as a demo approximation, not a compliance metric.
INDIA_GRID_EMISSION_FACTOR_KG_PER_KWH: float = 0.82

# Rough annual CO₂ sequestration per mature tree (kg/year), used only for
# a human-readable equivalence statement on the dashboard.
CO2_ABSORBED_PER_TREE_PER_YEAR_KG: float = 21.0


def calculate_co2_saved(total_kwh: float) -> float:
    """
    Estimate CO₂ emissions avoided by generating solar energy instead of
    drawing from India's grid.

    Formula: CO₂ avoided (kg) = total_kwh × grid_emission_factor

    The 0.82 kg/kWh factor is an approximation based on India's average
    grid carbon intensity.  Regional grids (e.g. coal-heavy vs. hydro-heavy)
    can differ materially from this national average.
    """
    return total_kwh * INDIA_GRID_EMISSION_FACTOR_KG_PER_KWH


def _tree_equivalence_statement(co2_saved_kg: float) -> str:
    """Build a plain-language trees-planted equivalence string."""
    if co2_saved_kg <= 0:
        return "No CO₂ savings recorded yet for this plant."

    trees = max(1, round(co2_saved_kg / CO2_ABSORBED_PER_TREE_PER_YEAR_KG))
    tree_word = "tree" if trees == 1 else "trees"
    return f"Equivalent to planting approximately {trees} {tree_word} per year"


def get_plant_co2_summary(plant_id: int, db: Session) -> dict:
    """
    Aggregate lifetime CO₂ savings for a single plant.

    Sums actual_output_kwh from plant-level readings only (inverter_id IS
    NULL) to avoid double-counting inverter sub-readings that mirror the
    same energy already rolled up at plant level.
    """
    total_kwh: float = (
        db.query(func.coalesce(func.sum(EnergyReading.actual_output_kwh), 0.0))
        .filter(
            EnergyReading.plant_id == plant_id,
            EnergyReading.inverter_id.is_(None),
        )
        .scalar()
    )

    co2_saved_kg = calculate_co2_saved(total_kwh)
    co2_saved_tonnes = co2_saved_kg / 1000.0

    return {
        "plant_id": plant_id,
        "total_kwh_generated": round(total_kwh, 2),
        "co2_saved_kg": round(co2_saved_kg, 2),
        "co2_saved_tonnes": round(co2_saved_tonnes, 3),
        "equivalence_statement": _tree_equivalence_statement(co2_saved_kg),
    }
