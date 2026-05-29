"""Canonical audit record function — single entry point for all audit events.

Append-only. Fail-safe. Tenant-isolated.
"""
import logging
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models import AuditLog
from app.domains.audit import constants as const

logger = logging.getLogger(__name__)


def record(
    db: Session,
    tenant_id: int,
    action: str,
    user_id: Optional[int] = None,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    source: Optional[str] = None,
) -> Optional[AuditLog]:
    """Append an audit event. Returns the record or None on failure."""
    try:
        entry = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=_sanitize_details(details),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(entry)
        db.flush()

        _enrich_with_source(entry, source)

        return entry
    except Exception as e:
        logger.error("audit_record_failed", extra={
            "action": action,
            "tenant_id": tenant_id,
            "error": str(e),
        })
        db.rollback()
        return None


def _sanitize_details(details: Any) -> Optional[dict]:
    """Strip sensitive fields before storing."""
    if details is None:
        return None
    if isinstance(details, dict):
        cleaned = {
            k: v for k, v in details.items()
            if k.lower() not in ("password", "secret", "token", "signature", "key", "authorization")
        }
        return cleaned
    return details


def _enrich_with_source(entry: AuditLog, source: Optional[str]) -> None:
    if source and entry.details is None:
        entry.details = {"source": source}
    elif source and isinstance(entry.details, dict):
        entry.details.setdefault("source", source)


def record_from_request(
    db: Session,
    tenant_id: int,
    action: str,
    user_id: Optional[int] = None,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[Any] = None,
    request=None,
    source: Optional[str] = None,
) -> Optional[AuditLog]:
    """Convenience wrapper that extracts ip/user_agent from request."""
    ip = None
    ua = None
    if request is not None:
        ip = request.client.host if hasattr(request, "client") and request.client else None
        ua = request.headers.get("user-agent") if hasattr(request, "headers") else None

    return record(
        db, tenant_id, action,
        user_id=user_id,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=ip,
        user_agent=ua,
        source=source,
    )
