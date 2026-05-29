"""Thin wrapper — all WS dispatch goes through the notifications service domain."""
from app.services.websocket_manager import manager


async def notify_user(user_id: int, tenant_id: int, payload: dict):
    await manager.send_personal_message(payload, user_id=user_id, tenant_id=tenant_id)


async def broadcast_to_tenant(tenant_id: int, payload: dict):
    await manager.broadcast_to_tenant(payload, tenant_id=tenant_id)
