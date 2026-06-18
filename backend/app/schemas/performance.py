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


class PerformanceResponse(BaseModel):
    """
    Daily performance summary for a single plant.

    overall_pr is calculated from daytime hours only (expected_output_kwh > 0).
    risk_score and severity reflect the full day's aggregate performance.
    flagged_hours lists every hour that individually fell below 85% PR.
    alert_id is set when an Alert row was created or updated for this evaluation.
    """

    plant_id: int
    date: date
    overall_pr_pct: float | None
    risk_score: int | None
    severity: str | None
    flagged_hours: list[FlaggedHour]
    alert_id: int | None
