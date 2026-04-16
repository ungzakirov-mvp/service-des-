from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Ticket, User, TicketStatus, UserRole
from app.dependencies import get_current_user
from app import schemas

router = APIRouter(prefix="/analytics", tags=["Аналитика"])

@router.get("/", response_model=schemas.AnalyticsResponse)
def get_advanced_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns advanced analytics: volume trends and agent performance.
    """
    tenant_id = current_user.tenant_id
    
    # For clients, return limited data
    if current_user.role == UserRole.CLIENT:
        user_tickets = db.query(Ticket).filter(
            Ticket.tenant_id == tenant_id,
            Ticket.created_by == current_user.id
        ).all()
        return schemas.AnalyticsResponse(
            volume_trends=[],
            agent_performance=[],
            requester_performance=[],
            status_distribution=[],
            upcoming_deadlines=[],
            total_tickets=len(user_tickets),
            active_users=1
        )
    
    # 1. Volume Trends (Last 7 days)
    seven_days_ago = datetime.now() - timedelta(days=7)
    trends = db.query(
        func.date(Ticket.created_at).label("day"),
        func.count(Ticket.id).label("count")
    ).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.created_at >= seven_days_ago
    ).group_by("day").order_by("day").all()
    
    volume_trends = [schemas.VolumeTrend(date=str(t.day), count=t.count) for t in trends]

    # 2. Agent Performance
    resolved_statuses = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.is_final == True
    ).all()
    resolved_status_ids = [s.id for s in resolved_statuses]

    agents = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role.in_([UserRole.AGENT, UserRole.ADMIN])
    ).all()

    agent_performance = []
    for agent in agents:
        agent_tickets = db.query(Ticket).filter(Ticket.assigned_to == agent.id).all()
        resolved_tickets = [t for t in agent_tickets if t.status_id in resolved_status_ids]
        
        count = len(resolved_tickets)
        avg_hours = None
        sla_rate = 0
        
        if count > 0:
            total_seconds = 0
            sla_met = 0
            for t in resolved_tickets:
                duration = t.updated_at - t.created_at
                total_seconds += duration.total_seconds()
                
                # Simple SLA check
                if t.sla_due_at and t.updated_at <= t.sla_due_at:
                    sla_met += 1
                elif not t.sla_due_at:
                    sla_met += 1 # Default or no SLA
            
            avg_hours = (total_seconds / count) / 3600
            sla_rate = (sla_met / count) * 100

        agent_performance.append(schemas.AgentPerformance(
            agent_id=agent.id,
            full_name=agent.full_name,
            resolved_count=count,
            avg_resolution_hours=round(avg_hours, 2) if avg_hours is not None else None,
            sla_compliance_rate=round(sla_rate, 1)
        ))

    # 3. Requester Performance
    requesters = db.query(
        User.id, User.full_name, func.count(Ticket.id).label("count")
    ).join(Ticket, Ticket.created_by == User.id).filter(
        User.tenant_id == tenant_id
    ).group_by(User.id).order_by(func.count(Ticket.id).desc()).limit(5).all()
    
    requester_performance = [
        schemas.RequesterPerformance(user_id=r.id, full_name=r.full_name, ticket_count=r.count)
        for r in requesters
    ]

    # 4. Status Distribution
    statuses = db.query(TicketStatus).filter(TicketStatus.tenant_id == tenant_id).all()
    status_distribution = []
    for s in statuses:
        count = db.query(Ticket).filter(Ticket.status_id == s.id).count()
        status_distribution.append(schemas.StatusDistribution(
            status_name=s.name,
            count=count,
            color=s.color
        ))

    # 5. Upcoming Deadlines
    upcoming = db.query(Ticket).filter(
        Ticket.tenant_id == tenant_id,
        Ticket.sla_due_at != None,
        Ticket.status_id.notin_(resolved_status_ids)
    ).order_by(Ticket.sla_due_at.asc()).limit(10).all()
    
    upcoming_deadlines = [
        schemas.TaskDeadline(
            ticket_id=t.id,
            title=t.title,
            due_at=t.sla_due_at,
            status_name=t.status_rel.name,
            priority=t.priority
        ) for t in upcoming
    ]

    total_tickets = db.query(Ticket).filter(Ticket.tenant_id == tenant_id).count()
    active_users = db.query(User).filter(User.tenant_id == tenant_id).count()

    return schemas.AnalyticsResponse(
        volume_trends=volume_trends,
        agent_performance=agent_performance,
        requester_performance=requester_performance,
        status_distribution=status_distribution,
        upcoming_deadlines=upcoming_deadlines,
        total_tickets=total_tickets,
        active_users=active_users
    )
