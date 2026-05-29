import os
import uuid
import shutil
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, UploadFile
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import datetime, timedelta
from app.models import Company, CompanySubscription, CompanyEmployee, User
from app import schemas

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'}
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "logos")


def get_active_tenant_id(db: Session, current_user: User) -> int:
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User has no tenant context")
    return current_user.tenant_id


def create_company(db: Session, company_in: schemas.CompanyCreate, current_user: User) -> Company:
    tenant_id = get_active_tenant_id(db, current_user)
    new_company = Company(
        tenant_id=tenant_id,
        name=company_in.name, legal_name=company_in.legal_name, inn=company_in.inn,
        address=company_in.address, phone=company_in.phone, email=company_in.email,
        website=company_in.website, logo_url=company_in.logo_url,
        domain=company_in.domain, industry=company_in.industry, description=company_in.description,
        color=company_in.color or "#0066CC"
    )
    try:
        db.add(new_company); db.commit(); db.refresh(new_company)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    db.refresh(new_company, ["subscriptions", "employees"])
    return new_company


def list_companies(db: Session, current_user: User, skip: int = 0, limit: int = 100) -> List[Company]:
    tenant_id = get_active_tenant_id(db, current_user)
    return db.query(Company).filter(Company.tenant_id == tenant_id).options(
        selectinload(Company.subscriptions), selectinload(Company.employees)
    ).offset(skip).limit(limit).all()


def get_company(db: Session, company_id: int, current_user: User) -> Company:
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).options(
        selectinload(Company.subscriptions), selectinload(Company.employees)
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    return company


def update_company(db: Session, company_id: int, company_in: schemas.CompanyUpdate, current_user: User) -> Company:
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    for field, value in company_in.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit(); db.refresh(company)
    return company


def delete_company(db: Session, company_id: int, current_user: User) -> None:
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    db.delete(company); db.commit()


def upload_company_logo(db: Session, company_id: int, file: UploadFile, current_user: User) -> dict:
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Недопустимый формат. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    logo_url = f"/api/static/logos/{filename}"
    company.logo_url = logo_url
    db.commit()
    db.refresh(company)
    return {"logo_url": logo_url}


def list_company_contacts(db: Session, company_id: int, current_user: User) -> List[User]:
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    return db.query(User).filter(User.company_id == company_id, User.tenant_id == tenant_id).all()


def create_subscription(db: Session, company_id: int, sub_in: schemas.CompanySubscriptionCreate, current_user: User) -> CompanySubscription:
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    sub = CompanySubscription(tenant_id=tenant_id, company_id=company_id, **sub_in.model_dump())
    db.add(sub); db.commit(); db.refresh(sub)
    return sub


def list_subscriptions(db: Session, company_id: int, current_user: User) -> List[CompanySubscription]:
    tenant_id = get_active_tenant_id(db, current_user)
    return db.query(CompanySubscription).filter(
        CompanySubscription.company_id == company_id,
        CompanySubscription.tenant_id == tenant_id
    ).all()


def update_subscription(db: Session, sub_id: int, sub_in: schemas.CompanySubscriptionUpdate, current_user: User) -> CompanySubscription:
    sub = db.query(CompanySubscription).filter(
        CompanySubscription.id == sub_id,
        CompanySubscription.tenant_id == get_active_tenant_id(db, current_user)
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    for field, value in sub_in.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    db.commit(); db.refresh(sub)
    return sub


def delete_subscription(db: Session, sub_id: int, current_user: User) -> None:
    sub = db.query(CompanySubscription).filter(
        CompanySubscription.id == sub_id,
        CompanySubscription.tenant_id == get_active_tenant_id(db, current_user)
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    db.delete(sub); db.commit()


def get_expiring_subscriptions(db: Session, current_user: User, days: int = 30) -> List[CompanySubscription]:
    tenant_id = get_active_tenant_id(db, current_user)
    now = datetime.now()
    deadline = now + timedelta(days=days)
    return db.query(CompanySubscription).filter(
        CompanySubscription.tenant_id == tenant_id,
        CompanySubscription.expires_at != None,
        CompanySubscription.expires_at <= deadline,
        CompanySubscription.expires_at >= now,
        CompanySubscription.status == "active"
    ).order_by(CompanySubscription.expires_at.asc()).all()


def create_employee(db: Session, company_id: int, emp_in: schemas.CompanyEmployeeCreate, current_user: User) -> CompanyEmployee:
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    emp = CompanyEmployee(tenant_id=tenant_id, company_id=company_id, **emp_in.model_dump())
    db.add(emp); db.commit(); db.refresh(emp)
    return emp


def list_employees(db: Session, company_id: int, current_user: User) -> List[CompanyEmployee]:
    tenant_id = get_active_tenant_id(db, current_user)
    return db.query(CompanyEmployee).filter(
        CompanyEmployee.company_id == company_id,
        CompanyEmployee.tenant_id == tenant_id
    ).all()


def update_employee(db: Session, emp_id: int, emp_in: schemas.CompanyEmployeeUpdate, current_user: User) -> CompanyEmployee:
    emp = db.query(CompanyEmployee).filter(
        CompanyEmployee.id == emp_id,
        CompanyEmployee.tenant_id == get_active_tenant_id(db, current_user)
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    for field, value in emp_in.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)
    db.commit(); db.refresh(emp)
    return emp


def delete_employee(db: Session, emp_id: int, current_user: User) -> None:
    emp = db.query(CompanyEmployee).filter(
        CompanyEmployee.id == emp_id,
        CompanyEmployee.tenant_id == get_active_tenant_id(db, current_user)
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    db.delete(emp); db.commit()
