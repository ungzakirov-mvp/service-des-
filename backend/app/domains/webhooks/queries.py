from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Tenant
from app.infrastructure.config import settings


def get_webhook_secret(tenant_id: int, source: str) -> str:
    secret = settings.WEBHOOK_SECRET
    if not secret:
        raise HTTPException(500, detail="Webhook secret not configured")
    return secret


def resolve_tenant(
    db: Session,
    tenant_id_header: Optional[str],
    source: str,
    body: Optional[dict] = None,
) -> Tenant:
    if tenant_id_header:
        try:
            tid = int(tenant_id_header)
        except (ValueError, TypeError):
            raise HTTPException(400, detail="X-Tenant-Id must be an integer")

        tenant = db.query(Tenant).filter(Tenant.id == tid).first()
        if not tenant:
            raise HTTPException(404, detail=f"Tenant {tid} not found")
        if not tenant.is_active:
            raise HTTPException(403, detail="Tenant is inactive")
        return tenant

    raise HTTPException(400, detail=f"X-Tenant-Id header required for webhook source: {source}")


def check_idempotency(db: Session, key: str, source: str) -> bool:
    return False


def record_idempotency(db: Session, key: str, source: str, result: dict) -> None:
    pass
