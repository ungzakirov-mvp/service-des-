"""Integration tests: notifications — creation, retrieval, marking as read."""
import pytest
from app.models import Notification, User, Tenant, UserRole
from app.security import hash_password, create_access_token


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


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


class TestNotificationAPI:
    def test_get_notifications_empty(self, client, db):
        user = _create_user(db, "notif_empty@test.com")
        token = _token_for_user(user)
        resp = client.get("/api/notifications/", headers=_auth_header(token))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_notifications_with_data(self, client, db):
        user = _create_user(db, "notif_has@test.com")
        token = _token_for_user(user)

        notif = Notification(
            tenant_id=user.tenant_id,
            user_id=user.id,
            title="Test notification",
            message="Test message content",
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        resp = client.get("/api/notifications/", headers=_auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        found = [n for n in data if n["id"] == notif.id]
        assert len(found) == 1
        assert found[0]["title"] == "Test notification"
        assert found[0]["is_read"] is False

    def test_mark_notification_read(self, client, db):
        user = _create_user(db, "notif_mark@test.com")
        token = _token_for_user(user)

        notif = Notification(
            tenant_id=user.tenant_id,
            user_id=user.id,
            title="Mark me read",
            message="Please mark as read",
        )
        db.add(notif)
        db.commit()
        notif_id = notif.id

        resp = client.post(f"/api/notifications/{notif_id}/read", headers=_auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        resp = client.get("/api/notifications/", headers=_auth_header(token))
        data = resp.json()
        found = [n for n in data if n["id"] == notif_id]
        assert len(found) == 1
        assert found[0]["is_read"] is True

    def test_mark_read_wrong_user(self, client, db):
        user_a = _create_user(db, "notif_owner@test.com")
        user_b = _create_user(db, "notif_intruder@test.com")

        token_b = _token_for_user(user_b)

        notif = Notification(
            tenant_id=user_a.tenant_id,
            user_id=user_a.id,
            title="My notification",
            message="Only I can read this",
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        resp = client.post(
            f"/api/notifications/{notif.id}/read",
            headers=_auth_header(token_b),
        )
        assert resp.status_code == 404, "Another user must not read others' notifications"

    def test_mark_all_read(self, client, db):
        user = _create_user(db, "notif_markall@test.com")
        token = _token_for_user(user)

        for i in range(3):
            notif = Notification(
                tenant_id=user.tenant_id,
                user_id=user.id,
                title=f"Notif {i}",
                message=f"Message {i}",
                is_read=False,
            )
            db.add(notif)
        db.commit()

        resp = client.post("/api/notifications/read-all", headers=_auth_header(token))
        assert resp.status_code == 200

        resp = client.get("/api/notifications/", headers=_auth_header(token))
        data = resp.json()
        unread = [n for n in data if n["is_read"] is False]
        assert len(unread) == 0, "All notifications must be marked as read"
