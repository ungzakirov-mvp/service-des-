from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta, date
from typing import Optional
from app.database import get_db
from app.models import Ticket, User, TicketStatus, TicketPriority, UserRole, Tenant, UserOrganization
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard v2"])


def _rid(tenant_id: int, db: Session):
    """Get resolved/final status IDs for a tenant."""
    return [s.id for s in db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id, TicketStatus.is_final == True
    ).all()]


def _org_tz(tenant_id: int, db: Session) -> str:
    """Get timezone string for organization."""
    t = db.query(Tenant.timezone).filter(Tenant.id == tenant_id).scalar()
    return t or "Asia/Tashkent"


def _sla_minutes(tenant_id: int, priority: str, db: Session) -> int:
    """Get SLA minutes for a given priority from org settings."""
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        return 60
    m = {
        TicketPriority.CRITICAL: t.sla_p1_minutes or 60,
        TicketPriority.HIGH: t.sla_p2_minutes or 240,
        TicketPriority.MEDIUM: t.sla_p3_minutes or 1440,
        TicketPriority.LOW: t.sla_p4_minutes or 4320,
    }
    return m.get(priority, 1440)


@router.get("")
def get_dashboard(
    org_id: Optional[str] = Query(None, description="Organization ID or 'all'"),
    limit: int = Query(6, ge=1, le=20),
    days: int = Query(14, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unified dashboard: all HUD metrics in one call."""
    now = datetime.utcnow()

    # --- Resolve org scope ---
    if org_id == "all" or (not org_id and current_user.tenant_id == 0):
        # 'all' mode: aggregate across all user's orgs
        orgs = db.query(UserOrganization.tenant_id).filter(
            UserOrganization.user_id == current_user.id,
            UserOrganization.is_active == True
        ).all()
        tenant_ids = [r[0] for r in orgs]
        if not tenant_ids:
            tenant_ids = [current_user.tenant_id] if current_user.tenant_id else []
    elif org_id:
        tenant_ids = [int(org_id)]
    else:
        tenant_ids = [current_user.tenant_id] if current_user.tenant_id else []

    org_filter = Ticket.tenant_id.in_(tenant_ids) if len(tenant_ids) > 1 else (Ticket.tenant_id == tenant_ids[0])
    org_filter_u = User.tenant_id.in_(tenant_ids) if len(tenant_ids) > 1 else (User.tenant_id == tenant_ids[0])

    rid = []
    for tid in tenant_ids:
        rid.extend(_rid(tid, db))
    rid = list(set(rid))

    base = db.query(Ticket).filter(org_filter)

    # ==============================
    # QUEUE METRICS
    # ==============================
    open_q = base.filter(Ticket.status_id.notin_(rid))

    total_open = open_q.count()
    assigned = open_q.filter(Ticket.assigned_to != None).count()
    unassigned = total_open - assigned
    in_progress = open_q.filter(Ticket.status_id.in_(
        db.query(TicketStatus.id).filter(TicketStatus.tenant_id.in_(tenant_ids), TicketStatus.name.ilike("%в работе%"))
    )).count() if rid else 0
    waiting_user = open_q.filter(Ticket.status_id.in_(
        db.query(TicketStatus.id).filter(TicketStatus.tenant_id.in_(tenant_ids), TicketStatus.name.ilike("%ожида%"))
    )).count() if rid else 0

    # Today's counts (using UTC for simplicity with SQLite)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    new_today = base.filter(Ticket.created_at >= today).count()
    resolved_today = base.filter(
        Ticket.status_id.in_(rid), Ticket.updated_at >= today
    ).count()

    # ==============================
    # SLA METRICS
    # ==============================
    breached = open_q.filter(
        Ticket.sla_due_at != None, Ticket.sla_due_at < now
    ).count()

    two_h = now + timedelta(hours=2)
    at_risk = open_q.filter(
        Ticket.sla_due_at != None, Ticket.sla_due_at >= now, Ticket.sla_due_at <= two_h
    ).count()

    # Compliance last 30d
    resolved_30d = base.filter(
        Ticket.status_id.in_(rid), Ticket.sla_due_at != None,
        Ticket.updated_at >= now - timedelta(days=30)
    ).all()
    sla_ok = sum(1 for t in resolved_30d if t.updated_at <= t.sla_due_at)
    compliance_pct = round(sla_ok / len(resolved_30d) * 100, 1) if resolved_30d else None

    # Delta vs previous 30d
    prev = base.filter(
        Ticket.status_id.in_(rid), Ticket.sla_due_at != None,
        Ticket.updated_at >= now - timedelta(days=60),
        Ticket.updated_at < now - timedelta(days=30)
    ).all()
    prev_ok = sum(1 for t in prev if t.updated_at <= t.sla_due_at)
    prev_rate = round(prev_ok / len(prev) * 100, 1) if prev else None
    compliance_delta = round(compliance_pct - prev_rate, 1) if compliance_pct is not None and prev_rate is not None else None

    # ==============================
    # PRIORITY BREAKDOWN
    # ==============================
    total_p = total_open
    priority_data = {}
    for p, label in [
        (TicketPriority.CRITICAL, "p1"),
        (TicketPriority.HIGH, "p2"),
        (TicketPriority.MEDIUM, "p3"),
        (TicketPriority.LOW, "p4"),
    ]:
        c = open_q.filter(Ticket.priority == p).count()
        pct = round(c / total_p * 100, 1) if total_p else 0
        priority_data[label] = {"count": c, "pct": pct}

    # ==============================
    # AGENTS
    # ==============================
    five_min = now - timedelta(minutes=5)
    fifteen_min = now - timedelta(minutes=15)
    max_capacity = 20

    agents_raw = db.query(User).filter(
        org_filter_u, User.role.in_([UserRole.AGENT, UserRole.ADMIN])
    ).all()

    agents_list = []
    for a in agents_raw:
        active = open_q.filter(Ticket.assigned_to == a.id).count()
        last_seen = a.updated_at or a.created_at
        is_online = last_seen and last_seen > five_min
        is_idle = last_seen and last_seen > fifteen_min and not is_online
        capacity = min(100, round(active / max(max_capacity, 1) * 100))
        agents_list.append({
            "id": a.id,
            "name": a.full_name,
            "status": "online" if is_online else ("idle" if is_idle else "offline"),
            "active_tickets": active,
            "capacity_pct": capacity,
        })

    rank = {"online": 0, "idle": 1, "offline": 2}
    agents_list.sort(key=lambda x: (rank.get(x["status"], 9), -x["active_tickets"]))
    online_count = sum(1 for a in agents_list if a["status"] == "online")
    idle_count = sum(1 for a in agents_list if a["status"] == "idle")
    offline_count = sum(1 for a in agents_list if a["status"] == "offline")

    # ==============================
    # CRITICAL TICKETS
    # ==============================
    critical_q = open_q.filter(
        Ticket.sla_due_at != None
    ).order_by(Ticket.sla_due_at.asc()).limit(limit).all()

    critical_list = []
    for t in critical_q:
        rem = (t.sla_due_at - now).total_seconds()
        rem_min = int(rem // 60)
        sign = "-" if rem <= 0 else "+"
        h = abs(rem_min) // 60
        m = abs(rem_min) % 60
        assignee_name = ""
        if t.assignee:
            assignee_name = t.assignee.full_name or ""
        critical_list.append({
            "id": t.id,
            "number": t.readable_id,
            "title": t.title,
            "priority": t.priority,
            "sla_remaining_minutes": rem_min,
            "assignee_name": assignee_name,
        })

    # ==============================
    # FLOW 14D
    # ==============================
    start = now - timedelta(days=days)
    dates = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days + 1)]

    # Build date series in Python
    created_series = {d: 0 for d in dates}
    resolved_series = {d: 0 for d in dates}
    breached_series = {d: 0 for d in dates}

    for row in db.query(
        func.date(Ticket.created_at).label("day"),
        func.count(Ticket.id)
    ).filter(org_filter, Ticket.created_at >= start).group_by("day").all():
        created_series[row[0]] = row[1]

    for row in db.query(
        func.date(Ticket.updated_at).label("day"),
        func.count(Ticket.id)
    ).filter(org_filter, Ticket.status_id.in_(rid), Ticket.updated_at >= start).group_by("day").all():
        resolved_series[row[0]] = row[1]

    for row in db.query(
        func.date(Ticket.sla_due_at).label("day"),
        func.count(Ticket.id)
    ).filter(org_filter, Ticket.sla_due_at >= start, Ticket.sla_due_at <= now, Ticket.status_id.notin_(rid)).group_by("day").all():
        breached_series[row[0]] = row[1]

    flow_labels = []
    flow_created = []
    flow_resolved = []
    flow_breached = []
    for d in dates:
        flow_labels.append(d[-5:])  # MM-DD
        flow_created.append(created_series.get(d, 0))
        flow_resolved.append(resolved_series.get(d, 0))
        flow_breached.append(breached_series.get(d, 0))

    # ==============================
    # KPI
    # ==============================
    # MTTR (resolved last 30d)
    mttr_min = None
    if resolved_30d:
        total_sec = sum((t.updated_at - t.created_at).total_seconds() for t in resolved_30d if t.created_at and t.updated_at)
        mttr_min = round(total_sec / len(resolved_30d) / 60) if resolved_30d else None

    # MTTA (first response last 30d)
    mtta_min = None
    mtta_data = base.filter(
        Ticket.first_response_at != None,
        Ticket.created_at >= now - timedelta(days=30)
    ).all()
    if mtta_data:
        total_sec = sum((t.first_response_at - t.created_at).total_seconds() for t in mtta_data if t.created_at and t.first_response_at)
        mtta_min = round(total_sec / len(mtta_data) / 60, 1) if mtta_data else None

    # FCR (resolved with <= 2 comments)
    fcr_pct = None
    from app.models import TicketTimeline
    fcr_data = base.filter(
        Ticket.status_id.in_(rid),
        Ticket.updated_at >= now - timedelta(days=30)
    ).all()
    if fcr_data:
        fcr_ok = 0
        for t in fcr_data:
            comment_count = db.query(TicketTimeline).filter(
                TicketTimeline.ticket_id == t.id,
                TicketTimeline.event_type == "comment"
            ).count()
            if comment_count <= 2:
                fcr_ok += 1
        fcr_pct = round(fcr_ok / len(fcr_data) * 100) if fcr_data else None

    # CSAT
    csat_val = db.query(func.avg(Ticket.rating)).filter(
        org_filter, Ticket.rating != None,
        Ticket.resolved_at >= now - timedelta(days=30)
    ).scalar()
    csat = round(float(csat_val), 1) if csat_val else None
    csat_total = base.filter(
        Ticket.rating != None,
        Ticket.resolved_at >= now - timedelta(days=30)
    ).count()

    # Backlog >7d
    backlog_7d = open_q.filter(Ticket.created_at < now - timedelta(days=7)).count()

    # ==============================
    # BUILD RESPONSE (spec format)
    # ==============================
    return {
        "queue": {
            "open": total_open,
            "new_today": new_today,
            "resolved_today": resolved_today,
            "assigned": assigned,
            "unassigned": unassigned,
            "in_progress": in_progress,
            "waiting_user": waiting_user,
        },
        "sla": {
            "compliance_pct": compliance_pct,
            "compliance_delta_24h": compliance_delta,
            "breached": breached,
            "at_risk": at_risk,
        },
        "priority": priority_data,
        "agents": agents_list,
        "agents_summary": {
            "online": online_count,
            "idle": idle_count,
            "offline": offline_count,
        },
        "critical_tickets": critical_list,
        "flow_14d": {
            "labels": flow_labels,
            "created": flow_created,
            "resolved": flow_resolved,
            "breached": flow_breached,
        },
        "kpi": {
            "mttr_minutes": mttr_min,
            "mtta_minutes": mtta_min,
            "fcr_pct": fcr_pct,
            "csat": csat,
            "csat_total_reviews": csat_total,
            "backlog_7d": backlog_7d,
        },
    }
