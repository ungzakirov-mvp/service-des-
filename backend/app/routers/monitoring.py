from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, text
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os

from app.database import get_db, SessionLocal
from app import models, schemas
from app.dependencies import get_current_user
from app.security import verify_token

router = APIRouter(tags=["monitoring"])

API_KEY = os.environ.get("MONITORING_API_KEY", "sk-servicedesk-monitor-2026")

# Optional OAuth2 scheme that doesn't auto-raise 401
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Accept X-API-Key or JWT token. Returns None if API key is used."""
    if x_api_key and x_api_key == API_KEY:
        return None
    if token:
        payload = verify_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = db.query(models.User).filter(models.User.id == int(user_id)).first()
                if user:
                    return user
    raise HTTPException(401, "Authentication required")


@router.post("/monitoring/metrics")
def receive_metrics(data: dict, x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(403, "Invalid API key")
    db = SessionLocal()
    try:
        org_id = data.get("org_id", 1)
        host_name = data.get("host_name", "unknown")
        host_ip = data.get("host_ip", "0.0.0.0")
        metrics = data.get("metrics", [])
        if isinstance(metrics, dict):
            metrics = [metrics]

        for m in metrics:
            db.execute(text(
                "INSERT INTO monitoring_metrics (tenant_id, org_id, host_name, host_ip, "
                "metric_name, metric_value, metric_unit, status, collected_at) VALUES "
                "(:t, :o, :h, :ip, :n, :v, :u, :s, :c)"
            ), {
                "t": data.get("tenant_id", 1), "o": org_id, "h": host_name,
                "ip": host_ip, "n": m.get("name", "unknown"),
                "v": str(m.get("value", 0)), "u": m.get("unit", ""),
                "s": m.get("status", "ok"),
                "c": datetime.now(timezone.utc).isoformat()
            })
        db.commit()
        return {"status": "ok", "received": len(metrics)}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()


@router.get("/monitoring/metrics")
async def get_metrics(org_id: Optional[int] = None, host: Optional[str] = None,
                      user=Depends(get_optional_user),
                      db: Session = Depends(get_db)):
    try:
        query = "SELECT * FROM monitoring_metrics WHERE 1=1"
        params = {}
        if org_id:
            query += " AND org_id = :org_id"
            params["org_id"] = org_id
        if host:
            query += " AND host_name = :host"
            params["host"] = host
        query += " ORDER BY collected_at DESC LIMIT 500"
        result = db.execute(text(query), params)
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/monitoring/history")
async def get_history(org_id: Optional[int] = None, metric: Optional[str] = None,
                      hours: int = 24,
                      user=Depends(get_optional_user),
                      db: Session = Depends(get_db)):
    try:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = "SELECT * FROM monitoring_metrics WHERE collected_at >= :since"
        params = {"since": since.isoformat()}
        if org_id:
            query += " AND org_id = :org_id"
            params["org_id"] = org_id
        if metric:
            query += " AND metric_name = :metric"
            params["metric"] = metric
        query += " ORDER BY collected_at ASC"
        result = db.execute(text(query), params)
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/monitoring/dashboard")
async def get_dashboard(user=Depends(get_optional_user),
                        db: Session = Depends(get_db)):
    tenant_id = user.tenant_id if user else 1
    try:
        result = {}
        result["open_tickets"] = db.query(func.count(models.Ticket.id)).filter(
            models.Ticket.tenant_id == tenant_id
        ).scalar() or 0

        try:
            result["critical_count"] = db.execute(text(
                "SELECT COUNT(*) as cnt FROM monitoring_metrics WHERE status = 'critical'"
            )).scalar() or 0
        except Exception:
            result["critical_count"] = 0

        result["online_users"] = 0

        recent_audit = db.query(models.AuditLog).filter(
            models.AuditLog.tenant_id == tenant_id
        ).order_by(desc(models.AuditLog.created_at)).limit(5).all()

        result["recent_audit"] = [{
            "action": a.action,
            "target_type": a.target_type,
            "target_id": a.target_id,
            "created_at": str(a.created_at),
            "user_email": a.user.email if a.user else "System"
        } for a in recent_audit]

        return result
    except Exception as e:
        raise HTTPException(500, str(e))