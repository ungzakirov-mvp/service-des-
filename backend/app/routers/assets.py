from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timezone

from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_user

router = APIRouter(tags=["assets"])

def generate_readable_id(db: Session, tenant_id: int) -> str:
    last = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.tenant_id == tenant_id
    ).order_by(models.CustomerAsset.id.desc()).first()
    num = (last.id + 1) if last else 1
    return f"AST-{num:05d}"

# ============================================================================
# LIST / SEARCH ASSETS
# ============================================================================
@router.get("/api/assets", response_model=List[schemas.CustomerAssetResponse])
def list_assets(
    search: Optional[str] = None,
    asset_type: Optional[str] = None,
    status: Optional[str] = None,
    condition: Optional[str] = None,
    company_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.tenant_id == current_user.tenant_id
    )
    if search:
        q = f"%{search}%"
        query = query.filter(
            (models.CustomerAsset.name.ilike(q)) |
            (models.CustomerAsset.model.ilike(q)) |
            (models.CustomerAsset.serial_number.ilike(q)) |
            (models.CustomerAsset.inventory_number.ilike(q)) |
            (models.CustomerAsset.readable_id.ilike(q))
        )
    if asset_type:
        query = query.filter(models.CustomerAsset.asset_type == asset_type)
    if status:
        query = query.filter(models.CustomerAsset.status == status)
    if condition:
        query = query.filter(models.CustomerAsset.condition == condition)
    if company_id:
        query = query.filter(models.CustomerAsset.company_id == company_id)
    if assigned_to is not None:
        if assigned_to == 0:
            query = query.filter(models.CustomerAsset.assigned_to.is_(None))
        else:
            query = query.filter(models.CustomerAsset.assigned_to == assigned_to)

    assets = query.order_by(models.CustomerAsset.created_at.desc()).all()
    result = []
    for a in assets:
        item = schemas.CustomerAssetResponse.model_validate(a)
        if a.company:
            item.company_name = a.company.name
        if a.user:
            item.assigned_user_name = a.user.full_name or a.user.email
        item.ticket_count = len(a.tickets) if hasattr(a, 'tickets') else 0
        result.append(item)
    return result


@router.get("/api/assets/stats")
def asset_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    total = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.tenant_id == current_user.tenant_id
    ).count()
    active = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.tenant_id == current_user.tenant_id,
        models.CustomerAsset.status == "active"
    ).count()
    in_repair = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.tenant_id == current_user.tenant_id,
        models.CustomerAsset.status == "in_repair"
    ).count()
    decommissioned = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.tenant_id == current_user.tenant_id,
        models.CustomerAsset.status == "decommissioned"
    ).count()
    return {
        "total": total,
        "active": active,
        "in_repair": in_repair,
        "decommissioned": decommissioned
    }


# ============================================================================
# GET SINGLE ASSET WITH FULL HISTORY
# ============================================================================
@router.get("/api/assets/{asset_id}", response_model=schemas.AssetDetailResponse)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    a = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.id == asset_id,
        models.CustomerAsset.tenant_id == current_user.tenant_id
    ).first()
    if not a:
        raise HTTPException(404, "Asset not found")

    item = schemas.CustomerAssetResponse.model_validate(a)
    if a.company:
        item.company_name = a.company.name
    if a.user:
        item.assigned_user_name = a.user.full_name or a.user.email

    assignments = db.query(models.AssetAssignment).filter(
        models.AssetAssignment.asset_id == asset_id,
        models.AssetAssignment.tenant_id == current_user.tenant_id
    ).order_by(models.AssetAssignment.assigned_at.desc()).all()

    movements = db.query(models.AssetMovement).filter(
        models.AssetMovement.asset_id == asset_id,
        models.AssetMovement.tenant_id == current_user.tenant_id
    ).order_by(models.AssetMovement.moved_at.desc()).all()

    detail = schemas.AssetDetailResponse(
        **item.model_dump(),
        assignments=[_fmt_assign(aa) for aa in assignments],
        movements=[_fmt_move(mm) for mm in movements]
    )
    return detail


def _fmt_assign(aa):
    r = schemas.AssetAssignmentResponse.model_validate(aa)
    if aa.user:
        r.user_name = aa.user.full_name or aa.user.email
    if aa.assigner:
        r.assigned_by_name = aa.assigner.full_name or aa.assigner.email
    return r

def _fmt_move(mm):
    r = schemas.AssetMovementResponse.model_validate(mm)
    if mm.mover:
        r.moved_by_name = mm.mover.full_name or mm.mover.email
    return r


# ============================================================================
# CREATE ASSET
# ============================================================================
@router.post("/api/assets", response_model=schemas.CustomerAssetResponse, status_code=201)
def create_asset(
    data: schemas.CustomerAssetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    asset = models.CustomerAsset(
        tenant_id=current_user.tenant_id,
        readable_id=generate_readable_id(db, current_user.tenant_id),
        **data.model_dump()
    )
    if asset.assigned_to:
        asset.assigned_at = datetime.now(timezone.utc)
    db.add(asset)
    db.commit()
    db.refresh(asset)

    if asset.assigned_to:
        assignment = models.AssetAssignment(
            tenant_id=current_user.tenant_id,
            asset_id=asset.id,
            user_id=asset.assigned_to,
            assigned_by=current_user.id,
            reason="Первичная выдача"
        )
        db.add(assignment)
        db.commit()

    # Return response
    item = schemas.CustomerAssetResponse.model_validate(asset)
    if asset.company:
        item.company_name = asset.company.name
    if asset.user:
        item.assigned_user_name = asset.user.full_name or asset.user.email
    return item


# ============================================================================
# UPDATE ASSET
# ============================================================================
@router.put("/api/assets/{asset_id}", response_model=schemas.CustomerAssetResponse)
def update_asset(
    asset_id: int,
    data: schemas.CustomerAssetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    asset = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.id == asset_id,
        models.CustomerAsset.tenant_id == current_user.tenant_id
    ).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    prev_assigned = asset.assigned_to
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)

    # If assignment changed, create history record
    if data.assigned_to is not None and data.assigned_to != prev_assigned:
        at = data.assigned_to
        if at:
            asset.assigned_at = datetime.now(timezone.utc)
            assignment = models.AssetAssignment(
                tenant_id=current_user.tenant_id,
                asset_id=asset.id,
                user_id=at,
                assigned_by=current_user.id,
                reason="Перезакрепление"
            )
            db.add(assignment)
        else:
            # Return the asset
            asset.assigned_at = None
            open_assign = db.query(models.AssetAssignment).filter(
                models.AssetAssignment.asset_id == asset.id,
                models.AssetAssignment.tenant_id == current_user.tenant_id,
                models.AssetAssignment.returned_at.is_(None)
            ).first()
            if open_assign:
                open_assign.returned_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(asset)

    item = schemas.CustomerAssetResponse.model_validate(asset)
    if asset.company:
        item.company_name = asset.company.name
    if asset.user:
        item.assigned_user_name = asset.user.full_name or asset.user.email
    return item


# ============================================================================
# DELETE ASSET
# ============================================================================
@router.delete("/api/assets/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    asset = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.id == asset_id,
        models.CustomerAsset.tenant_id == current_user.tenant_id
    ).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted"}


# ============================================================================
# ASSIGN / RETURN
# ============================================================================
@router.post("/api/assets/{asset_id}/assign")
def assign_asset(
    asset_id: int,
    user_id: int = Query(...),
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    asset = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.id == asset_id,
        models.CustomerAsset.tenant_id == current_user.tenant_id
    ).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    # Close any open assignment
    open_assign = db.query(models.AssetAssignment).filter(
        models.AssetAssignment.asset_id == asset.id,
        models.AssetAssignment.tenant_id == current_user.tenant_id,
        models.AssetAssignment.returned_at.is_(None)
    ).first()
    if open_assign:
        open_assign.returned_at = datetime.now(timezone.utc)

    asset.assigned_to = user_id
    asset.assigned_at = datetime.now(timezone.utc)

    assignment = models.AssetAssignment(
        tenant_id=current_user.tenant_id,
        asset_id=asset.id,
        user_id=user_id,
        assigned_by=current_user.id,
        reason=reason or "Выдача сотруднику"
    )
    db.add(assignment)
    db.commit()
    return {"message": "Asset assigned", "user_id": user_id}


@router.post("/api/assets/{asset_id}/return")
def return_asset(
    asset_id: int,
    condition: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    asset = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.id == asset_id,
        models.CustomerAsset.tenant_id == current_user.tenant_id
    ).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    open_assign = db.query(models.AssetAssignment).filter(
        models.AssetAssignment.asset_id == asset.id,
        models.AssetAssignment.tenant_id == current_user.tenant_id,
        models.AssetAssignment.returned_at.is_(None)
    ).first()
    if not open_assign:
        raise HTTPException(400, "No active assignment found")

    open_assign.returned_at = datetime.now(timezone.utc)
    open_assign.return_condition = condition
    asset.assigned_to = None
    asset.assigned_at = None
    if condition:
        asset.condition = condition
    db.commit()
    return {"message": "Asset returned"}


@router.get("/api/assets/{asset_id}/assignments", response_model=List[schemas.AssetAssignmentResponse])
def get_assignments(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.AssetAssignment).filter(
        models.AssetAssignment.asset_id == asset_id,
        models.AssetAssignment.tenant_id == current_user.tenant_id
    ).order_by(models.AssetAssignment.assigned_at.desc()).all()
    result = []
    for aa in q:
        r = schemas.AssetAssignmentResponse.model_validate(aa)
        if aa.user:
            r.user_name = aa.user.full_name or aa.user.email
        if aa.assigner:
            r.assigned_by_name = aa.assigner.full_name or aa.assigner.email
        result.append(r)
    return result


# ============================================================================
# MOVEMENTS
# ============================================================================
@router.post("/api/assets/{asset_id}/move")
def move_asset(
    asset_id: int,
    to_location: str = Query(...),
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    asset = db.query(models.CustomerAsset).filter(
        models.CustomerAsset.id == asset_id,
        models.CustomerAsset.tenant_id == current_user.tenant_id
    ).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    from_loc = asset.location
    movement = models.AssetMovement(
        tenant_id=current_user.tenant_id,
        asset_id=asset.id,
        from_location=from_loc,
        to_location=to_location,
        moved_by=current_user.id,
        reason=reason
    )
    db.add(movement)
    asset.location = to_location
    db.commit()
    return {"message": "Asset moved", "from": from_loc, "to": to_location}


@router.get("/api/assets/{asset_id}/movements", response_model=List[schemas.AssetMovementResponse])
def get_movements(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.AssetMovement).filter(
        models.AssetMovement.asset_id == asset_id,
        models.AssetMovement.tenant_id == current_user.tenant_id
    ).order_by(models.AssetMovement.moved_at.desc()).all()
    result = []
    for mm in q:
        r = schemas.AssetMovementResponse.model_validate(mm)
        if mm.mover:
            r.moved_by_name = mm.mover.full_name or mm.mover.email
        result.append(r)
    return result


# ============================================================================
# ASSET TYPES LIST
# ============================================================================
@router.get("/api/assets/meta/types")
def asset_types():
    return {
        "types": [
            {"id": "laptop", "label": "Ноутбук", "icon": "fa-laptop"},
            {"id": "desktop", "label": "ПК", "icon": "fa-desktop"},
            {"id": "server", "label": "Сервер", "icon": "fa-server"},
            {"id": "printer", "label": "Принтер", "icon": "fa-print"},
            {"id": "network", "label": "Сетевое оборудование", "icon": "fa-wifi"},
            {"id": "monitor", "label": "Монитор", "icon": "fa-tv"},
            {"id": "phone", "label": "Телефон", "icon": "fa-mobile-alt"},
            {"id": "tablet", "label": "Планшет", "icon": "fa-tablet"},
            {"id": "other", "label": "Другое", "icon": "fa-box"}
        ],
        "statuses": [
            {"id": "active", "label": "Активно", "color": "#10b981"},
            {"id": "in_repair", "label": "В ремонте", "color": "#f59e0b"},
            {"id": "in_storage", "label": "На складе", "color": "#6b7280"},
            {"id": "decommissioned", "label": "Списано", "color": "#ef4444"},
            {"id": "lost", "label": "Утеряно", "color": "#dc2626"}
        ],
        "conditions": [
            {"id": "new", "label": "Новый", "color": "#10b981"},
            {"id": "excellent", "label": "Отличное", "color": "#34d399"},
            {"id": "good", "label": "Хорошее", "color": "#6ee7b7"},
            {"id": "fair", "label": "Удовлетворительное", "color": "#fbbf24"},
            {"id": "poor", "label": "Плохое", "color": "#f97316"},
            {"id": "damaged", "label": "Повреждено", "color": "#ef4444"},
            {"id": "broken", "label": "Сломано", "color": "#dc2626"}
        ]
    }
