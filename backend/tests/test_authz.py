"""Integration tests: authorization — role-based access control."""
import pytest
from app.models import Tenant, User, Notification, UserRole
from app.security import hash_password, create_access_token


def _register_user(client, email="user@test.com"):
    resp = client.post("/api/auth/register", json={
        "email": email, "password": "password123",
    })
    if resp.status_code == 201:
        return resp.json()
    resp = client.post("/api/auth/login", json={
        "email": email, "password": "password123",
    })
    return resp.json() if resp.status_code == 200 else None


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def _create_user(db, email, role=UserRole.CLIENT, tenant_id=1):
    user = User(
        tenant_id=tenant_id,
        email=email,
        password=hash_password("password123"),
        full_name=email,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token_for_user(user):
    return create_access_token(data={"sub": str(user.id), "tenant_id": user.tenant_id})


class TestAuthzAdmin:
    """Admin-level access tests."""

    def test_authenticated_can_access_stats(self, client, db):
        user = _create_user(db, "authz_stats@test.com")
        token = _token_for_user(user)
        resp = client.get("/api/stats", headers=_auth_header(token))
        assert resp.status_code == 200

    def test_agent_cannot_access_admin_audit(self, client, db):
        user = _create_user(db, "authz_agent@test.com", UserRole.AGENT)
        token = _token_for_user(user)
        resp = client.get("/api/admin/audit/logs", headers=_auth_header(token))
        assert resp.status_code == 403, "Agents must not access audit logs"

    def test_admin_cannot_register_duplicate_email(self, client, db):
        _register_user(client, "authz_dup@test.com")
        resp = client.post("/api/auth/register", json={
            "email": "authz_dup@test.com", "password": "password123",
        })
        assert resp.status_code == 400

    def test_admin_can_mark_notification_read(self, client, db):
        user = _create_user(db, "authz_notif@test.com", UserRole.ADMIN)
        token = _token_for_user(user)

        notif = Notification(
            tenant_id=user.tenant_id,
            user_id=user.id,
            title="Test notification",
            message="Test message",
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        resp = client.post(f"/api/notifications/{notif.id}/read", headers=_auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestAuthzUnauthenticated:
    """Verify unauthenticated requests are rejected."""

    @pytest.mark.parametrize("path", [
        "/api/tickets/",
        "/api/stats",
        "/api/notifications/",
        "/api/admin/audit/logs",
        "/api/crm/companies",
    ])
    def test_unauthenticated_rejected(self, client, path):
        resp = client.get(path)
        assert resp.status_code == 401


class TestAuthzInvalidToken:
    """Verify invalid/bad tokens are rejected."""

    def test_invalid_token_returns_401(self, client):
        headers = {"Authorization": "Bearer invalidtoken123"}
        for path in ["/api/tickets/", "/api/stats", "/api/notifications/"]:
            resp = client.get(path, headers=headers)
            assert resp.status_code == 401, f"{path} accepted invalid token"
