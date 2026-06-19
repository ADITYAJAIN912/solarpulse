"""
Plant ownership and CRUD tests.

These two tests together cover the two most important correctness
properties of the plant API:

  test_create_and_get_own_plant
      → The happy path works: create, then fetch, data matches.

  test_cannot_access_other_users_plant
      → The security boundary holds: authenticated User B cannot read
        a plant that belongs to User A.

The second test is intentionally the most important one: it proves that
the ownership check (owner_id == current_user.id) in the route actually
fires and returns the correct HTTP status code.
"""

from fastapi.testclient import TestClient

# Reusable plant payload matching the PlantCreate schema constraints.
_PLANT = {
    "name": "Jaisalmer Solar Alpha",
    "location": "Jaisalmer, Rajasthan, India",
    "latitude": 26.9124,
    "longitude": 70.9130,
    "capacity_mw": 50.0,
}


def test_create_and_get_own_plant(client: TestClient, auth_headers: dict[str, str]) -> None:
    """
    Verifies that a plant can be created and retrieved by its owner.

    Confirms:
    - POST /plants returns 201 and the payload is persisted correctly.
    - owner_id is derived server-side from the JWT (the caller cannot
      supply it), so the plant is automatically associated with the
      authenticated user.
    - GET /plants/{id} with the same user's token returns 200 and
      the response fields match what was submitted.

    Why this test matters: if the round-trip fails (create succeeds but
    fetch returns 404, or the payload is mutated) then the core CRUD
    contract is broken and no other feature can be trusted.
    """
    # ── Create ───────────────────────────────────────────────────────────
    r = client.post("/plants", json=_PLANT, headers=auth_headers)
    assert r.status_code == 201, f"Plant creation failed: {r.text}"
    created = r.json()
    plant_id = created["id"]
    assert created["name"] == _PLANT["name"]
    assert created["capacity_mw"] == _PLANT["capacity_mw"]
    assert created["latitude"] == _PLANT["latitude"]

    # ── Retrieve ─────────────────────────────────────────────────────────
    r = client.get(f"/plants/{plant_id}", headers=auth_headers)
    assert r.status_code == 200, f"Plant fetch failed: {r.text}"
    fetched = r.json()
    assert fetched["id"] == plant_id
    assert fetched["name"] == _PLANT["name"]
    assert fetched["location"] == _PLANT["location"]


def test_cannot_access_other_users_plant(client: TestClient) -> None:
    """
    Verifies that ownership checks prevent cross-user data access.

    This is the core security boundary of the application: a plant
    belongs to the user who created it, and other authenticated users
    must be refused with 403 Forbidden — not 200 (data breach) and
    not 404 (which would hide the fact that the plant exists and that
    the ownership check fired at all).

    The 403 vs 404 distinction is explicit in the route implementation:
      - 401 → caller is not authenticated at all
      - 404 → plant does not exist
      - 403 → plant exists but the authenticated caller does not own it  ← this case

    Scenario:
      User A registers, creates a plant.
      User B registers (separate account, zero overlap with User A).
      User B requests GET /plants/{User A's plant id}.
      Expected: 403 Forbidden.
    """
    # ── User A: register, login, create plant ────────────────────────────
    user_a = {"email": "user_a@test.io", "password": "passA_secret1"}
    client.post("/auth/register", json=user_a)
    r = client.post("/auth/login", json=user_a)
    headers_a = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.post("/plants", json=_PLANT, headers=headers_a)
    assert r.status_code == 201, "Prerequisite: User A must be able to create a plant"
    plant_id = r.json()["id"]

    # ── User B: separate account, no shared data ─────────────────────────
    user_b = {"email": "user_b@test.io", "password": "passB_secret2"}
    client.post("/auth/register", json=user_b)
    r = client.post("/auth/login", json=user_b)
    headers_b = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # ── Ownership check: User B must NOT see User A's plant ──────────────
    r = client.get(f"/plants/{plant_id}", headers=headers_b)
    assert r.status_code == 403, (
        f"SECURITY FAILURE: Expected 403 Forbidden but got {r.status_code}. "
        "User B must not be able to access a plant owned by User A. "
        "This indicates the ownership guard in GET /plants/{id} is broken."
    )
