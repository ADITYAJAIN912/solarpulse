"""Auth routes: user registration and login with JWT issuance."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.repositories.user_repository import user_repo
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse
from app.services.auth_service import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """
    Register a new user account.

    Checks that the email is not already taken, hashes the password with
    bcrypt, persists the new User row, and returns the safe UserResponse
    (no password_hash).  Returns 400 if the email is already registered.
    """
    if user_repo.email_exists(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    return user_repo.create(
        db,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> dict:
    """
    Authenticate a user and return a signed JWT access token.

    Looks up the user by email, verifies the bcrypt password, and on
    success issues a JWT embedding the user's id and email.  Returns 401
    for any credential mismatch — a deliberately generic message so that
    attackers cannot infer whether the email exists in the system.
    """
    user = user_repo.get_by_email(db, payload.email)

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"access_token": token, "token_type": "bearer"}
