"""Hourly energy generation readings with actual vs expected output per plant."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.plant import Plant


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plant_id: Mapped[int] = mapped_column(ForeignKey("plants.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    actual_output_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    expected_output_kwh: Mapped[float] = mapped_column(Float, nullable=False)

    plant: Mapped["Plant"] = relationship(back_populates="energy_readings")
