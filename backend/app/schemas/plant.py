"""Pydantic schemas for solar plant creation and API responses."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlantCreate(BaseModel):
    """
    Payload accepted by POST /plants.

    owner_id is intentionally absent — it is derived from the authenticated
    user's JWT so a caller can never create a plant on behalf of someone else.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., min_length=1, max_length=255)
    location: str = Field(..., min_length=1, max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    capacity_mw: float = Field(..., gt=0)


class PlantResponse(BaseModel):
    """Full plant representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: str
    latitude: float
    longitude: float
    capacity_mw: float
    owner_id: int
    created_at: datetime
