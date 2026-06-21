"""Initial schema — all tables.

Revision ID: 001
Revises:
Create Date: 2026-06-19 00:00:00.000000 UTC

Captures the full SolarPulse schema so that any fresh database
(local SQLite or production Supabase PostgreSQL) can be initialised
by running `alembic upgrade head` rather than relying on SQLAlchemy's
`create_all`, which is unsuitable for production because it cannot
apply incremental changes.
"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "plants",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("location", sa.String(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("capacity_mw", sa.Float(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "inverters",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("plant_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["plant_id"], ["plants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "energy_readings",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("plant_id", sa.Integer(), nullable=False),
        sa.Column("inverter_id", sa.Integer(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actual_output_kwh", sa.Float(), nullable=False),
        sa.Column("expected_output_kwh", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["inverter_id"], ["inverters.id"]),
        sa.ForeignKeyConstraint(["plant_id"], ["plants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_energy_readings_timestamp", "energy_readings", ["timestamp"])
    op.create_index("ix_energy_readings_inverter_id", "energy_readings", ["inverter_id"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("plant_id", sa.Integer(), nullable=False),
        sa.Column("for_date", sa.Date(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("performance_ratio", sa.Float(), nullable=True),
        sa.Column("risk_score", sa.Integer(), nullable=True),
        sa.Column("root_cause", sa.String(), nullable=True),
        sa.Column("confidence_level", sa.String(), nullable=True),
        sa.Column("ai_explanation", sa.Text(), nullable=True),
        sa.Column("suggested_action", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["plant_id"], ["plants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_for_date", "alerts", ["for_date"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_index("ix_energy_readings_inverter_id", table_name="energy_readings")
    op.drop_index("ix_energy_readings_timestamp", table_name="energy_readings")
    op.drop_table("energy_readings")
    op.drop_table("inverters")
    op.drop_table("plants")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
