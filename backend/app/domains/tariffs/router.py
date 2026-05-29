from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app.infrastructure.database import get_db
from app.models_tariffs import TariffPlan, TariffFeature, OrgSubscription, ServiceCatalog, ServiceRequest, ServiceRequestItem
from app.models import User
from app.dependencies import get_current_user
from app.infrastructure.authz import require_admin
from app.domains.tariffs import schemas as tariff_schemas
from app.domains.tariffs import service as tariff_service

router = APIRouter(prefix="/tariffs", tags=["Tariffs & Services"])


@router.get("")
def get_tariffs(lang: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return tariff_service.get_tariffs(db, current_user, lang)


@router.post("/subscribe")
def subscribe_tariff(body: tariff_schemas.SubscribeRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return tariff_service.subscribe_tariff(db, current_user, body.tariff_id)


@router.get("/services")
def get_services(lang: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return tariff_service.get_services(db, lang)


@router.post("/services/request")
def create_service_request(body: tariff_schemas.ServiceRequestCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return tariff_service.create_service_request(db, current_user, body)


@router.post("/admin/plans")
def create_plan(body: tariff_schemas.PlanCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return tariff_service.create_plan(db, body)


@router.put("/admin/plans/{plan_id}")
def update_plan(plan_id: int, body: tariff_schemas.PlanUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return tariff_service.update_plan(db, plan_id, body)


@router.delete("/admin/plans/{plan_id}")
def deactivate_plan(plan_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return tariff_service.deactivate_plan(db, plan_id)


@router.post("/admin/plans/{plan_id}/features")
def set_plan_features(plan_id: int, features: List[tariff_schemas.FeatureItem], current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return tariff_service.set_plan_features(db, plan_id, features)
