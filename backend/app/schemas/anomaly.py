"""Pydantic schemas for Isolation Forest anomaly detection responses."""

from datetime import date

from pydantic import BaseModel


class AnomalousHour(BaseModel):
    """A single daytime hour flagged as anomalous by the Isolation Forest model."""

    hour: int
    actual_output_kwh: float
    expected_output_kwh: float
    performance_ratio_pct: float
    anomaly_score: float
    is_anomaly: bool


class AnomalyDetectionResponse(BaseModel):
    """
    ML-based anomaly scan for one plant on one calendar day.

    The Isolation Forest is trained on daytime plant-level readings from the
    lookback window immediately before eval_date.  Only hours where
    expected_output_kwh > 0 are considered (nighttime is excluded).

    model_fitted is False when there are too few historical samples to train.
    anomalous_hours lists every hour where the model predicted outlier (-1).
    """

    plant_id: int
    date: date
    lookback_days: int
    training_samples: int
    model_fitted: bool
    anomalous_hours: list[AnomalousHour]
