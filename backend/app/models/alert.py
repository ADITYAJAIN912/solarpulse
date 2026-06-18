"""Performance alerts when a plant's output falls below expected thresholds."""

from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.plant import Plant


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plant_id: Mapped[int] = mapped_column(ForeignKey("plants.id"), nullable=False)
    for_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    performance_ratio: Mapped[float | None] = mapped_column(nullable=True)
    risk_score: Mapped[int | None] = mapped_column(nullable=True)
    root_cause: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence_level: Mapped[str | None] = mapped_column(String, nullable=True)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    plant: Mapped["Plant"] = relationship(back_populates="alerts")
