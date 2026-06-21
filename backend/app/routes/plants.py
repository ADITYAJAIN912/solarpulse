"""Plant CRUD and performance routes — all endpoints require a valid JWT."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.plant import Plant
from app.models.user import User
from app.repositories.plant_repository import plant_repo
from app.schemas.anomaly import AnomalyDetectionResponse
from app.schemas.performance import PerformanceResponse
from app.schemas.plant import PlantCreate, PlantResponse
from app.schemas.sustainability import SustainabilitySummary
from app.services.anomaly_detection import detect_plant_anomalies
from app.services.performance import evaluate_plant_readings
from app.services.sustainability import get_plant_co2_summary
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/plants", tags=["plants"])


@router.post("", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
def create_plant(
    payload: PlantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Plant:
    """
    Create a new solar plant owned by the authenticated user.

    owner_id is set server-side from the JWT — callers cannot assign
    plants to other users by manipulating the request body.
    """
    return plant_repo.create(db, payload=payload, owner_id=current_user.id)


@router.get("", response_model=list[PlantResponse])
def list_plants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Plant]:
    """
    Return all plants that belong to the authenticated user.

    Filters strictly by owner_id so users can only see their own assets —
    no plant owned by another account is ever included in the response.
    """
    return plant_repo.get_by_owner(db, current_user.id)


@router.get("/{plant_id}", response_model=PlantResponse)
def get_plant(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Plant:
    """
    Fetch a single plant by id with an ownership check.

    Two distinct error cases:
    - 404: the plant does not exist.
    - 403: the plant exists but belongs to a different user.
    """
    plant = plant_repo.get_by_id(db, plant_id)

    if plant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant {plant_id} not found.",
        )

    if plant.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this plant.",
        )

    return plant


def _get_owned_plant(plant_id: int, db: Session, current_user: User) -> Plant:
    """Shared ownership guard used by sub-resource routes."""
    plant = plant_repo.get_by_id(db, plant_id)
    if plant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant {plant_id} not found.",
        )
    if plant.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this plant.",
        )
    return plant


@router.get("/{plant_id}/performance", response_model=PerformanceResponse)
def get_plant_performance(
    plant_id: int,
    eval_date: date = Query(..., alias="date", description="Date to evaluate (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PerformanceResponse:
    """
    Evaluate a plant's daily Performance Ratio and return a severity assessment.

    If the overall daily PR is below the warning threshold (85%), an Alert
    row is upserted in the database for this plant + date.
    """
    _get_owned_plant(plant_id, db, current_user)
    return evaluate_plant_readings(plant_id=plant_id, db=db, eval_date=eval_date)


@router.get("/{plant_id}/anomalies", response_model=AnomalyDetectionResponse)
def get_plant_anomalies(
    plant_id: int,
    eval_date: date = Query(..., alias="date", description="Date to scan (YYYY-MM-DD)"),
    lookback_days: int = Query(
        14,
        ge=1,
        le=90,
        description="Days of history before eval_date used to train the model",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnomalyDetectionResponse:
    """
    Run Isolation Forest anomaly detection for a single plant and date.

    Trains on daytime plant-level readings from the lookback window, then
    flags individual hours on eval_date whose output profile deviates from
    the learned baseline.
    """
    _get_owned_plant(plant_id, db, current_user)
    return detect_plant_anomalies(
        plant_id=plant_id,
        db=db,
        eval_date=eval_date,
        lookback_days=lookback_days,
    )


@router.get("/{plant_id}/sustainability", response_model=SustainabilitySummary)
def get_plant_sustainability(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SustainabilitySummary:
    """
    Return lifetime CO2 savings for a plant based on total energy generated.

    Uses India's approximate grid emission factor (0.82 kg CO2/kWh) to estimate
    avoided emissions.  Only plant-level readings are summed so inverter-level
    rows are not double-counted.
    """
    _get_owned_plant(plant_id, db, current_user)
    return get_plant_co2_summary(plant_id=plant_id, db=db)
