"""
app/routes/readings.py — User-supplied energy reading upload endpoints.

All endpoints require JWT authentication and enforce plant ownership —
a user can only upload readings for plants they own.

Endpoints:
  POST /plants/{id}/readings
    Accept JSON payload (manual entry or paste-from-spreadsheet).

  POST /plants/{id}/readings/upload
    Accept a multipart CSV file upload.

  GET  /plants/{id}/readings/expected?date=YYYY-MM-DD
    Return auto-calculated expected output per hour so the frontend
    can pre-populate the Expected column without user calculation.

  GET  /plants/{id}/readings/template?date=YYYY-MM-DD
    Return a downloadable CSV template with Expected pre-filled and
    Actual left blank for the user to complete.

Design notes:
  - Expected output is auto-calculated using calculate_expected_output_kwh
    whenever the user doesn't provide it. This reduces the data the user
    needs to supply from 2 columns to 1 (actual only).
  - Overwrite behaviour is explicit and opt-in. Default is safe append:
    existing rows for a date are never silently deleted.
  - CSV validation returns row-level error messages so users can fix
    their data without guessing which row caused the problem.
"""

import csv
import io
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.reading import EnergyReading
from app.models.user import User
from app.repositories.plant_repository import plant_repo
from app.schemas.readings import (
    ExpectedOutputByHour,
    HourlyReadingInput,
    ReadingsUploadPayload,
    ReadingsUploadResult,
)
from app.services.solar_simulator import (
    SUNRISE_HOUR,
    SUNSET_HOUR,
    calculate_expected_output_kwh,
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/plants", tags=["readings"])

DAYLIGHT_HOURS = list(range(SUNRISE_HOUR, SUNSET_HOUR))  # [6, 7, ..., 17]
MAX_CSV_BYTES = 5 * 1024 * 1024  # 5 MB


# ── Shared helpers ────────────────────────────────────────────────────────────

def _get_owned_plant(plant_id: int, db: Session, current_user: User):
    plant = plant_repo.get_by_id(db, plant_id)
    if plant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plant {plant_id} not found.")
    if plant.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return plant


def _delete_existing_for_date(db: Session, plant_id: int, for_date: date) -> None:
    """Delete all plant-level (non-inverter) readings for a given date."""
    day_start = datetime(for_date.year, for_date.month, for_date.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end   = datetime(for_date.year, for_date.month, for_date.day, 23, 59, 59, tzinfo=timezone.utc)
    db.query(EnergyReading).filter(
        EnergyReading.plant_id == plant_id,
        EnergyReading.inverter_id == None,  # noqa: E711 — plant-level only
        EnergyReading.timestamp >= day_start,
        EnergyReading.timestamp <= day_end,
    ).delete(synchronize_session=False)


def _existing_hours_for_date(db: Session, plant_id: int, for_date: date) -> set[int]:
    """Return the set of hours that already have a reading for this plant+date."""
    day_start = datetime(for_date.year, for_date.month, for_date.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end   = datetime(for_date.year, for_date.month, for_date.day, 23, 59, 59, tzinfo=timezone.utc)
    rows = db.query(EnergyReading.timestamp).filter(
        EnergyReading.plant_id == plant_id,
        EnergyReading.inverter_id == None,  # noqa: E711
        EnergyReading.timestamp >= day_start,
        EnergyReading.timestamp <= day_end,
    ).all()
    return {r.timestamp.hour for r in rows}


def _insert_readings(
    db: Session,
    plant_id: int,
    capacity_mw: float,
    for_date: date,
    readings: list[HourlyReadingInput],
    overwrite: bool,
) -> ReadingsUploadResult:
    """
    Core insert logic shared by all three upload methods.

    Returns a summary of what was inserted vs skipped.
    """
    if overwrite:
        _delete_existing_for_date(db, plant_id, for_date)
        existing_hours: set[int] = set()
    else:
        existing_hours = _existing_hours_for_date(db, plant_id, for_date)

    inserted = 0
    skipped = 0

    for r in readings:
        if r.hour in existing_hours:
            skipped += 1
            continue

        expected = (
            r.expected_output_kwh
            if r.expected_output_kwh is not None
            else calculate_expected_output_kwh(capacity_mw, r.hour)
        )

        ts = datetime(
            for_date.year, for_date.month, for_date.day,
            r.hour, 0, 0, tzinfo=timezone.utc,
        )

        db.add(EnergyReading(
            plant_id=plant_id,
            inverter_id=None,
            timestamp=ts,
            actual_output_kwh=round(r.actual_output_kwh, 3),
            expected_output_kwh=round(expected, 3),
        ))
        inserted += 1

    db.commit()

    return ReadingsUploadResult(
        rows_inserted=inserted,
        rows_skipped=skipped,
        dates_covered=[str(for_date)],
    )


# ── Endpoint: get expected output by hour ────────────────────────────────────

@router.get("/{plant_id}/readings/expected", response_model=ExpectedOutputByHour)
def get_expected_output(
    plant_id: int,
    query_date: date = Query(..., alias="date", description="Date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpectedOutputByHour:
    """
    Return auto-calculated expected output (kWh) for each daylight hour.

    Used by the frontend manual entry form to pre-populate the Expected
    column so users only need to enter their actual inverter readings.
    """
    plant = _get_owned_plant(plant_id, db, current_user)

    expected_by_hour = {
        h: calculate_expected_output_kwh(plant.capacity_mw, h)
        for h in DAYLIGHT_HOURS
    }

    return ExpectedOutputByHour(
        plant_id=plant_id,
        date=str(query_date),
        capacity_mw=plant.capacity_mw,
        expected_by_hour=expected_by_hour,
    )


# ── Endpoint: download CSV template ──────────────────────────────────────────

@router.get("/{plant_id}/readings/template")
def download_template(
    plant_id: int,
    query_date: date = Query(date.today(), alias="date", description="Date to pre-fill (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """
    Return a CSV template with Expected pre-filled and Actual left blank.

    The user fills in actual_output_kwh from their inverter display or
    export, then uploads the completed file via POST /plants/{id}/readings/upload.
    """
    plant = _get_owned_plant(plant_id, db, current_user)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "hour", "actual_output_kwh", "expected_output_kwh"])

    for h in DAYLIGHT_HOURS:
        expected = calculate_expected_output_kwh(plant.capacity_mw, h)
        writer.writerow([str(query_date), h, "", round(expected, 2)])

    output.seek(0)
    filename = f"solarpulse_template_{plant_id}_{query_date}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Endpoint: manual / paste JSON upload ─────────────────────────────────────

@router.post("/{plant_id}/readings", response_model=ReadingsUploadResult, status_code=status.HTTP_201_CREATED)
def upload_readings_json(
    plant_id: int,
    payload: ReadingsUploadPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReadingsUploadResult:
    """
    Accept JSON reading data for a single date.

    Used by:
      - Manual entry form (user types values in the hour-by-hour table)
      - Paste-from-spreadsheet (frontend parses pasted text and sends this shape)

    expected_output_kwh is optional per row — omit it and the backend
    auto-calculates it from the plant's capacity and irradiance model.
    """
    plant = _get_owned_plant(plant_id, db, current_user)
    return _insert_readings(db, plant.id, plant.capacity_mw, payload.date, payload.readings, payload.overwrite)


# ── Endpoint: CSV file upload ─────────────────────────────────────────────────

@router.post("/{plant_id}/readings/upload", response_model=ReadingsUploadResult, status_code=status.HTTP_201_CREATED)
async def upload_readings_csv(
    plant_id: int,
    file: UploadFile,
    overwrite: bool = Query(False, description="Replace existing readings for the same dates"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReadingsUploadResult:
    """
    Accept a CSV file upload.

    Required columns: date, hour, actual_output_kwh
    Optional column:  expected_output_kwh (auto-calculated if missing)

    The file is parsed in memory — never written to disk.
    Maximum file size: 5 MB (~150,000 rows — more than enough for any real use).
    """
    plant = _get_owned_plant(plant_id, db, current_user)

    # ── Size guard ────────────────────────────────────────────────────────────
    raw = await file.read()
    if len(raw) > MAX_CSV_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {MAX_CSV_BYTES // (1024*1024)} MB.",
        )

    # ── Parse ─────────────────────────────────────────────────────────────────
    try:
        text = raw.decode("utf-8-sig")  # utf-8-sig strips BOM from Excel exports
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(text))

    required_cols = {"date", "hour", "actual_output_kwh"}
    if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {', '.join(sorted(required_cols))}. "
                   f"Found: {', '.join(reader.fieldnames or [])}",
        )

    has_expected_col = "expected_output_kwh" in (reader.fieldnames or [])

    # Group rows by date so we can call _insert_readings once per date
    by_date: dict[date, list[HourlyReadingInput]] = {}
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):  # row 1 is header
        try:
            row_date = date.fromisoformat(row["date"].strip())
        except ValueError:
            errors.append(f"Row {row_num}: invalid date '{row['date']}' — expected YYYY-MM-DD")
            continue

        try:
            hour = int(row["hour"].strip())
            if not 0 <= hour <= 23:
                raise ValueError()
        except ValueError:
            errors.append(f"Row {row_num}: invalid hour '{row['hour']}' — expected 0–23")
            continue

        try:
            actual = float(row["actual_output_kwh"].strip())
            if actual < 0:
                raise ValueError()
        except ValueError:
            errors.append(f"Row {row_num}: invalid actual_output_kwh '{row['actual_output_kwh']}' — must be a non-negative number")
            continue

        expected: float | None = None
        if has_expected_col and row.get("expected_output_kwh", "").strip():
            try:
                expected = float(row["expected_output_kwh"].strip())
                if expected < 0:
                    raise ValueError()
            except ValueError:
                errors.append(f"Row {row_num}: invalid expected_output_kwh '{row['expected_output_kwh']}' — must be a non-negative number")
                continue

        by_date.setdefault(row_date, []).append(
            HourlyReadingInput(hour=hour, actual_output_kwh=actual, expected_output_kwh=expected)
        )

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": f"{len(errors)} validation error(s) in CSV", "errors": errors[:20]},
        )

    if not by_date:
        raise HTTPException(status_code=400, detail="No valid data rows found in the uploaded file.")

    # ── Insert grouped by date ────────────────────────────────────────────────
    total_inserted = 0
    total_skipped = 0
    all_dates: list[str] = []

    for for_date, readings in by_date.items():
        result = _insert_readings(db, plant.id, plant.capacity_mw, for_date, readings, overwrite)
        total_inserted += result.rows_inserted
        total_skipped += result.rows_skipped
        all_dates.append(str(for_date))

    return ReadingsUploadResult(
        rows_inserted=total_inserted,
        rows_skipped=total_skipped,
        dates_covered=sorted(all_dates),
    )
