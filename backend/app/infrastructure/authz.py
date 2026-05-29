from fastapi import Depends, HTTPException, status
from app.models import User, UserRole
from app.dependencies import get_current_user


class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action",
            )
        return current_user


require_admin = RoleChecker([UserRole.ADMIN, UserRole.SUPER_ADMIN])
require_staff = RoleChecker([UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN])
require_super_admin = RoleChecker([UserRole.SUPER_ADMIN])


def has_role(current_user: User, *roles: UserRole) -> bool:
    return current_user.role in roles
