"""
alembic/env.py — Alembic migration environment.

Key design decisions:
- DATABASE_URL is read from app/core/config.py (pydantic-settings),
  so the same alembic.ini works for SQLite (local) and PostgreSQL (production).
- All SQLAlchemy models are imported here so that `autogenerate` can
  detect schema changes when running `alembic revision --autogenerate`.
- Offline mode (--sql flag) generates raw SQL suitable for auditing or
  applying to a database without a live connection.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Import settings first so DATABASE_URL is available
from app.core.config import settings

# Import Base and ALL models so Alembic's autogenerate can inspect them
from app.database import Base  # noqa: F401
import app.models.user         # noqa: F401
import app.models.plant        # noqa: F401
import app.models.inverter     # noqa: F401
import app.models.reading      # noqa: F401
import app.models.alert        # noqa: F401

# Alembic Config object — gives access to alembic.ini values
config = context.config

# Override sqlalchemy.url with value from our settings
config.set_main_option("sqlalchemy.url", settings.database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    Configures the context with just a URL (no Engine).
    Useful for generating a SQL script to apply manually.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    Creates an Engine and runs migrations against the live database.
    This is called automatically during application startup.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
