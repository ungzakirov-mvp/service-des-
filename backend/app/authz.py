# Backward-compatibility shim: re-export from infrastructure
from app.infrastructure.authz import RoleChecker, require_admin, require_staff, require_super_admin, has_role

__all__ = ["RoleChecker", "require_admin", "require_staff", "require_super_admin", "has_role"]
