"""
Individual DC-to-AC inverters within a solar plant.

A real utility-scale plant has many inverters (one per string array or
combiner block). Modelling them separately lets the system detect that
a fault is isolated to one inverter rather than the whole plant — a
critical distinction for maintenance dispatch.
"""

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.plant import Plant
    from app.models.reading import EnergyReading


class Inverter(Base):
    __tablename__ = "inverters"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plant_id: Mapped[int] = mapped_column(ForeignKey("plants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    plant: Mapped["Plant"] = relationship(back_populates="inverters")
    energy_readings: Mapped[list["EnergyReading"]] = relationship(
        back_populates="inverter"
    )
