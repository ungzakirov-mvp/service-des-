from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.infrastructure.authz import require_admin, require_staff
from app import schemas
from app.domains.crm import service as crm_service

router = APIRouter(prefix="/crm", tags=["CRM"])


@router.post("/companies", response_model=schemas.CompanyResponse, status_code=201)
def create_company(company_in: schemas.CompanyCreate, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    return crm_service.create_company(db, company_in, current_user)


@router.get("/companies", response_model=List[schemas.CompanyResponse])
def list_companies(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crm_service.list_companies(db, current_user, skip, limit)


@router.get("/companies/{company_id}", response_model=schemas.CompanyResponse)
def get_company(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crm_service.get_company(db, company_id, current_user)


@router.patch("/companies/{company_id}", response_model=schemas.CompanyResponse)
def update_company(company_id: int, company_in: schemas.CompanyUpdate, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    return crm_service.update_company(db, company_id, company_in, current_user)


@router.delete("/companies/{company_id}", status_code=204)
def delete_company(company_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    crm_service.delete_company(db, company_id, current_user)


@router.post("/companies/{company_id}/logo")
def upload_company_logo(company_id: int, file: UploadFile = File(...), current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    return JSONResponse(crm_service.upload_company_logo(db, company_id, file, current_user))


@router.get("/companies/{company_id}/contacts", response_model=List[schemas.UserResponse])
def list_company_contacts(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crm_service.list_company_contacts(db, company_id, current_user)


@router.post("/companies/{company_id}/subscriptions", response_model=schemas.CompanySubscriptionResponse, status_code=201)
def create_subscription(company_id: int, sub_in: schemas.CompanySubscriptionCreate, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    return crm_service.create_subscription(db, company_id, sub_in, current_user)


@router.get("/companies/{company_id}/subscriptions", response_model=List[schemas.CompanySubscriptionResponse])
def list_subscriptions(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crm_service.list_subscriptions(db, company_id, current_user)


@router.patch("/subscriptions/{sub_id}", response_model=schemas.CompanySubscriptionResponse)
def update_subscription(sub_id: int, sub_in: schemas.CompanySubscriptionUpdate, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    return crm_service.update_subscription(db, sub_id, sub_in, current_user)


@router.delete("/subscriptions/{sub_id}", status_code=204)
def delete_subscription(sub_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    crm_service.delete_subscription(db, sub_id, current_user)


@router.get("/subscriptions/expiring", response_model=List[schemas.CompanySubscriptionResponse])
def get_expiring_subscriptions(days: int = 30, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crm_service.get_expiring_subscriptions(db, current_user, days)


@router.post("/companies/{company_id}/employees", response_model=schemas.CompanyEmployeeResponse, status_code=201)
def create_employee(company_id: int, emp_in: schemas.CompanyEmployeeCreate, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    return crm_service.create_employee(db, company_id, emp_in, current_user)


@router.get("/companies/{company_id}/employees", response_model=List[schemas.CompanyEmployeeResponse])
def list_employees(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crm_service.list_employees(db, company_id, current_user)


@router.patch("/employees/{emp_id}", response_model=schemas.CompanyEmployeeResponse)
def update_employee(emp_id: int, emp_in: schemas.CompanyEmployeeUpdate, current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    return crm_service.update_employee(db, emp_id, emp_in, current_user)


@router.delete("/employees/{emp_id}", status_code=204)
def delete_employee(emp_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    crm_service.delete_employee(db, emp_id, current_user)
