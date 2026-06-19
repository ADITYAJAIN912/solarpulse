import os

from dotenv import load_dotenv

load_dotenv()

# Application settings loaded from environment variables.
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./solarpulse.db")
JWT_SECRET: str = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Comma-separated list of allowed frontend origins for CORS.
# In production set this to your Vercel URL, e.g.:
#   CORS_ORIGINS=https://solarpulse.vercel.app
# Leave unset locally — the fallback list covers localhost dev servers.
_cors_env: str = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS: list[str] = (
    [o.strip() for o in _cors_env.split(",") if o.strip()]
    if _cors_env
    else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
)
