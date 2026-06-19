"""Alert routes — access to performance alerts and their AI-generated diagnostics."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert
from app.models.plant import Plant
from app.models.user import User
from app.schemas.alert import AlertResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Alert:
    """
    Fetch a single alert by id, including all AI-generated diagnostic fields.

    Ownership is validated through the plant relationship, not via a direct
    owner_id on the Alert row itself.  The chain of trust is:

        alert.plant_id → Plant.id → Plant.owner_id == current_user.id

    This mirrors the pattern used across all plant sub-resource routes: a user
    can only access data that belongs to a plant they own.  Two distinct error
    cases are raised deliberately:

    - 404 if the alert does not exist — nothing to leak.
    - 403 if the alert exists but belongs to a plant owned by a different user.
      A 403 is preferred over 404 here because the alert id was presumably
      obtained from a prior authenticated call (e.g. via the performance
      endpoint), so confirming its existence does not reveal new information.
    """
    alert = db.get(Alert, alert_id)

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found.",
        )

    plant = db.get(Plant, alert.plant_id)

    if plant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plant {alert.plant_id} associated with alert {alert_id} not found.",
        )

    if plant.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this alert.",
        )

    return alert
