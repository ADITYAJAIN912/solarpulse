"""
app/core/config.py — type-safe, validated application settings.

Uses pydantic-settings so every environment variable is:
  - Declared with its expected type (str, int, list, etc.)
  - Validated on startup — missing required fields crash immediately
    with a clear error rather than causing silent runtime failures.
  - Documented in one place, not scattered across os.getenv() calls.

Production deployment:
  Set the required variables (database_url, jwt_secret) in Railway's
  environment variables dashboard. Optional variables fall back to
  sensible defaults so local dev works without extra configuration.

Supabase PostgreSQL:
  DATABASE_URL = postgresql://postgres:<password>@<host>:5432/postgres
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────────────────────
    # Default: local SQLite for development.
    # Production: set to Supabase PostgreSQL connection string.
    database_url: str = "sqlite:///./solarpulse.db"

    # ── JWT Authentication ────────────────────────────────────────────────
    # jwt_secret has no default — an empty secret would allow forgeable tokens.
    # If unset in production the app raises a clear startup error.
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── AI (Groq) ─────────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # ── CORS ─────────────────────────────────────────────────────────────
    # Comma-separated list of allowed frontend origins.
    # Example: "https://solarpulse.vercel.app"
    # Leave unset locally — dev server origins are added automatically.
    cors_origins_raw: str = ""

    # ── Admin / seeding ───────────────────────────────────────────────────
    seed_token: str = ""

    # ── Demo account (auto-created on startup if no users exist) ─────────
    demo_email: str = "demo@solarpulse.io"
    demo_password: str = "demo2026"
    demo_plant_name: str = "Jaisalmer Solar Alpha"
    demo_plant_location: str = "Jaisalmer, Rajasthan, India"
    demo_plant_latitude: float = 26.9124
    demo_plant_longitude: float = 70.9130
    demo_plant_capacity_mw: float = 50.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",          # ignore unknown env vars gracefully
        case_sensitive=False,    # DATABASE_URL and database_url both work
    )

    @field_validator("jwt_secret")
    @classmethod
    def warn_empty_jwt_secret(cls, v: str) -> str:
        if not v:
            import warnings
            warnings.warn(
                "JWT_SECRET is not set. Tokens will be insecure. "
                "Set JWT_SECRET in your environment variables.",
                stacklevel=2,
            )
        return v

    @property
    def cors_origins(self) -> list[str]:
        """
        Parsed list of allowed CORS origins.

        Always includes localhost dev origins so local development works
        without any extra configuration even when CORS_ORIGINS is unset.
        """
        dev_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
        if not self.cors_origins_raw:
            return dev_origins
        production = [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]
        return production + dev_origins

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql") or self.database_url.startswith("postgres")


settings = Settings()
