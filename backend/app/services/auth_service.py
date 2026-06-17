"""
Auth service for SolarPulse.

Centralises all security primitives — password hashing and JWT lifecycle —
so no route or model ever handles raw cryptographic operations directly.
Keeping these functions here makes it trivial to swap the hashing algorithm
or token strategy without touching route code.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, JWT_SECRET


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.

    bcrypt is deliberately slow (configurable cost factor) to make
    brute-force attacks impractical. The returned utf-8 string embeds
    the algorithm identifier, cost factor, and salt — safe to store
    directly in the database column.
    """
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check whether a plain-text password matches a stored bcrypt hash.

    Returns True on match, False on mismatch. bcrypt.checkpw uses
    constant-time comparison internally to prevent timing-based attacks.
    """
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a signed JWT access token.

    The token payload contains the caller-supplied claims (typically
    ``sub`` for user id and ``email``) plus an ``exp`` expiry claim.
    If ``expires_delta`` is not provided the token expires in
    ``ACCESS_TOKEN_EXPIRE_MINUTES`` minutes (read from .env).

    Raises:
        ValueError: if JWT_SECRET is empty, which would produce a trivially
                    forgeable token.
    """
    if not JWT_SECRET:
        raise ValueError(
            "JWT_SECRET is not set. Add it to your .env file before issuing tokens."
        )

    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta is not None
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expire

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT access token.

    Returns the decoded payload dictionary on success.

    Raises:
        ValueError: if the token has expired (caller should return HTTP 401).
        ValueError: if the token signature is invalid or the token is
                    malformed (caller should return HTTP 401).
    """
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise ValueError("Token has expired. Please log in again.")
    except JWTError:
        raise ValueError("Invalid token. Authentication failed.")
