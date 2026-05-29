"""Backward-compat shim - delegates to webhooks domain."""
from app.domains.webhooks.router import router

__all__ = ["router"]
