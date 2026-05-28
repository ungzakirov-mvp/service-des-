from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserOrganization, Tenant, UserRole
from app.dependencies import get_current_user
from app.security import create_access_token

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("")
def list_my_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all organizations the user belongs to."""
    orgs = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.is_active == True
    ).all()

    result = []
    for uo in orgs:
        tenant = db.query(Tenant).filter(Tenant.id == uo.tenant_id).first()
        if tenant:
            result.append({
                "id": tenant.id,
                "name": tenant.name,
                "slug": tenant.slug,
                "role": uo.role,
                "is_current": tenant.id == current_user.tenant_id
            })

    return result


@router.post("/switch/{org_id}")
def switch_organization(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch current organization and return new JWT."""
    # Verify user belongs to this org
    membership = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.tenant_id == org_id,
        UserOrganization.is_active == True
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="Access denied to this organization")

    # Find user record for this org or update current user's tenant_id
    tenant = db.query(Tenant).filter(Tenant.id == org_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")

    # If user has a separate account in this org, use that
    org_user = db.query(User).filter(
        User.tenant_id == org_id,
        User.email == current_user.email
    ).first()

    target_user_id = org_user.id if org_user else current_user.id
    target_tenant_id = org_id

    # Generate new token
    new_token = create_access_token(
        data={
            "sub": str(target_user_id),
            "tenant_id": target_tenant_id,
            "role": membership.role,
            "org_name": tenant.name
        }
    )

    return {
        "access_token": new_token,
        "token_type": "bearer",
        "organization": {
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "role": membership.role
        }
    }


@router.post("/{org_id}/users")
def add_user_to_organization(
    org_id: int,
    user_id: int = Query(...),
    role: str = Query("agent"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a user to an organization (admin only)."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id,
        UserOrganization.tenant_id == org_id
    ).first()

    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.role = role
            db.add(existing)
            db.commit()
            return {"message": "User reactivated in organization"}
        raise HTTPException(status_code=400, detail="User already in organization")

    uo = UserOrganization(user_id=user_id, tenant_id=org_id, role=role)
    db.add(uo)
    db.commit()
    return {"message": "User added to organization"}
