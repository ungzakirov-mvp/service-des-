from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import User, UserOrganization, Tenant
from app.infrastructure.security import create_access_token


def list_organizations(db: Session, current_user: User) -> list:
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


def switch_organization(db: Session, current_user: User, org_id: int) -> dict:
    membership = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id,
        UserOrganization.tenant_id == org_id,
        UserOrganization.is_active == True
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="Access denied to this organization")

    tenant = db.query(Tenant).filter(Tenant.id == org_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")

    org_user = db.query(User).filter(
        User.tenant_id == org_id,
        User.email == current_user.email
    ).first()

    target_user_id = org_user.id if org_user else current_user.id
    target_tenant_id = org_id

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


def add_user_to_org(db: Session, org_id: int, user_id: int, role: str) -> dict:
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
