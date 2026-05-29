from sqlalchemy.orm import Session
from app.models import Ticket
from app.services.websocket_manager import manager

async def notify_ticket_created(db: Session, ticket: Ticket):
    """
    Notify agents/admins that a new ticket has been created.
    """
    message = {
        "type": "TICKET_CREATED",
        "ticket": {
            "id": ticket.id,
            "title": ticket.title,
            "created_by": ticket.created_by
        }
    }
    # In a real app, we would only notify agents. For now, broadcast to tenant.
    await manager.broadcast_to_tenant(message, ticket.tenant_id)

async def notify_status_changed(db: Session, ticket: Ticket):
    """
    Notify relevant users that ticket status has changed.
    """
    message = {
        "type": "TICKET_UPDATED",
        "ticket": {
            "id": ticket.id,
            "title": ticket.title,
            "status_id": ticket.status_id
        }
    }
    # Notify everyone in tenant for now, to ensure UI updates
    await manager.broadcast_to_tenant(message, ticket.tenant_id)

from typing import Optional
from app.models import Notification


async def broadcast_notification(db: Session, user_id: int, tenant_id: int,
                                  title: str, message: str, link: Optional[str] = None):
    """Canonical notification creation + WebSocket delivery."""
    notif = Notification(
        tenant_id=tenant_id,
        user_id=user_id,
        title=title,
        message=message,
        link=link
    )
    db.add(notif)
    db.flush()
    from app.services.websocket_manager import manager
    await manager.send_personal_message({
        "type": "NEW_NOTIFICATION",
        "message": title,
        "content": message
    }, user_id=user_id, tenant_id=tenant_id)
