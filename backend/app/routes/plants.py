"""Plant CRUD routes — all endpoints require a valid JWT."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.plant import Plant
from app.models.user import User
from app.schemas.plant import PlantCreate, PlantResponse
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
    plant = Plant(**payload.model_dump(), owner_id=current_user.id)
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


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
    return db.query(Plant).filter(Plant.owner_id == current_user.id).all()


@router.get("/{plant_id}", response_model=PlantResponse)
def get_plant(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Plant:
    """
    Fetch a single plant by id with an ownership check.

    Two distinct error cases are handled explicitly:
    - 404: the plant does not exist at all.
    - 403: the plant exists but belongs to a different user.  Returning 403
      instead of 404 here is intentional — the caller already knows their
      own plant ids from GET /plants, so leaking existence to the same
      authenticated user is acceptable and gives a clearer error.
    """
    plant = db.get(Plant, plant_id)

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
