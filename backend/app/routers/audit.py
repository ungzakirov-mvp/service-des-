"""Backward-compat shim - delegates to audit domain."""
from app.domains.audit.router import router

__all__ = ["router"]
