"""Pydantic schemas for user registration, login, and API responses."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    """Payload accepted by POST /auth/register."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str


class UserLogin(BaseModel):
    """Payload accepted by POST /auth/login."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Safe representation of a user returned by the API — never includes password_hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    created_at: datetime


class Token(BaseModel):
    """JWT token envelope returned after a successful login."""

    access_token: str
    token_type: str = "bearer"
