"""
Hourly energy generation readings per plant and per inverter.

Plant-level readings (inverter_id=None) store the aggregated output for
the whole site and are used for Performance Ratio calculation and alerting.
Inverter-level readings (inverter_id set) allow fault localisation — if a
plant-level PR drops, the inverter readings reveal which sub-unit is at fault.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.inverter import Inverter
    from app.models.plant import Plant


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plant_id: Mapped[int] = mapped_column(ForeignKey("plants.id"), nullable=False)
    inverter_id: Mapped[int | None] = mapped_column(
        ForeignKey("inverters.id"), nullable=True, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    actual_output_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    expected_output_kwh: Mapped[float] = mapped_column(Float, nullable=False)

    plant: Mapped["Plant"] = relationship(back_populates="energy_readings")
    inverter: Mapped["Inverter | None"] = relationship(back_populates="energy_readings")
