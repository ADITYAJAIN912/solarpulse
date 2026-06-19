"""
Shared pytest fixtures for SolarPulse backend tests.

Isolation strategy
------------------
Every test function gets its own, brand-new in-memory SQLite database.
The real `solarpulse.db` file is never touched.

How it works:
1. A fresh SQLAlchemy engine pointing at `sqlite:///:memory:` is created.
2. `Base.metadata.create_all` builds the full schema in that engine.
3. FastAPI's `get_db` dependency is overridden to yield sessions from the
   test engine rather than the production one.
4. After the test, `Base.metadata.drop_all` cleans up and the override is
   cleared so no state leaks between tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import all models so SQLAlchemy's metadata registry knows about every
# table before we call create_all. Without this, tables that are only
# referenced via relationships (e.g. Inverter, EnergyReading) would be
# missing and FK constraints would fail.
from app.models import Alert, EnergyReading, Inverter, Plant, User  # noqa: F401

from app.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture()
def client() -> TestClient:
    """
    FastAPI TestClient backed by an isolated in-memory SQLite database.

    Scope is 'function' (default) so every test starts with empty tables.
    """
    # StaticPool is required for SQLite in-memory databases: without it,
    # each new connection gets a fresh empty database, so tables created
    # by create_all disappear before any request session can use them.
    # StaticPool forces every session to reuse the same underlying
    # connection, keeping the in-memory schema alive for the full test.
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    """
    Register a test user and return ready-to-use Authorization headers.

    Returns {"Authorization": "Bearer <token>"} so any test that needs
    an authenticated request can just pass `headers=auth_headers`.
    """
    credentials = {"email": "fixture_user@solarpulse.io", "password": "fixturepass99"}
    client.post("/auth/register", json=credentials)
    r = client.post("/auth/login", json=credentials)
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
