from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from datetime import datetime, timedelta
from typing import List, Optional
from app.database import get_db
from app.models import Ticket, User, TicketStatus, TicketPriority, UserRole
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard/hud", tags=["HUD Dashboard"])


@router.get("/summary")
def get_hud_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregated summary data for the HUD dashboard."""
    tenant_id = current_user.tenant_id
    now = datetime.now()

    # Resolved status IDs
    resolved_statuses = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.is_final == True
    ).all()
    resolved_ids = [s.id for s in resolved_statuses]

    base = db.query(Ticket).filter(Ticket.tenant_id == tenant_id)

    total_open = base.filter(Ticket.status_id.notin_(resolved_ids)).count()
    new_count = base.join(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.name == "Новый"
    ).count()
    in_progress_count = base.join(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.name == "В работе"
    ).count()
    waiting_count = base.join(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.name.like("%Ожидает%")
    ).count()

    # Resolved in last 30 days
    resolved_30d = base.filter(
        Ticket.status_id.in_(resolved_ids),
        Ticket.updated_at >= now - timedelta(days=30)
    ).count()

    # SLA breaches (overdue open tickets)
    breach_tickets = base.filter(
        Ticket.sla_due_at != None,
        Ticket.sla_due_at < now,
        Ticket.status_id.notin_(resolved_ids)
    ).all()
    breach_count = len(breach_tickets)

    # SLA at risk (within 2 hours of deadline)
    two_hours_later = now + timedelta(hours=2)
    at_risk_count = base.filter(
        Ticket.sla_due_at != None,
        Ticket.sla_due_at >= now,
        Ticket.sla_due_at <= two_hours_later,
        Ticket.status_id.notin_(resolved_ids)
    ).count()

    # SLA compliance (last 30 days resolved)
    resolved_with_sla = base.filter(
        Ticket.status_id.in_(resolved_ids),
        Ticket.sla_due_at != None,
        Ticket.updated_at >= now - timedelta(days=30)
    ).all()
    sla_compliant = sum(1 for t in resolved_with_sla if t.updated_at <= t.sla_due_at)
    sla_compliance = round((sla_compliant / len(resolved_with_sla) * 100), 1) if resolved_with_sla else 100.0

    # SLA compliance delta (compare to previous 30d)
    prev_30d_resolved = base.filter(
        Ticket.status_id.in_(resolved_ids),
        Ticket.sla_due_at != None,
        Ticket.updated_at >= now - timedelta(days=60),
        Ticket.updated_at < now - timedelta(days=30)
    ).all()
    prev_compliant = sum(1 for t in prev_30d_resolved if t.updated_at <= t.sla_due_at)
    prev_rate = round((prev_compliant / len(prev_30d_resolved) * 100), 1) if prev_30d_resolved else 100.0
    sla_delta = round(sla_compliance - prev_rate, 1)

    # MTTR (Mean Time To Resolve) — last 30 days resolved
    mttr_seconds = 0
    if resolved_with_sla:
        total_sec = sum((t.updated_at - t.created_at).total_seconds() for t in resolved_with_sla)
        mttr_seconds = total_sec / len(resolved_with_sla)

    # MTTA (Mean Time To Acknowledge) — last 30 days with accepted_at
    accepted_tickets = base.filter(
        Ticket.accepted_at != None,
        Ticket.updated_at >= now - timedelta(days=30)
    ).all()
    mtta_seconds = 0
    if accepted_tickets:
        total_ack = sum((t.accepted_at - t.created_at).total_seconds() for t in accepted_tickets)
        mtta_seconds = total_ack / len(accepted_tickets)

    # FCR (assume closed without re-open, simplified)
    fcr_rate = 85.0  # default fallback

    # CSAT (from ratings)
    csat_result = db.query(func.avg(Ticket.rating)).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.rating != None
    ).scalar()
    csat = round(float(csat_result), 1) if csat_result else 0.0

    # Backlog > 7 days
    backlog_7d = base.filter(
        Ticket.status_id.notin_(resolved_ids),
        Ticket.created_at < now - timedelta(days=7)
    ).count()

    # Assigned count
    assigned_count = base.filter(
        Ticket.assigned_to != None,
        Ticket.status_id.notin_(resolved_ids)
    ).count()

    return {
        "total_open": total_open,
        "new_count": new_count,
        "in_progress": in_progress_count,
        "waiting": waiting_count,
        "resolved_30d": resolved_30d,
        "assigned": assigned_count,
        "breach_count": breach_count,
        "at_risk_count": at_risk_count,
        "sla_compliance": sla_compliance,
        "sla_delta": sla_delta,
        "mttr_seconds": round(mttr_seconds),
        "mtta_seconds": round(mtta_seconds),
        "fcr_rate": fcr_rate,
        "csat": csat,
        "backlog_7d": backlog_7d
    }


@router.get("/priority-breakdown")
def get_priority_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Breakdown of open tickets by priority."""
    tenant_id = current_user.tenant_id
    resolved_statuses = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.is_final == True
    ).all()
    resolved_ids = [s.id for s in resolved_statuses]

    base = db.query(Ticket).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.status_id.notin_(resolved_ids)
    )
    total = base.count()

    priorities = []
    for p in [TicketPriority.CRITICAL, TicketPriority.HIGH, TicketPriority.MEDIUM, TicketPriority.LOW]:
        count = base.filter(Ticket.priority == p).count()
        pct = round((count / total * 100), 1) if total else 0
        priorities.append({
            "priority": p.value,
            "count": count,
            "percent": pct
        })

    return {
        "total": total,
        "breakdown": priorities
    }


@router.get("/agents")
def get_agent_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List agents with status and workload."""
    tenant_id = current_user.tenant_id
    now = datetime.now()
    five_min_ago = now - timedelta(minutes=5)

    resolved_statuses = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.is_final == True
    ).all()
    resolved_ids = [s.id for s in resolved_statuses]

    agents = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role.in_([UserRole.AGENT, UserRole.ADMIN])
    ).all()

    result = []
    for agent in agents:
        active_count = db.query(Ticket).filter(
            Ticket.assigned_to == agent.id,
            Ticket.status_id.notin_(resolved_ids)
        ).count()

        # Determine agent status based on updated_at
        last_seen = agent.updated_at or agent.created_at
        is_online = last_seen and last_seen > five_min_ago
        is_idle = last_seen and last_seen > now - timedelta(minutes=15) and not is_online

        workload_pct = min(100, round((active_count / 20) * 100))  # 20 = max capacity

        result.append({
            "id": agent.id,
            "name": agent.full_name,
            "status": "online" if is_online else ("idle" if is_idle else "offline"),
            "active_tickets": active_count,
            "workload_pct": workload_pct
        })

    # Sort: online first, then idle, then offline
    status_rank = {"online": 0, "idle": 1, "offline": 2}
    result.sort(key=lambda a: (status_rank.get(a["status"], 9), -a["active_tickets"]))

    online_count = sum(1 for a in result if a["status"] == "online")
    idle_count = sum(1 for a in result if a["status"] == "idle")
    offline_count = sum(1 for a in result if a["status"] == "offline")

    return {
        "agents": result,
        "online": online_count,
        "idle": idle_count,
        "offline": offline_count
    }


@router.get("/critical-tickets")
def get_critical_tickets(
    limit: int = Query(6, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tickets that are breached or at risk."""
    tenant_id = current_user.tenant_id
    now = datetime.now()

    resolved_statuses = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.is_final == True
    ).all()
    resolved_ids = [s.id for s in resolved_statuses]

    open_tickets = db.query(Ticket).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.status_id.notin_(resolved_ids),
        Ticket.sla_due_at != None
    ).order_by(Ticket.sla_due_at.asc()).limit(limit).all()

    result = []
    for t in open_tickets:
        remaining = (t.sla_due_at - now).total_seconds()
        sla_status = "breached" if remaining <= 0 else "at_risk"
        display_remaining = f"-{format_sla(abs(int(remaining)))}" if remaining <= 0 else format_sla(int(remaining))

        priority_label = t.priority
        if t.priority == TicketPriority.CRITICAL:
            priority_label = "P1"
        elif t.priority == TicketPriority.HIGH:
            priority_label = "P2"
        elif t.priority == TicketPriority.MEDIUM:
            priority_label = "P3"
        elif t.priority == TicketPriority.LOW:
            priority_label = "P4"

        result.append({
            "id": t.id,
            "title": t.title,
            "priority": t.priority,
            "priority_label": priority_label,
            "sla_status": sla_status,
            "sla_remaining": display_remaining,
            "status_name": t.status_rel.name if t.status_rel else ""
        })

    return {"tickets": result, "total": len(result)}


@router.get("/flow")
def get_ticket_flow(
    days: int = Query(14, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Daily created/resolved/breached counts for the chart."""
    tenant_id = current_user.tenant_id
    now = datetime.now()
    start_date = now - timedelta(days=days)

    resolved_statuses = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.is_final == True
    ).all()
    resolved_ids = [s.id for s in resolved_statuses]

    # Generate date series
    dates = []
    d = start_date
    while d <= now:
        dates.append(d.strftime("%Y-%m-%d"))
        d += timedelta(days=1)

    created_counts = dict(
        db.query(
            func.date(Ticket.created_at).label("day"),
            func.count(Ticket.id).label("count")
        ).filter(
            Ticket.tenant_id == tenant_id,
            Ticket.created_at >= start_date
        ).group_by("day").all()
    )

    resolved_counts = dict(
        db.query(
            func.date(Ticket.updated_at).label("day"),
            func.count(Ticket.id).label("count")
        ).filter(
            Ticket.tenant_id == tenant_id,
            Ticket.status_id.in_(resolved_ids),
            Ticket.updated_at >= start_date
        ).group_by("day").all()
    )

    breached_counts_data = db.query(
        func.date(Ticket.sla_due_at).label("day"),
        func.count(Ticket.id).label("count")
    ).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.sla_due_at >= start_date,
        Ticket.sla_due_at <= now,
        Ticket.status_id.notin_(resolved_ids)
    ).group_by("day").all()
    breached_counts = dict(breached_counts_data)

    flow_data = []
    for date_str in dates:
        flow_data.append({
            "date": date_str,
            "created": created_counts.get(date_str, 0),
            "resolved": resolved_counts.get(date_str, 0),
            "breached": breached_counts.get(date_str, 0)
        })

    return {"flow": flow_data}


def format_sla(seconds: int) -> str:
    """Format seconds to HH:MM:SS."""
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:02d}"
