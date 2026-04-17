from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Ticket, User, TicketStatus, TicketPriority, UserRole, Company, TicketTimeline
from app.dependencies import get_current_user
from app import schemas
from fastapi.responses import StreamingResponse
import csv
import io

router = APIRouter(prefix="/reports", tags=["Отчёты"])

def get_period_dates(period: str):
    now = datetime.now()
    if period == 'today':
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    elif period == 'week':
        week_start = now - timedelta(days=now.weekday())
        return week_start.replace(hour=0, minute=0, second=0, microsecond=0), now
    elif period == 'month':
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return month_start, now
    elif period == 'quarter':
        quarter_start = now.replace(month=(now.month // 3) * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return quarter_start, now
    elif period == 'year':
        year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return year_start, now
    else:
        return now - timedelta(days=30), now

@router.get("/tickets", response_model=schemas.ReportResponse)
def get_tickets_report(
    period: str = Query("month"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    date_from, date_to = get_period_dates(period)
    tenant_id = current_user.tenant_id
    
    tickets = db.query(Ticket).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.created_at >= date_from,
        Ticket.created_at <= date_to
    ).all()
    
    resolved_statuses = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.is_final == True
    ).all()
    resolved_ids = [s.id for s in resolved_statuses]
    
    total = len(tickets)
    resolved = len([t for t in tickets if t.status_id in resolved_ids])
    critical = len([t for t in tickets if t.priority == 'критичный'])
    high = len([t for t in tickets if t.priority == 'высокий'])
    medium = len([t for t in tickets if t.priority == 'средний'])
    low = len([t for t in tickets if t.priority == 'низкий'])
    overdue = len([t for t in tickets if t.sla_due_at and t.sla_due_at < datetime.now() and t.status_id not in resolved_ids])
    
    items = []
    for t in tickets:
        creator = db.query(User).filter(User.id == t.created_by).first()
        assignee = db.query(User).filter(User.id == t.assigned_to).first()
        company = db.query(Company).filter(Company.id == t.company_id).first()
        status = db.query(TicketStatus).filter(TicketStatus.id == t.status_id).first()
        
        items.append({
            "id": t.id,
            "readable_id": t.readable_id,
            "title": t.title,
            "description": t.description,
            "status": status.name if status else "",
            "priority": t.priority,
            "company_name": company.name if company else "",
            "creator_name": creator.full_name if creator else "",
            "assignee_name": assignee.full_name if assignee else "",
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            "resolved_at": t.updated_at.isoformat() if t.status_id in resolved_ids else None
        })
    
    return schemas.ReportResponse(
        type="tickets",
        period=period,
        total=total,
        resolved=resolved,
        data=items,
        summary={
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
            "overdue": overdue,
            "resolution_rate": round(resolved / total * 100, 1) if total > 0 else 0
        }
    )

@router.get("/users", response_model=schemas.ReportResponse)
def get_users_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tenant_id = current_user.tenant_id
    
    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    
    admins = len([u for u in users if u.role == UserRole.ADMIN])
    agents = len([u for u in users if u.role == UserRole.AGENT])
    clients = len([u for u in users if u.role == UserRole.CLIENT])
    
    items = []
    for u in users:
        company = db.query(Company).filter(Company.id == u.company_id).first()
        ticket_count = db.query(Ticket).filter(Ticket.created_by == u.id).count()
        
        items.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value if u.role else "client",
            "is_active": u.is_active,
            "company_name": company.name if company else "",
            "ticket_count": ticket_count,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    
    return schemas.ReportResponse(
        type="users",
        period="all",
        total=len(users),
        resolved=admins,
        data=items,
        summary={
            "admins": admins,
            "agents": agents,
            "clients": clients
        }
    )

@router.get("/performance", response_model=schemas.ReportResponse)
def get_performance_report(
    period: str = Query("month"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    date_from, date_to = get_period_dates(period)
    tenant_id = current_user.tenant_id
    
    tickets = db.query(Ticket).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.created_at >= date_from,
        Ticket.created_at <= date_to
    ).all()
    
    resolved_statuses = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.is_final == True
    ).all()
    resolved_ids = [s.id for s in resolved_statuses]
    
    total = len(tickets)
    resolved_tickets = [t for t in tickets if t.status_id in resolved_ids]
    
    total_hours = 0
    sla_met = 0
    for t in resolved_tickets:
        if t.updated_at and t.created_at:
            hours = (t.updated_at - t.created_at).total_seconds() / 3600
            total_hours += hours
            if t.sla_due_at and t.updated_at <= t.sla_due_at:
                sla_met += 1
            elif not t.sla_due_at:
                sla_met += 1
    
    avg_hours = round(total_hours / len(resolved_tickets), 1) if resolved_tickets else 0
    sla_rate = round(sla_met / len(resolved_tickets) * 100, 1) if resolved_tickets else 0
    
    items = []
    for t in tickets:
        status = db.query(TicketStatus).filter(TicketStatus.id == t.status_id).first()
        hours = 0
        if t.updated_at and t.created_at:
            hours = round((t.updated_at - t.created_at).total_seconds() / 3600, 1)
        sla_ok = "Выполнено" if (t.sla_due_at and t.updated_at <= t.sla_due_at) or not t.sla_due_at else "Просрочено"
        
        items.append({
            "id": t.id,
            "readable_id": t.readable_id,
            "title": t.title,
            "status": status.name if status else "",
            "priority": t.priority,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "resolved_at": t.updated_at.isoformat() if t.status_id in resolved_ids and t.updated_at else None,
            "resolution_hours": hours,
            "sla": sla_ok
        })
    
    return schemas.ReportResponse(
        type="performance",
        period=period,
        total=total,
        resolved=len(resolved_tickets),
        data=items,
        summary={
            "avg_resolution_hours": avg_hours,
            "sla_rate": sla_rate,
            "total_hours": round(total_hours, 1)
        }
    )

@router.get("/companies", response_model=schemas.ReportResponse)
def get_companies_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tenant_id = current_user.tenant_id
    
    companies = db.query(Company).filter(Company.tenant_id == tenant_id).all()
    
    active = len([c for c in companies if c.status == 'active'])
    
    items = []
    for c in companies:
        ticket_count = db.query(Ticket).filter(Ticket.company_id == c.id).count()
        user_count = db.query(User).filter(User.company_id == c.id).count()
        
        items.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone or "",
            "address": c.address or "",
            "status": c.status or "active",
            "ticket_count": ticket_count,
            "user_count": user_count,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    
    return schemas.ReportResponse(
        type="companies",
        period="all",
        total=len(companies),
        resolved=active,
        data=items,
        summary={
            "active": active,
            "inactive": len(companies) - active
        }
    )

@router.get("/audit", response_model=schemas.ReportResponse)
def get_audit_report(
    period: str = Query("month"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    date_from, date_to = get_period_dates(period)
    
    events = db.query(TicketTimeline).filter(
        TicketTimeline.created_at >= date_from,
        TicketTimeline.created_at <= date_to
    ).order_by(desc(TicketTimeline.created_at)).limit(500).all()
    
    items = []
    for e in events:
        user = db.query(User).filter(User.id == e.user_id).first()
        ticket = db.query(Ticket).filter(Ticket.id == e.ticket_id).first()
        
        items.append({
            "id": e.id,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "action": e.event_type.value if e.event_type else "",
            "content": e.content or "",
            "user_name": user.full_name if user else "",
            "user_email": user.email if user else "",
            "ticket_id": ticket.readable_id if ticket else None,
            "ip_address": ""
        })
    
    return schemas.ReportResponse(
        type="audit",
        period=period,
        total=len(items),
        resolved=0,
        data=items,
        summary={}
    )

@router.get("/financial", response_model=schemas.ReportResponse)
def get_financial_report(
    period: str = Query("month"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    date_from, date_to = get_period_dates(period)
    tenant_id = current_user.tenant_id
    
    tickets = db.query(Ticket).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.created_at >= date_from,
        Ticket.created_at <= date_to
    ).all()
    
    items = []
    for t in tickets:
        company = db.query(Company).filter(Company.id == t.company_id).first()
        status = db.query(TicketStatus).filter(TicketStatus.id == t.status_id).first()
        
        items.append({
            "id": t.id,
            "readable_id": t.readable_id,
            "title": t.title,
            "status": status.name if status else "",
            "priority": t.priority,
            "company_name": company.name if company else "",
            "created_at": t.created_at.isoformat() if t.created_at else None
        })
    
    return schemas.ReportResponse(
        type="financial",
        period=period,
        total=len(items),
        resolved=0,
        data=items,
        summary={
            "total_hours": 0,
            "total_cost": 0
        }
    )

@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    period: str = Query("month"),
    format: str = Query("csv"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if report_type == "tickets":
        report = get_tickets_report(period, current_user, db)
    elif report_type == "users":
        report = get_users_report(current_user, db)
    elif report_type == "performance":
        report = get_performance_report(period, current_user, db)
    elif report_type == "companies":
        report = get_companies_report(current_user, db)
    elif report_type == "audit":
        report = get_audit_report(period, current_user, db)
    elif report_type == "financial":
        report = get_financial_report(period, current_user, db)
    else:
        report = get_tickets_report(period, current_user, db)
    
    output = io.StringIO()
    if report.data:
        headers = list(report.data[0].keys())
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        writer.writerows(report.data)
    
    output.seek(0)
    filename = f"report_{report_type}_{period}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
