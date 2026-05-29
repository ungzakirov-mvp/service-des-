from typing import Optional
from sqlalchemy.orm import Session
from app.models import Notification, Ticket
from app.logger import log_business_event
from app.domains.audit import service as audit_svc
from app.domains.tickets import constants as const


async def broadcast_ticket_event(tenant_id: int, event_type: str, ticket_id: int, **extra):
    from app.domains.notifications import service as notif_service
    await notif_service.broadcast_event(tenant_id, event_type, ticket_id=ticket_id, **extra)


async def create_notification(db: Session, user_id: int, tenant_id: int,
                              title: str, message: str, link: Optional[str] = None):
    """Delegates to shared notification service."""
    from app.domains.notifications import service as notif_service
    await notif_service.create_notification(db, user_id=user_id, tenant_id=tenant_id, title=title, message=message, link=link)


def log_business(db, tenant_id: int, event: str, **kwargs):
    log_business_event(event, tenant_id=tenant_id, **kwargs)


def log_audit(db: Session, tenant_id: int, action: str, user_id: int,
              target_id: int, details: Optional[dict] = None):
    audit_svc.record(
        db,
        tenant_id=tenant_id,
        action=action,
        user_id=user_id,
        target_type="ticket",
        target_id=target_id,
        details=details or {},
        source="tickets",
    )
