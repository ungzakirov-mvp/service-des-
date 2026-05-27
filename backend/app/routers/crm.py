import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Company, CompanySubscription, CompanyEmployee, User, UserRole
from app.dependencies import get_current_user
from app import schemas

router = APIRouter(prefix="/crm", tags=["CRM"])

def get_active_tenant_id(db: Session, current_user: User) -> int:
    if current_user.tenant_id:
        return current_user.tenant_id
    from app.models import Tenant
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=500, detail="No tenants found")
    return tenant.id

# ── Companies ──

@router.post("/companies", response_model=schemas.CompanyResponse, status_code=201)
def create_company(company_in: schemas.CompanyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.AGENT, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
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
        db.rollback(); raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    db.refresh(new_company, ["subscriptions", "employees"])
    return new_company

@router.get("/companies", response_model=List[schemas.CompanyResponse])
def list_companies(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant_id = get_active_tenant_id(db, current_user)
    return db.query(Company).filter(Company.tenant_id == tenant_id).options(
        selectinload(Company.subscriptions), selectinload(Company.employees)
    ).offset(skip).limit(limit).all()

@router.get("/companies/{company_id}", response_model=schemas.CompanyResponse)
def get_company(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).options(
        selectinload(Company.subscriptions), selectinload(Company.employees)
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    return company

@router.patch("/companies/{company_id}", response_model=schemas.CompanyResponse)
def update_company(company_id: int, company_in: schemas.CompanyUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.AGENT, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    for field, value in company_in.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit(); db.refresh(company)
    return company

@router.delete("/companies/{company_id}", status_code=204)
def delete_company(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Только администраторы могут удалять компании")
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    db.delete(company); db.commit()
    return None

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'}
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "logos")

@router.post("/companies/{company_id}/logo")
def upload_company_logo(company_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.AGENT, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
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
    return JSONResponse({"logo_url": logo_url})

@router.get("/companies/{company_id}/contacts", response_model=List[schemas.UserResponse])
def list_company_contacts(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    return db.query(User).filter(User.company_id == company_id).all()

# ── Subscriptions ──

@router.post("/companies/{company_id}/subscriptions", response_model=schemas.CompanySubscriptionResponse, status_code=201)
def create_subscription(company_id: int, sub_in: schemas.CompanySubscriptionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.AGENT, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    sub = CompanySubscription(tenant_id=tenant_id, company_id=company_id, **sub_in.model_dump())
    db.add(sub); db.commit(); db.refresh(sub)
    return sub

@router.get("/companies/{company_id}/subscriptions", response_model=List[schemas.CompanySubscriptionResponse])
def list_subscriptions(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant_id = get_active_tenant_id(db, current_user)
    return db.query(CompanySubscription).filter(CompanySubscription.company_id == company_id, CompanySubscription.tenant_id == tenant_id).all()

@router.patch("/subscriptions/{sub_id}", response_model=schemas.CompanySubscriptionResponse)
def update_subscription(sub_id: int, sub_in: schemas.CompanySubscriptionUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.AGENT, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    sub = db.query(CompanySubscription).filter(CompanySubscription.id == sub_id, CompanySubscription.tenant_id == get_active_tenant_id(db, current_user)).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    for field, value in sub_in.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    db.commit(); db.refresh(sub)
    return sub

@router.delete("/subscriptions/{sub_id}", status_code=204)
def delete_subscription(sub_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Только администраторы могут удалять подписки")
    sub = db.query(CompanySubscription).filter(CompanySubscription.id == sub_id, CompanySubscription.tenant_id == get_active_tenant_id(db, current_user)).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    db.delete(sub); db.commit()
    return None

@router.get("/subscriptions/expiring", response_model=List[schemas.CompanySubscriptionResponse])
def get_expiring_subscriptions(days: int = 30, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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

# ── Employees ──

@router.post("/companies/{company_id}/employees", response_model=schemas.CompanyEmployeeResponse, status_code=201)
def create_employee(company_id: int, emp_in: schemas.CompanyEmployeeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.AGENT, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    tenant_id = get_active_tenant_id(db, current_user)
    company = db.query(Company).filter(Company.id == company_id, Company.tenant_id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    emp = CompanyEmployee(tenant_id=tenant_id, company_id=company_id, **emp_in.model_dump())
    db.add(emp); db.commit(); db.refresh(emp)
    return emp

@router.get("/companies/{company_id}/employees", response_model=List[schemas.CompanyEmployeeResponse])
def list_employees(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant_id = get_active_tenant_id(db, current_user)
    return db.query(CompanyEmployee).filter(CompanyEmployee.company_id == company_id, CompanyEmployee.tenant_id == tenant_id).all()

@router.patch("/employees/{emp_id}", response_model=schemas.CompanyEmployeeResponse)
def update_employee(emp_id: int, emp_in: schemas.CompanyEmployeeUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.AGENT, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    emp = db.query(CompanyEmployee).filter(CompanyEmployee.id == emp_id, CompanyEmployee.tenant_id == get_active_tenant_id(db, current_user)).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    for field, value in emp_in.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)
    db.commit(); db.refresh(emp)
    return emp

@router.delete("/employees/{emp_id}", status_code=204)
def delete_employee(emp_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Только администраторы могут удалять сотрудников")
    emp = db.query(CompanyEmployee).filter(CompanyEmployee.id == emp_id, CompanyEmployee.tenant_id == get_active_tenant_id(db, current_user)).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    db.delete(emp); db.commit()
    return None