"""
app/schemas/readings.py — Pydantic schemas for the readings upload endpoints.

Three input methods all funnel into the same underlying data shape:
  ReadingsUploadPayload  — JSON body for manual entry and paste-from-spreadsheet
  (CSV upload uses FastAPI's UploadFile — no Pydantic model needed for the file itself)

The response is always ReadingsUploadResult regardless of input method,
giving the frontend a consistent surface to display the outcome.
"""

from datetime import date

from pydantic import BaseModel, Field, field_validator


class HourlyReadingInput(BaseModel):
    """One hour's worth of reading data supplied by the user."""

    hour: int = Field(..., ge=0, le=23, description="Hour of day (0–23)")
    actual_output_kwh: float = Field(
        ..., ge=0.0, description="Measured output — must be non-negative"
    )
    # Optional: if not provided, the backend auto-calculates it from the
    # plant's capacity and the solar irradiance model.
    expected_output_kwh: float | None = Field(
        None, ge=0.0, description="Expected output — auto-calculated if omitted"
    )


class ReadingsUploadPayload(BaseModel):
    """
    JSON body accepted by POST /plants/{id}/readings.

    Used for both manual single-day entry and paste-from-spreadsheet
    (where the frontend parses the pasted text and sends this shape).
    """

    date: date
    readings: list[HourlyReadingInput] = Field(
        ..., min_length=1, max_length=24, description="1–24 hourly readings for the given date"
    )
    overwrite: bool = Field(
        False,
        description=(
            "If True, delete any existing readings for this date before inserting. "
            "If False, skip hours that already have a reading (safe append)."
        ),
    )

    @field_validator("readings")
    @classmethod
    def no_duplicate_hours(cls, v: list[HourlyReadingInput]) -> list[HourlyReadingInput]:
        hours = [r.hour for r in v]
        if len(hours) != len(set(hours)):
            raise ValueError("readings contains duplicate hours — each hour must appear at most once")
        return v


class ReadingsUploadResult(BaseModel):
    """Summary returned after any upload operation (JSON, CSV, or paste)."""

    rows_inserted: int
    rows_skipped: int
    dates_covered: list[str]
    warnings: list[str] = []


class ExpectedOutputByHour(BaseModel):
    """
    Returned by GET /plants/{id}/readings/expected?date=YYYY-MM-DD.

    Allows the frontend to pre-populate the Expected column in the manual
    entry form without the user having to calculate it themselves.
    """

    plant_id: int
    date: str
    capacity_mw: float
    expected_by_hour: dict[int, float]  # {6: 1400.0, 7: 3200.0, ...}
