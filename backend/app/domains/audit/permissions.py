from typing import Optional


def can_view_audit_logs(role: str) -> bool:
    from app.models import UserRole
    return role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
