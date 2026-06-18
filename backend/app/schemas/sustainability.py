"""Pydantic schemas for plant sustainability / CO₂ savings responses."""

from pydantic import BaseModel


class SustainabilitySummary(BaseModel):
    """Lifetime CO₂ savings estimate for a single solar plant."""

    plant_id: int
    total_kwh_generated: float
    co2_saved_kg: float
    co2_saved_tonnes: float
    equivalence_statement: str
