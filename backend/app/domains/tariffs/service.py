from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models_tariffs import TariffPlan, TariffFeature, OrgSubscription, ServiceCatalog, ServiceRequest, ServiceRequestItem


def _lang(lang: Optional[str] = None) -> str:
    if lang in ("ru", "en", "uz"):
        return lang
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


def get_tariffs(db: Session, current_user, lang: Optional[str] = None) -> dict:
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


def subscribe_tariff(db: Session, current_user, tariff_id: int) -> dict:
    tariff = db.query(TariffPlan).filter(TariffPlan.id == tariff_id, TariffPlan.is_active == True).first()
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
        tariff_id=tariff_id,
        status="active"
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    tp = db.query(TariffPlan).filter(TariffPlan.id == tariff_id).first()
    return {"success": True, "subscription_id": new_sub.id, "tariff_name": tp.name_ru if tp else ""}


def get_services(db: Session, lang: Optional[str] = None) -> dict:
    l = _lang(lang)
    services = db.query(ServiceCatalog).filter(ServiceCatalog.is_active == True).order_by(ServiceCatalog.sort_order).all()
    return {"services": [_service_dict(s, l) for s in services]}


def create_service_request(db: Session, current_user, body) -> dict:
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


def create_plan(db: Session, body) -> dict:
    p = TariffPlan(
        name_ru=body.name_ru, name_en=body.name_en, name_uz=body.name_uz,
        slug=body.slug, price_monthly=body.price_monthly,
        max_workstations=body.max_workstations,
        description_ru=body.description_ru, description_en=body.description_en,
        description_uz=body.description_uz,
        is_popular=body.is_popular, sort_order=body.sort_order
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "slug": p.slug}


def update_plan(db: Session, plan_id: int, body) -> dict:
    p = db.query(TariffPlan).filter(TariffPlan.id == plan_id).first()
    if not p:
        raise HTTPException(404, "Plan not found")
    if body.name_ru is not None: p.name_ru = body.name_ru
    if body.name_en is not None: p.name_en = body.name_en
    if body.name_uz is not None: p.name_uz = body.name_uz
    if body.price_monthly is not None: p.price_monthly = body.price_monthly
    if body.is_popular is not None: p.is_popular = body.is_popular
    if body.sort_order is not None: p.sort_order = body.sort_order
    db.commit()
    return {"success": True}


def deactivate_plan(db: Session, plan_id: int) -> dict:
    p = db.query(TariffPlan).filter(TariffPlan.id == plan_id).first()
    if not p:
        raise HTTPException(404, "Plan not found")
    p.is_active = False
    db.commit()
    return {"success": True}


def set_plan_features(db: Session, plan_id: int, features) -> dict:
    p = db.query(TariffPlan).filter(TariffPlan.id == plan_id).first()
    if not p:
        raise HTTPException(404, "Plan not found")
    db.query(TariffFeature).filter(TariffFeature.tariff_id == plan_id).delete()
    for i, f in enumerate(features):
        db.add(TariffFeature(
            tariff_id=plan_id, text_ru=f.text_ru, text_en=f.text_en,
            text_uz=f.text_uz, is_included=f.is_included, sort_order=i
        ))
    db.commit()
    return {"success": True}
