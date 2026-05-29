from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from fastapi import HTTPException
from app.models import MonitoringMetric, Ticket, AuditLog, User


def receive_metrics(data: dict) -> dict:
    from app.infrastructure.database import SessionLocal
    import os
    tenant_id_val = data.get("tenant_id")
    if not tenant_id_val:
        raise HTTPException(status_code=400, detail="Missing tenant_id in payload")
    org_id = data.get("org_id", 1)
    host_name = data.get("host_name", "unknown")
    host_ip = data.get("host_ip", "0.0.0.0")
    metrics_data = data.get("metrics", [])
    if isinstance(metrics_data, dict):
        metrics_data = [metrics_data]

    db = SessionLocal()
    try:
        for m in metrics_data:
            metric = MonitoringMetric(
                tenant_id=tenant_id_val,
                org_id=org_id,
                host_name=host_name,
                host_ip=host_ip,
                metric_name=m.get("name", "unknown"),
                metric_value=str(m.get("value", 0)),
                metric_unit=m.get("unit", ""),
                status=m.get("status", "ok"),
                collected_at=datetime.now(timezone.utc),
            )
            db.add(metric)
        db.commit()
        return {"status": "ok", "received": len(metrics_data)}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()


def get_metrics(db: Session, user, org_id: Optional[int] = None, host: Optional[str] = None) -> list:
    try:
        query = db.query(MonitoringMetric)
        if user and user.tenant_id:
            query = query.filter(MonitoringMetric.tenant_id == user.tenant_id)
        if org_id:
            query = query.filter(MonitoringMetric.org_id == org_id)
        if host:
            query = query.filter(MonitoringMetric.host_name == host)
        query = query.order_by(desc(MonitoringMetric.collected_at)).limit(500)
        return query.all()
    except Exception as e:
        raise HTTPException(500, str(e))


def get_history(db: Session, user, org_id: Optional[int] = None, metric: Optional[str] = None, hours: int = 24) -> list:
    try:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = db.query(MonitoringMetric).filter(
            MonitoringMetric.collected_at >= since
        )
        if user and user.tenant_id:
            query = query.filter(MonitoringMetric.tenant_id == user.tenant_id)
        if org_id:
            query = query.filter(MonitoringMetric.org_id == org_id)
        if metric:
            query = query.filter(MonitoringMetric.metric_name == metric)
        query = query.order_by(MonitoringMetric.collected_at.asc())
        return query.all()
    except Exception as e:
        raise HTTPException(500, str(e))


def get_dashboard(db: Session, current_user: User) -> dict:
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User has no tenant context")
    tenant_id = current_user.tenant_id
    try:
        result = {}
        result["open_tickets"] = db.query(func.count(Ticket.id)).filter(
            Ticket.tenant_id == tenant_id
        ).scalar() or 0

        try:
            result["critical_count"] = db.query(func.count(MonitoringMetric.id)).filter(
                MonitoringMetric.tenant_id == tenant_id,
                MonitoringMetric.status == "critical"
            ).scalar() or 0
        except Exception:
            result["critical_count"] = 0

        result["online_users"] = 0

        recent_audit = db.query(AuditLog).filter(
            AuditLog.tenant_id == tenant_id
        ).order_by(desc(AuditLog.created_at)).limit(5).all()

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
