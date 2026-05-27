from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Company, User
from app.company_dashboard import generate_dashboard

router = APIRouter(prefix="/companies", tags=["Dashboard"])


@router.get("/dashboard")
def company_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    companies = db.query(Company).filter(Company.tenant_id == current_user.tenant_id).all()
    return [generate_dashboard(c, db) for c in companies]


@router.get("/dashboard/settings")
def get_dashboard_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    companies = db.query(Company).filter(Company.tenant_id == current_user.tenant_id).all()
    result = []
    for c in companies:
        settings = (c.extra_metadata or {}).get("dashboard", {})
        result.append({
            "company_id": c.id,
            "company_name": c.name,
            "settings": settings,
        })
    return result


@router.put("/dashboard/settings")
def save_dashboard_settings(
    payload: list[dict],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for item in payload:
        company = db.query(Company).filter(
            Company.id == item["company_id"],
            Company.tenant_id == current_user.tenant_id,
        ).first()
        if not company:
            raise HTTPException(404, f"Company {item['company_id']} not found")
        meta = dict(company.extra_metadata) if company.extra_metadata else {}
        meta["dashboard"] = item.get("settings", {})
        company.extra_metadata = meta
    db.commit()
    return {"status": "ok"}
