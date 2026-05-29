"""Integration tests: tenant isolation — tenants must not see each other's data."""
import pytest
from app.models import Tenant, User, Ticket, TicketStatus, UserRole
from app.security import create_access_token, hash_password


def _register_user(client, email="user@test.com"):
    resp = client.post("/api/auth/register", json={
        "email": email, "password": "password123",
    })
    if resp.status_code != 201:
        # Try login in case already registered
        resp = client.post("/api/auth/login", json={
            "email": email, "password": "password123",
        })
    return resp.json()


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def _create_user_in_tenant(db, tenant_id, email, role=UserRole.CLIENT):
    user = User(
        tenant_id=tenant_id,
        email=email,
        password=hash_password("password123"),
        full_name=f"User {email}",
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token_for_user(user):
    return create_access_token(data={"sub": str(user.id), "tenant_id": user.tenant_id})


class TestTenantIsolation:
    """Verify that data is fully isolated between tenants."""

    def test_tenant_a_cannot_see_tenant_b_tickets(self, client, db):
        """Tenant A user must not see Tenant B's tickets via /api/tickets/"""
        status = db.query(TicketStatus).filter(TicketStatus.tenant_id == 1).first()
        assert status is not None, "Seed status must exist"

        tenant_b = Tenant(name="Tenant B", slug="tenant-b-iso", domain="b-iso.test")
        db.add(tenant_b)
        db.commit()
        db.refresh(tenant_b)

        status_b = TicketStatus(tenant_id=tenant_b.id, name="New", color="blue", order=1)
        db.add(status_b)
        db.commit()

        user_b = _create_user_in_tenant(db, tenant_b.id, "tiso_user_b@test.com", UserRole.CLIENT)
        user_a = _create_user_in_tenant(db, 1, "tiso_user_a@test.com", UserRole.CLIENT)

        token_a = _token_for_user(user_a)
        token_b = _token_for_user(user_b)

        ticket_b = Ticket(
            tenant_id=tenant_b.id,
            readable_id=1000,
            title="Secret ticket of B",
            description="Should be invisible to A",
            status_id=status_b.id,
            priority="medium",
            created_by=user_b.id,
        )
        db.add(ticket_b)
        db.commit()
        db.refresh(ticket_b)

        resp_a = client.get("/api/tickets/", headers=_auth_header(token_a))
        assert resp_a.status_code == 200
        tickets_a = resp_a.json()
        ticket_b_ids = [t for t in tickets_a if t.get("id") == ticket_b.id]
        assert len(ticket_b_ids) == 0, "Tenant A must not see Tenant B's tickets"

        resp_b = client.get("/api/tickets/", headers=_auth_header(token_b))
        assert resp_b.status_code == 200
        tickets_b = resp_b.json()
        ticket_b_found = [t for t in tickets_b if t.get("id") == ticket_b.id]
        assert len(ticket_b_found) == 1, "Tenant B must see own tickets"

    def test_tenant_a_cannot_access_tenant_b_stats(self, client, db):
        """Stats endpoint must be tenant-scoped."""
        tenant_b = Tenant(name="Tenant B Stats2", slug="tenant-b-stats2", domain="b-stats2.test")
        db.add(tenant_b)
        db.commit()
        db.refresh(tenant_b)

        user_b = _create_user_in_tenant(db, tenant_b.id, "tstat_user_b@test.com", UserRole.CLIENT)
        token_b = _token_for_user(user_b)

        resp = client.get("/api/stats", headers=_auth_header(token_b))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_tickets"] == 0, "New tenant must start with zero tickets"

    def test_tenant_b_ticket_does_not_affect_tenant_a_count(self, client, db):
        """Creating a ticket in tenant B must not change tenant A's stats."""
        user_a = _create_user_in_tenant(db, 1, "taff_user_a@test.com", UserRole.CLIENT)
        token_a = _token_for_user(user_a)

        resp_a_before = client.get("/api/stats", headers=_auth_header(token_a))
        count_a_before = resp_a_before.json()["total_tickets"]

        tenant_b = Tenant(name="Tenant B Aff", slug="tenant-b-aff", domain="b-aff.test")
        db.add(tenant_b)
        db.commit()
        db.refresh(tenant_b)

        status_b = TicketStatus(tenant_id=tenant_b.id, name="New", color="blue", order=1)
        db.add(status_b)
        db.commit()

        user_b = _create_user_in_tenant(db, tenant_b.id, "taff_user_b@test.com", UserRole.CLIENT)
        token_b = _token_for_user(user_b)

        ticket_b_data = {"title": "B ticket", "description": "desc", "priority": "medium"}
        resp_b_create = client.post(
            "/api/tickets/", json=ticket_b_data, headers=_auth_header(token_b)
        )
        assert resp_b_create.status_code == 201

        resp_a_after = client.get("/api/stats", headers=_auth_header(token_a))
        count_a_after = resp_a_after.json()["total_tickets"]
        assert count_a_after == count_a_before, (
            "Tenant A's ticket count must not change when Tenant B creates tickets"
        )
