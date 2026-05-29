from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models import Notification, User


def get_user_notifications(db: Session, user: User, limit: int = 20) -> List[Notification]:
    return db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.tenant_id == user.tenant_id
    ).order_by(Notification.created_at.desc()).limit(limit).all()


def get_notification_or_404(db: Session, notif_id: int, user: User) -> Notification:
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == user.id,
        Notification.tenant_id == user.tenant_id
    ).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    return notif
