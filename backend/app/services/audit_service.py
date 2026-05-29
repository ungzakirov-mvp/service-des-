"""Backward-compat shim - delegates to audit domain service."""
from app.domains.audit import service as _audit


class AuditService:
    @staticmethod
    def log(db, tenant_id, action, user_id=None, target_type=None,
            target_id=None, details=None, ip_address=None, user_agent=None):
        return _audit.record(
            db=db, tenant_id=tenant_id, action=action,
            user_id=user_id, target_type=target_type,
            target_id=target_id, details=details,
            ip_address=ip_address, user_agent=user_agent,
        )
