"""Backward-compat shim — delegates to domain."""
from app.domains.notifications.router import router
from app.domains.notifications import service as notif_service

broadcast_notification = notif_service.create_notification

__all__ = ["router", "broadcast_notification"]
