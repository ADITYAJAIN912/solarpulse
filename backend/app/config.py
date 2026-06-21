"""
app/config.py — backward-compatible re-export.

All application code that previously imported bare constants from this
module (e.g. `from app.config import JWT_SECRET`) continues to work
without change.  The canonical source of truth is now app/core/config.py.
"""

from app.core.config import settings

DATABASE_URL = settings.database_url
JWT_SECRET = settings.jwt_secret
JWT_ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
GROQ_API_KEY = settings.groq_api_key
GROQ_MODEL = settings.groq_model
CORS_ORIGINS = settings.cors_origins
SEED_TOKEN = settings.seed_token
