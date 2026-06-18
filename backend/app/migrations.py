"""Lightweight SQLite migrations for additive schema changes."""

from sqlalchemy import inspect, text

from app.config import DATABASE_URL
from app.database import engine


def run_migrations() -> None:
    """
    Apply additive column migrations that create_all() does not handle.

    SQLite cannot ALTER existing tables via SQLAlchemy metadata refresh, so
    new nullable columns on live databases are added explicitly here.
    """
    if not DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "alerts" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("alerts")}
    additions = {
        "root_cause": "VARCHAR",
        "confidence_level": "VARCHAR",
    }

    with engine.begin() as conn:
        for column, col_type in additions.items():
            if column not in existing:
                conn.execute(text(f"ALTER TABLE alerts ADD COLUMN {column} {col_type}"))
