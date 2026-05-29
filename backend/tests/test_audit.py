"""Integration tests: audit logging — recording and retrieval."""
import pytest
from app.models import User, Tenant, AuditLog, UserRole
from app.security import hash_password, create_access_token
from app.domains.audit import service as audit_svc
from app.domains.audit import permissions as perm


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


class TestAuditRecord:
    def test_record_creates_entry(self, db):
        tenant = db.query(Tenant).first()
        assert tenant is not None

        entry = audit_svc.record(
            db,
            tenant_id=tenant.id,
            action="TEST_ACTION",
            target_type="test",
            target_id=1,
            details={"key": "value"},
            source="test",
        )
        assert entry is not None
        assert entry.id is not None
        assert entry.action == "TEST_ACTION"
        assert entry.tenant_id == tenant.id
        assert entry.details.get("source") == "test"
        assert entry.created_at is not None

    def test_record_sanitizes_secrets(self, db):
        tenant = db.query(Tenant).first()
        assert tenant is not None

        entry = audit_svc.record(
            db,
            tenant_id=tenant.id,
            action="LOGIN",
            details={
                "email": "user@test.com",
                "password": "shouldnotbestored",
                "secret": "shouldnotbestored",
                "token": "shouldnotbestored",
                "safe_field": "this is ok",
            },
            source="auth",
        )
        assert entry is not None
        details = entry.details
        assert "password" not in details
        assert "secret" not in details
        assert "token" not in details
        assert details.get("safe_field") == "this is ok"
        assert details.get("email") == "user@test.com"

    def test_record_fail_safe(self, db):
        entry = audit_svc.record(
            db,
            tenant_id=1,
            action="SIMPLE_ACTION",
            details=None,
        )
        assert entry is not None

    def test_multiple_records_have_unique_ids(self, db):
        tenant = db.query(Tenant).first()
        assert tenant is not None

        ids = []
        for i in range(3):
            entry = audit_svc.record(
                db,
                tenant_id=tenant.id,
                action=f"ACTION_{i}",
                details={"seq": i},
            )
            assert entry is not None
            ids.append(entry.id)
        assert len(set(ids)) == 3


class TestAuditPermissions:
    def test_super_admin_can_view_audit(self):
        assert perm.can_view_audit_logs(UserRole.SUPER_ADMIN) is True

    def test_admin_can_view_audit(self):
        assert perm.can_view_audit_logs(UserRole.ADMIN) is True

    def test_agent_cannot_view_audit(self):
        assert perm.can_view_audit_logs(UserRole.AGENT) is False

    def test_client_cannot_view_audit(self):
        assert perm.can_view_audit_logs(UserRole.CLIENT) is False


class TestAuditAPI:
    def test_get_audit_logs_requires_admin(self, client, db):
        user = _create_user(db, "audit_agent@test.com", UserRole.AGENT)
        token = _token_for_user(user)
        resp = client.get("/api/admin/audit/logs", headers=_auth_header(token))
        assert resp.status_code == 403, "Agent must not access audit logs"

    def test_get_audit_logs_as_admin(self, client, db):
        user = _create_user(db, "audit_admin@test.com", UserRole.ADMIN)
        token = _token_for_user(user)

        audit_svc.record(
            db,
            tenant_id=user.tenant_id,
            action="ADMIN_TEST_ACTION",
            user_id=user.id,
            details={"test": True},
            source="test",
        )
        db.commit()

        resp = client.get("/api/admin/audit/logs", headers=_auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        found = [e for e in data if e["action"] == "ADMIN_TEST_ACTION"]
        assert len(found) >= 1

    def test_audit_logs_tenant_isolation(self, client, db):
        tenant_a = db.query(Tenant).filter(Tenant.id == 1).first()
        assert tenant_a is not None

        audit_svc.record(db, tenant_id=1, action="TENANT_A_AUDIT", source="test")
        db.commit()

        tenant_b = Tenant(name="Audit Tenant B", slug="audit-b-iso", domain="audit-b-iso.test")
        db.add(tenant_b)
        db.commit()
        db.refresh(tenant_b)

        user_a = _create_user(db, "audit_iso_admin@test.com", UserRole.ADMIN, tenant_id=1)
        user_b = _create_user(db, "audit_iso_badmin@test.com", UserRole.ADMIN, tenant_id=tenant_b.id)

        token_a = _token_for_user(user_a)
        token_b = _token_for_user(user_b)

        resp_a = client.get("/api/admin/audit/logs", headers=_auth_header(token_a))
        assert resp_a.status_code == 200
        data_a = resp_a.json()
        tenant_a_found = [e for e in data_a if e["action"] == "TENANT_A_AUDIT"]
        assert len(tenant_a_found) >= 1, "Tenant A admin must see own audit logs"

        resp_b = client.get("/api/admin/audit/logs", headers=_auth_header(token_b))
        assert resp_b.status_code == 200
        data_b = resp_b.json()
        tenant_a_in_b = [e for e in data_b if e["action"] == "TENANT_A_AUDIT"]
        assert len(tenant_a_in_b) == 0, "Tenant B must not see Tenant A's audit logs"
