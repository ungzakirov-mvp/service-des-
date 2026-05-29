"""
Notification service — single entry point for all notification creation + dispatch.
Business code must NOT call transports/telegram/email/websocket directly.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import Notification
from app.domains.notifications import constants as const
from app.domains.notifications.transports import websocket as ws


async def create_notification(
    db: Session,
    *,
    user_id: int,
    tenant_id: int,
    title: str,
    message: str,
    link: Optional[str] = None,
    transports: Optional[List[str]] = None,
) -> Notification:
    """Persist a notification and dispatch via requested transports."""
    notif = Notification(
        tenant_id=tenant_id,
        user_id=user_id,
        title=title,
        message=message,
        link=link,
    )
    db.add(notif)
    db.flush()

    actual = transports or const.DEFAULT_TRANSPORTS
    if const.TRANSPORT_WEBSOCKET in actual:
        await ws.notify_user(user_id, tenant_id, {
            "type": "NEW_NOTIFICATION",
            "message": title,
            "content": message,
        })

    return notif


async def broadcast_event(tenant_id: int, event_type: str, **data):
    """Broadcast a system event to all connected users in a tenant."""
    await ws.broadcast_to_tenant(tenant_id, {"type": event_type, **data})


# Re-export transport functions so business code imports from service only.
from app.domains.notifications.transports.telegram import (  # noqa: E402, F401
    notify_agent_new_ticket,
    notify_client_status_change,
    notify_client_new_reply,
    notify_agent_new_comment,
)
from app.domains.notifications.transports.email import (  # noqa: E402, F401
    send_new_ticket_notification,
    send_new_comment_notification,
)
