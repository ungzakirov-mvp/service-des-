"""Thin wrapper — all Telegram dispatch goes through the notifications service."""
from app.telegram_bot import (
    notify_agent_new_ticket,
    notify_client_status_change,
    notify_client_new_reply,
    notify_agent_new_comment,
)

__all__ = [
    "notify_agent_new_ticket",
    "notify_client_status_change",
    "notify_client_new_reply",
    "notify_agent_new_comment",
]
