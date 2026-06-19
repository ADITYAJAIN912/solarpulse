"""Pydantic schemas for alert API responses."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    """
    Full representation of a performance alert returned by the API.

    Includes all AI-generated diagnostic fields (root_cause, confidence_level,
    ai_explanation, suggested_action) that are populated by the AI insights
    service when an alert is created or updated.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    plant_id: int
    for_date: date
    severity: str
    performance_ratio: float | None
    risk_score: int | None
    root_cause: str | None
    confidence_level: str | None
    ai_explanation: str | None
    suggested_action: str | None
    created_at: datetime
