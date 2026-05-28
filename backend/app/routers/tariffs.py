from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from app.database import get_db
from app.models_tariffs import TariffPlan, TariffFeature, OrgSubscription, ServiceCatalog, ServiceRequest, ServiceRequestItem
from app.models import User, UserRole
from app.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/tariffs", tags=["Tariffs & Services"])


def _lang(request_lang: Optional[str] = None, accept_language: str = "ru") -> str:
    if request_lang in ("ru", "en", "uz"):
        return request_lang
    for l in accept_language.split(","):
        l = l.strip().split(";")[0].strip()[:2].lower()
        if l in ("ru", "en", "uz"):
            return l
    return "ru"


def _plan_dict(p, lang):
    d = {
        "id": p.id,
        "slug": p.slug,
        "name": getattr(p, f"name_{lang}", p.name_ru),
        "price_monthly": p.price_monthly,
        "max_workstations": p.max_workstations,
        "description": getattr(p, f"description_{lang}", p.description_ru) or "",
        "is_popular": p.is_popular,
        "sort_order": p.sort_order,
        "features": []
    }
    if p.features:
        for f in sorted(p.features, key=lambda x: x.sort_order):
            d["features"].append({
                "text": getattr(f, f"text_{lang}", f.text_ru),
                "is_included": f.is_included
            })
    return d


def _service_dict(s, lang):
    return {
        "id": s.id,
        "name": getattr(s, f"name_{lang}", s.name_ru),
        "description": getattr(s, f"description_{lang}", s.description_ru) or "",
        "price": s.price,
        "price_unit": getattr(s, f"price_unit_{lang}", s.price_unit_ru),
        "price_type": s.price_type,
        "is_quantifiable": s.is_quantifiable,
        "min_quantity": s.min_quantity,
        "max_quantity": s.max_quantity,
        "category": s.category,
        "icon_name": s.icon_name,
        "sort_order": s.sort_order
    }


@router.get("")
def get_tariffs(lang: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    l = _lang(lang)
    plans = db.query(TariffPlan).filter(TariffPlan.is_active == True).order_by(TariffPlan.sort_order).all()
    result = [_plan_dict(p, l) for p in plans]
    current = db.query(OrgSubscription).filter(
        OrgSubscription.tenant_id == current_user.tenant_id,
        OrgSubscription.status == "active"
    ).first()
    current_plan = None
    if current:
        tp = db.query(TariffPlan).filter(TariffPlan.id == current.tariff_id).first()
        if tp:
            current_plan = {
                "tariff_id": tp.id,
                "tariff_slug": tp.slug,
                "tariff_name": getattr(tp, f"name_{l}", tp.name_ru),
                "status": current.status,
                "started_at": current.started_at.isoformat() if current.started_at else None,
                "expires_at": current.expires_at.isoformat() if current.expires_at else None
            }
    return {"plans": result, "current_plan": current_plan}


class SubscribeRequest(BaseModel):
    tariff_id: int

@router.post("/subscribe")
def subscribe_tariff(body: SubscribeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Only admin can change tariff")
    tariff = db.query(TariffPlan).filter(TariffPlan.id == body.tariff_id, TariffPlan.is_active == True).first()
    if not tariff:
        raise HTTPException(404, "Tariff not found")
    active = db.query(OrgSubscription).filter(
        OrgSubscription.tenant_id == current_user.tenant_id,
        OrgSubscription.status == "active"
    ).first()
    if active:
        active.status = "expired"
    new_sub = OrgSubscription(
        tenant_id=current_user.tenant_id,
        tariff_id=body.tariff_id,
        status="active"
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    tp = db.query(TariffPlan).filter(TariffPlan.id == body.tariff_id).first()
    return {"success": True, "subscription_id": new_sub.id, "tariff_name": tp.name_ru if tp else ""}


@router.get("/services")
def get_services(lang: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    l = _lang(lang)
    services = db.query(ServiceCatalog).filter(ServiceCatalog.is_active == True).order_by(ServiceCatalog.sort_order).all()
    return {"services": [_service_dict(s, l) for s in services]}


class ServiceItemReq(BaseModel):
    service_id: int
    quantity: int = 1

class ServiceRequestCreate(BaseModel):
    items: List[ServiceItemReq]
    notes: Optional[str] = None

@router.post("/services/request")
def create_service_request(body: ServiceRequestCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.items:
        raise HTTPException(400, "Select at least one service")
    total_monthly = 0
    total_one_time = 0
    req = ServiceRequest(
        tenant_id=current_user.tenant_id,
        requested_by=current_user.id,
        status="pending",
        notes=body.notes
    )
    db.add(req)
    db.flush()
    for item in body.items:
        svc = db.query(ServiceCatalog).filter(ServiceCatalog.id == item.service_id, ServiceCatalog.is_active == True).first()
        if not svc:
            raise HTTPException(404, f"Service {item.service_id} not found")
        qty = max(svc.min_quantity, min(item.quantity, svc.max_quantity)) if svc.is_quantifiable else 1
        subtotal = svc.price * qty
        ri = ServiceRequestItem(
            request_id=req.id,
            service_id=svc.id,
            quantity=qty,
            unit_price=svc.price,
            subtotal=subtotal
        )
        if svc.price_type == "monthly":
            total_monthly += subtotal
        else:
            total_one_time += subtotal
        db.add(ri)
    req.total_monthly = total_monthly
    req.total_one_time = total_one_time
    db.commit()
    db.refresh(req)
    return {"request_id": req.id, "total_monthly": total_monthly, "total_one_time": total_one_time}


# --- Admin CRUD ---

@router.post("/admin/plans")
def create_plan(name_ru: str, name_en: str, name_uz: str, slug: str, price_monthly: int,
                max_workstations: Optional[int] = None, description_ru: Optional[str] = None,
                description_en: Optional[str] = None, description_uz: Optional[str] = None,
                is_popular: bool = False, sort_order: int = 0,
                current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Admin only")
    p = TariffPlan(name_ru=name_ru, name_en=name_en, name_uz=name_uz, slug=slug,
                   price_monthly=price_monthly, max_workstations=max_workstations,
                   description_ru=description_ru, description_en=description_en, description_uz=description_uz,
                   is_popular=is_popular, sort_order=sort_order)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "slug": p.slug}


@router.put("/admin/plans/{plan_id}")
def update_plan(plan_id: int, name_ru: Optional[str] = None, name_en: Optional[str] = None,
                name_uz: Optional[str] = None, price_monthly: Optional[int] = None,
                is_popular: Optional[bool] = None, sort_order: Optional[int] = None,
                current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Admin only")
    p = db.query(TariffPlan).filter(TariffPlan.id == plan_id).first()
    if not p:
        raise HTTPException(404, "Plan not found")
    if name_ru is not None: p.name_ru = name_ru
    if name_en is not None: p.name_en = name_en
    if name_uz is not None: p.name_uz = name_uz
    if price_monthly is not None: p.price_monthly = price_monthly
    if is_popular is not None: p.is_popular = is_popular
    if sort_order is not None: p.sort_order = sort_order
    db.commit()
    return {"success": True}


@router.delete("/admin/plans/{plan_id}")
def deactivate_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Admin only")
    p = db.query(TariffPlan).filter(TariffPlan.id == plan_id).first()
    if not p:
        raise HTTPException(404, "Plan not found")
    p.is_active = False
    db.commit()
    return {"success": True}


class FeatureItem(BaseModel):
    text_ru: str
    text_en: str
    text_uz: str
    is_included: bool = True

@router.post("/admin/plans/{plan_id}/features")
def set_plan_features(plan_id: int, features: List[FeatureItem],
                       current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(403, "Admin only")
    p = db.query(TariffPlan).filter(TariffPlan.id == plan_id).first()
    if not p:
        raise HTTPException(404, "Plan not found")
    db.query(TariffFeature).filter(TariffFeature.tariff_id == plan_id).delete()
    for i, f in enumerate(features):
        db.add(TariffFeature(tariff_id=plan_id, text_ru=f.text_ru, text_en=f.text_en, text_uz=f.text_uz, is_included=f.is_included, sort_order=i))
    db.commit()
    return {"success": True}
