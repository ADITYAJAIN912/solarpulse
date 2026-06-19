"""
Authentication lifecycle tests.

What we verify here: the entire sign-up → sign-in → bad-credentials path
works correctly. Auth is the gate to every other endpoint, so a broken
login makes the whole application inaccessible; a leaky login (accepting
wrong passwords) is a security failure. Both cases are covered in a
single test to keep the fixture overhead minimal.
"""

from fastapi.testclient import TestClient


def test_register_and_login_success(client: TestClient) -> None:
    """
    Verifies the full authentication lifecycle:

    1. A new account can be registered (POST /auth/register → 201).
    2. The same credentials can be used to log in (POST /auth/login → 200)
       and the response contains a non-empty access_token.
    3. Wrong credentials are rejected with 401 — not 200 (data breach),
       not 500 (crash), and not 404 (misconfigured route).

    Why this test matters: if any of these three assertions break, the
    entire application becomes either inaccessible or insecure.
    """
    credentials = {"email": "newuser@example.com", "password": "strongpass42"}

    # ── 1. Register ──────────────────────────────────────────────────────
    r = client.post("/auth/register", json=credentials)
    assert r.status_code == 201, f"Registration failed: {r.text}"

    # ── 2. Login with correct credentials ───────────────────────────────
    r = client.post("/auth/login", json=credentials)
    assert r.status_code == 200, f"Login failed: {r.text}"
    body = r.json()
    assert "access_token" in body, "Response missing access_token field"
    assert body["access_token"], "access_token must not be empty"

    # ── 3. Login with wrong password → must be 401 ──────────────────────
    r = client.post(
        "/auth/login",
        json={"email": credentials["email"], "password": "totallyWrongPassword"},
    )
    assert r.status_code == 401, (
        f"Expected 401 for wrong password but got {r.status_code}. "
        "The server must reject invalid credentials."
    )
