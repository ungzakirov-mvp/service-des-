from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.models import User, UserOrganization, Tenant
from app.dependencies import get_current_user
from app.infrastructure.authz import require_admin
from app.infrastructure.security import create_access_token
from app.domains.organizations import service as org_service

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("")
def list_my_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return org_service.list_organizations(db, current_user)


@router.post("/switch/{org_id}")
def switch_organization(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return org_service.switch_organization(db, current_user, org_id)


@router.post("/{org_id}/users")
def add_user_to_organization(
    org_id: int,
    user_id: int = Query(...),
    role: str = Query("agent"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return org_service.add_user_to_org(db, org_id, user_id, role)
