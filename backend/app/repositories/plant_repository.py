"""
app/repositories/plant_repository.py — data-access layer for Plant records.

Centralises all Plant queries so routes stay thin.
All write operations take keyword-only arguments to prevent accidental
positional-argument mismatches.
"""

from sqlalchemy.orm import Session

from app.models.plant import Plant
from app.schemas.plant import PlantCreate


class PlantRepository:
    """CRUD operations for Plant, scoped to a SQLAlchemy session."""

    def get_by_id(self, db: Session, plant_id: int) -> Plant | None:
        """Fetch a plant by primary key. Returns None if not found."""
        return db.get(Plant, plant_id)

    def get_by_owner(self, db: Session, owner_id: int) -> list[Plant]:
        """Return all plants owned by the given user, ordered by creation date."""
        return (
            db.query(Plant)
            .filter(Plant.owner_id == owner_id)
            .order_by(Plant.created_at.asc())
            .all()
        )

    def create(self, db: Session, *, payload: PlantCreate, owner_id: int) -> Plant:
        """
        Persist a new plant and return the refreshed ORM instance.

        The owner_id is injected by the route — never trusted from the
        request payload — enforcing the ownership model at the data layer.
        """
        plant = Plant(
            name=payload.name,
            location=payload.location,
            latitude=payload.latitude,
            longitude=payload.longitude,
            capacity_mw=payload.capacity_mw,
            owner_id=owner_id,
        )
        db.add(plant)
        db.commit()
        db.refresh(plant)
        return plant

    def count_for_owner(self, db: Session, owner_id: int) -> int:
        """Count plants owned by a user (used for quota checks and seeding decisions)."""
        return db.query(Plant).filter(Plant.owner_id == owner_id).count()

    def get_all(self, db: Session) -> list[Plant]:
        """Return every plant in the database (admin / seeding use only)."""
        return db.query(Plant).all()


plant_repo = PlantRepository()
