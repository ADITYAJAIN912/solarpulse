"""
Performance Ratio calculation, risk scoring, and severity detection for SolarPulse.

All functions in this module are pure (no side effects) except
evaluate_plant_readings, which reads from and writes to the database.
Keeping the math functions side-effect-free means they are independently
testable and reusable in batch processing or background tasks later.
"""

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.reading import EnergyReading
from app.schemas.performance import FlaggedHour, PerformanceResponse

# ---------------------------------------------------------------------------
# Thresholds (match the PRD: warning < 85%, critical < 60%)
# ---------------------------------------------------------------------------

PR_WARNING_THRESHOLD: float = 85.0
PR_CRITICAL_THRESHOLD: float = 60.0


# ---------------------------------------------------------------------------
# Pure calculation functions
# ---------------------------------------------------------------------------

def calculate_pr(
    actual_output_kwh: float,
    expected_output_kwh: float,
) -> float | None:
    """
    Calculate Performance Ratio as a percentage.

    PR = (actual / expected) × 100.

    Returns None when expected_output_kwh is zero (nighttime hours where
    no generation is expected).  Callers must handle the None case rather
    than treating it as 0% — a zero-expected hour is not underperformance.
    """
    if expected_output_kwh == 0:
        return None
    return (actual_output_kwh / expected_output_kwh) * 100.0


def calculate_risk_score(pr: float | None) -> int | None:
    """
    Map a Performance Ratio percentage to a 0–100 risk score.

    The scale has three linear segments that mirror the PRD severity bands:

    PR ≥ 85%  →  risk  0–20  (healthy range)
      Linear from 0 at PR=100 (or above) to 20 at PR=85.
      Formula: risk = max(0, int(20 × (100 − PR) / 15))

    60% ≤ PR < 85%  →  risk 21–60  (warning range)
      Linear from 21 at PR=85 to 60 at PR=60.
      Formula: risk = int(21 + 39 × (85 − PR) / 25)

    PR < 60%  →  risk 61–100  (critical range)
      Linear from 61 at PR=60 to 100 at PR=0.
      Formula: risk = min(100, int(61 + 39 × (60 − PR) / 60))

    Using three segments (rather than one curve) gives ops teams an
    intuitive scale: below 20 = safe, 21-60 = investigate, 61+ = urgent.

    Returns None when PR is None (nighttime hours).
    """
    if pr is None:
        return None

    if pr >= PR_WARNING_THRESHOLD:
        return max(0, int(20 * (100.0 - pr) / 15.0))

    if pr >= PR_CRITICAL_THRESHOLD:
        return int(21 + 39 * (PR_WARNING_THRESHOLD - pr) / 25.0)

    return min(100, int(61 + 39 * (PR_CRITICAL_THRESHOLD - pr) / 60.0))


def determine_severity(pr: float | None) -> str | None:
    """
    Classify a Performance Ratio value into a human-readable severity level.

    Returns:
        "healthy"  if PR ≥ 85%
        "warning"  if 60% ≤ PR < 85%
        "critical" if PR < 60%
        None       if PR is None (nighttime — not applicable)
    """
    if pr is None:
        return None
    if pr >= PR_WARNING_THRESHOLD:
        return "healthy"
    if pr >= PR_CRITICAL_THRESHOLD:
        return "warning"
    return "critical"


# ---------------------------------------------------------------------------
# Database-level evaluation
# ---------------------------------------------------------------------------

def evaluate_plant_readings(
    plant_id: int,
    db: Session,
    eval_date: date,
) -> PerformanceResponse:
    """
    Evaluate a plant's full-day performance and persist an alert if needed.

    Steps
    -----
    1. Fetch all plant-level hourly readings (inverter_id IS NULL) for the
       given plant and date.
    2. Aggregate daytime-only totals (skip hours where expected = 0) to
       calculate an overall daily PR.
    3. Identify individual hours whose PR fell below the warning threshold.
    4. Upsert an Alert row for this plant+date if severity is warning or
       critical.  Upsert (not insert) prevents duplicate alert rows when
       the endpoint is called multiple times for the same day.

    Args:
        plant_id:  Database id of the Plant row.
        db:        Active SQLAlchemy session.
        eval_date: Calendar date to evaluate.

    Returns:
        PerformanceResponse with overall PR, risk score, severity, and
        a list of individual flagged hours.
    """
    day_start = datetime(
        eval_date.year, eval_date.month, eval_date.day, 0, 0, 0,
        tzinfo=timezone.utc,
    )
    day_end = datetime(
        eval_date.year, eval_date.month, eval_date.day, 23, 59, 59,
        tzinfo=timezone.utc,
    )

    readings: list[EnergyReading] = (
        db.query(EnergyReading)
        .filter(
            EnergyReading.plant_id == plant_id,
            EnergyReading.inverter_id.is_(None),
            EnergyReading.timestamp >= day_start,
            EnergyReading.timestamp <= day_end,
        )
        .order_by(EnergyReading.timestamp)
        .all()
    )

    # --- Aggregate daytime totals ---
    total_expected = sum(r.expected_output_kwh for r in readings if r.expected_output_kwh > 0)
    total_actual = sum(
        r.actual_output_kwh for r in readings if r.expected_output_kwh > 0
    )

    overall_pr = calculate_pr(total_actual, total_expected)
    risk_score = calculate_risk_score(overall_pr)
    severity = determine_severity(overall_pr)

    # --- Identify individually underperforming hours ---
    flagged_hours: list[FlaggedHour] = []
    for r in readings:
        hour_pr = calculate_pr(r.actual_output_kwh, r.expected_output_kwh)
        if hour_pr is None:
            continue
        hour_severity = determine_severity(hour_pr)
        if hour_severity in ("warning", "critical"):
            flagged_hours.append(FlaggedHour(
                hour=r.timestamp.hour,
                actual_output_kwh=r.actual_output_kwh,
                expected_output_kwh=r.expected_output_kwh,
                performance_ratio_pct=round(hour_pr, 2),
                severity=hour_severity,
            ))

    # --- Upsert alert when severity warrants it ---
    alert_id: int | None = None
    if severity in ("warning", "critical"):
        alert = (
            db.query(Alert)
            .filter(Alert.plant_id == plant_id, Alert.for_date == eval_date)
            .first()
        )
        if alert is None:
            alert = Alert(
                plant_id=plant_id,
                for_date=eval_date,
                severity=severity,
                performance_ratio=round(overall_pr, 2) if overall_pr is not None else None,
                risk_score=risk_score,
            )
            db.add(alert)
        else:
            alert.severity = severity
            alert.performance_ratio = round(overall_pr, 2) if overall_pr is not None else None
            alert.risk_score = risk_score
        db.commit()
        db.refresh(alert)
        alert_id = alert.id

    return PerformanceResponse(
        plant_id=plant_id,
        date=eval_date,
        overall_pr_pct=round(overall_pr, 2) if overall_pr is not None else None,
        risk_score=risk_score,
        severity=severity,
        flagged_hours=flagged_hours,
        alert_id=alert_id,
    )
