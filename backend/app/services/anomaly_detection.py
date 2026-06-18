"""
Isolation Forest anomaly detection for SolarPulse.

Complements the rule-based thresholds in performance.py with an unsupervised
ML layer that learns each plant's normal hourly output profile from recent
history.  Rule-based detection catches aggregate daily underperformance;
Isolation Forest can flag individual hours whose PR deviates from the plant's
learned baseline even when the daily aggregate still looks acceptable.

Architecture
------------
- Pure functions (feature extraction, model training, prediction) are
  side-effect-free and independently testable.
- detect_plant_anomalies is the single database entry point, mirroring
  evaluate_plant_readings in performance.py.

Feature vector (per daytime hour)
---------------------------------
  hour_norm              — hour of day scaled to [0, 1] over the 6 AM–6 PM window
  pr_pct                 — (actual / expected) × 100
  pr_deviation           — pr_pct minus the mean PR at that hour in training history

Training uses plant-level readings (inverter_id IS NULL) from the lookback
window before eval_date.  Night hours (expected = 0) are excluded from both
training and prediction so the model never sees the 0/0 nighttime artefact.
"""

from datetime import date, datetime, timedelta, timezone

import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session

from app.models.reading import EnergyReading
from app.schemas.anomaly import AnomalousHour, AnomalyDetectionResponse
from app.services.performance import calculate_pr
from app.services.solar_simulator import SUNRISE_HOUR, SUNSET_HOUR

# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------

DEFAULT_LOOKBACK_DAYS: int = 14
DEFAULT_CONTAMINATION: float = 0.05
MIN_TRAINING_SAMPLES: int = 10  # ~one solar day (hours 7–17 have expected > 0)
# Hours whose PR falls this far below the learned hourly baseline are always
# flagged, even if the Isolation Forest score is borderline.  Complements IF
# for sharp single-hour faults (e.g. one inverter trip at solar noon).
PR_DEVIATION_ANOMALY_THRESHOLD: float = -12.0
RANDOM_STATE: int = 42


# ---------------------------------------------------------------------------
# Feature engineering (pure)
# ---------------------------------------------------------------------------

def _hour_norm(hour: int) -> float:
    """Map hour-of-day to [0, 1] over the productive solar window."""
    return (hour - SUNRISE_HOUR) / (SUNSET_HOUR - SUNRISE_HOUR)


def _compute_hour_pr_baselines(readings: list[EnergyReading]) -> dict[int, float]:
    """Mean PR per hour-of-day from historical daytime readings."""
    hour_prs: dict[int, list[float]] = {}
    for r in readings:
        if r.expected_output_kwh <= 0:
            continue
        pr = (r.actual_output_kwh / r.expected_output_kwh) * 100.0
        hour_prs.setdefault(r.timestamp.hour, []).append(pr)
    return {hour: sum(values) / len(values) for hour, values in hour_prs.items()}


def build_feature_row(
    hour: int,
    actual_output_kwh: float,
    expected_output_kwh: float,
    hour_baselines: dict[int, float],
) -> list[float]:
    """
    Build a single feature vector for one daytime reading.

    Returns [hour_norm, pr_pct, pr_deviation_from_hour_baseline].
    pr_deviation captures how far this hour's PR drifts from the plant's
    learned norm at that time of day — the key signal for inverter faults.
    """
    pr = (actual_output_kwh / expected_output_kwh) * 100.0
    baseline = hour_baselines.get(hour, pr)
    pr_deviation = pr - baseline
    return [_hour_norm(hour), pr, pr_deviation]


def build_feature_matrix(
    readings: list[EnergyReading],
    hour_baselines: dict[int, float] | None = None,
) -> np.ndarray:
    """
    Convert daytime EnergyReading rows into a 2-D feature matrix.

    Skips any row where expected_output_kwh is zero (nighttime).
    hour_baselines must be supplied when scoring eval-day readings;
    when None, baselines are computed from the readings themselves (training).
    """
    daytime = [r for r in readings if r.expected_output_kwh > 0]
    if not daytime:
        return np.empty((0, 3))

    baselines = hour_baselines if hour_baselines is not None else _compute_hour_pr_baselines(daytime)

    rows: list[list[float]] = []
    for r in daytime:
        rows.append(
            build_feature_row(
                hour=r.timestamp.hour,
                actual_output_kwh=r.actual_output_kwh,
                expected_output_kwh=r.expected_output_kwh,
                hour_baselines=baselines,
            )
        )
    return np.array(rows, dtype=np.float64)


def train_isolation_forest(
    feature_matrix: np.ndarray,
    contamination: float = DEFAULT_CONTAMINATION,
) -> IsolationForest | None:
    """
    Fit an Isolation Forest on historical feature rows.

    Returns None when there are fewer than MIN_TRAINING_SAMPLES rows —
    sklearn needs a meaningful sample size to produce stable boundaries.

    contamination is the expected fraction of outliers in the training set.
    0.05 (5%) is appropriate for mostly-healthy historical data with
    occasional weather noise.
    """
    if feature_matrix.shape[0] < MIN_TRAINING_SAMPLES:
        return None

    model = IsolationForest(
        contamination=contamination,
        random_state=RANDOM_STATE,
        n_estimators=100,
    )
    model.fit(feature_matrix)
    return model


def predict_anomalies(
    model: IsolationForest,
    readings: list[EnergyReading],
    hour_baselines: dict[int, float],
    training_scores: np.ndarray,
    contamination: float = DEFAULT_CONTAMINATION,
) -> list[AnomalousHour]:
    """
    Score eval-day readings and return one AnomalousHour per daytime hour.

    Anomaly threshold is calibrated from training score distribution: any
    eval hour scoring below the (contamination × 100) percentile of training
    scores is flagged.  This is more stable than sklearn predict() on small
    eval batches where random weather noise can dominate.
    """
    daytime = [r for r in readings if r.expected_output_kwh > 0]
    if not daytime:
        return []

    matrix = build_feature_matrix(daytime, hour_baselines=hour_baselines)
    scores = model.score_samples(matrix)
    percentile_cutoff = float(np.percentile(training_scores, contamination * 100))
    # With small training sets, percentile alone can be too conservative; blend
    # with a statistical bound so clear faults still surface.
    statistical_cutoff = float(
        np.mean(training_scores) - 1.5 * np.std(training_scores)
    )
    cutoff = max(percentile_cutoff, statistical_cutoff)

    results: list[AnomalousHour] = []
    for reading, score in zip(daytime, scores):
        pr = calculate_pr(reading.actual_output_kwh, reading.expected_output_kwh)
        baseline = hour_baselines.get(reading.timestamp.hour, pr if pr is not None else 100.0)
        pr_deviation = (pr - baseline) if pr is not None else 0.0
        is_anomaly = (
            float(score) < cutoff
            or pr_deviation < PR_DEVIATION_ANOMALY_THRESHOLD
        )
        results.append(AnomalousHour(
            hour=reading.timestamp.hour,
            actual_output_kwh=reading.actual_output_kwh,
            expected_output_kwh=reading.expected_output_kwh,
            performance_ratio_pct=round(pr, 2) if pr is not None else 0.0,
            anomaly_score=round(float(score), 4),
            is_anomaly=is_anomaly,
        ))
    return results


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def _fetch_plant_readings(
    plant_id: int,
    db: Session,
    start: datetime,
    end: datetime,
) -> list[EnergyReading]:
    """Return plant-level readings (inverter_id IS NULL) in [start, end]."""
    return (
        db.query(EnergyReading)
        .filter(
            EnergyReading.plant_id == plant_id,
            EnergyReading.inverter_id.is_(None),
            EnergyReading.timestamp >= start,
            EnergyReading.timestamp <= end,
        )
        .order_by(EnergyReading.timestamp)
        .all()
    )


def detect_plant_anomalies(
    plant_id: int,
    db: Session,
    eval_date: date,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    contamination: float = DEFAULT_CONTAMINATION,
) -> AnomalyDetectionResponse:
    """
    Train an Isolation Forest on recent history and scan eval_date for outliers.

    Steps
    -----
    1. Fetch plant-level readings from (eval_date − lookback_days) through
       (eval_date − 1 day) as the training window.
    2. Fit Isolation Forest on daytime feature rows from that window.
    3. Predict on eval_date daytime hours.
    4. Return all hours with their scores; is_anomaly=True for outliers.

    This function does not write to the database — alerting remains the
    responsibility of evaluate_plant_readings in performance.py.
    """
    day_start = datetime(
        eval_date.year, eval_date.month, eval_date.day,
        0, 0, 0, tzinfo=timezone.utc,
    )
    day_end = datetime(
        eval_date.year, eval_date.month, eval_date.day,
        23, 59, 59, tzinfo=timezone.utc,
    )

    train_end = day_start - timedelta(seconds=1)
    train_start = datetime(
        (eval_date - timedelta(days=lookback_days)).year,
        (eval_date - timedelta(days=lookback_days)).month,
        (eval_date - timedelta(days=lookback_days)).day,
        0, 0, 0, tzinfo=timezone.utc,
    )

    training_readings = _fetch_plant_readings(plant_id, db, train_start, train_end)
    eval_readings = _fetch_plant_readings(plant_id, db, day_start, day_end)

    training_matrix = build_feature_matrix(training_readings)
    training_samples = training_matrix.shape[0]
    hour_baselines = _compute_hour_pr_baselines(training_readings)

    model = train_isolation_forest(training_matrix, contamination=contamination)
    if model is None:
        return AnomalyDetectionResponse(
            plant_id=plant_id,
            date=eval_date,
            lookback_days=lookback_days,
            training_samples=training_samples,
            model_fitted=False,
            anomalous_hours=[],
        )

    training_scores = model.score_samples(training_matrix)
    scored_hours = predict_anomalies(
        model, eval_readings, hour_baselines, training_scores, contamination
    )
    anomalous_hours = [h for h in scored_hours if h.is_anomaly]

    return AnomalyDetectionResponse(
        plant_id=plant_id,
        date=eval_date,
        lookback_days=lookback_days,
        training_samples=training_samples,
        model_fitted=True,
        anomalous_hours=anomalous_hours,
    )
