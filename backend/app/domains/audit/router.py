from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.domains.audit import queries as qry
from app.domains.audit import permissions as perm
from app.domains.audit.schemas import AuditLogResponse

router = APIRouter(prefix="/admin/audit", tags=["Audit Log"])


@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    target_type: Optional[str] = Query(None),
    target_id: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not perm.can_view_audit_logs(current_user.role):
        raise HTTPException(403, detail="Insufficient permissions to view audit logs")

    query = qry.build_audit_query(
        db, tenant_id=current_user.tenant_id,
        action=action,
        user_id=user_id,
        target_type=target_type,
        target_id=target_id,
        date_from=date_from,
        date_to=date_to,
    )
    return query.limit(limit).all()
