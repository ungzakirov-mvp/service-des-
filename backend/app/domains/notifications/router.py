from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app import schemas
from app.domains.notifications import queries as qry
from app.domains.notifications import permissions as perm

router = APIRouter(prefix="/notifications", tags=["Уведомления"])


@router.get("/", response_model=List[schemas.NotificationResponse])
def get_notifications(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return qry.get_user_notifications(db, current_user, limit)


@router.post("/{notif_id}/read")
def mark_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = qry.get_notification_or_404(db, notif_id, current_user)
    notif.is_read = True
    db.commit()
    return {"status": "ok"}


@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(type(current_user)).filter(
        type(current_user).id == current_user.id  # tenant-safe via user filter
    )
    from app.models import Notification
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.tenant_id == current_user.tenant_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok"}
