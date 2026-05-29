"""Thin wrapper — all Email dispatch goes through the notifications service."""
from app.email import send_new_ticket_notification, send_new_comment_notification

__all__ = ["send_new_ticket_notification", "send_new_comment_notification"]
