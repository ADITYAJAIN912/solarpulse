"""Pydantic schemas for plant performance evaluation responses."""

from datetime import date

from pydantic import BaseModel


class FlaggedHour(BaseModel):
    """A single daytime hour where actual output fell below the warning threshold."""

    hour: int
    actual_output_kwh: float
    expected_output_kwh: float
    performance_ratio_pct: float
    severity: str

class HourlyReading(BaseModel):
    """Hourly generation data used for chart visualizations."""

    hour: int
    actual_output_kwh: float
    expected_output_kwh: float

    
class PerformanceResponse(BaseModel):
    plant_id: int
    date: date
    overall_pr_pct: float | None
    risk_score: int | None
    severity: str | None

    hourly_readings: list[HourlyReading]

    flagged_hours: list[FlaggedHour]
    alert_id: int | None