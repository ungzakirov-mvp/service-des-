"""
Auto-Routing Service

Алгоритм назначения тикетов на свободного агента:
1. Найти всех доступных агентов (is_available=True)
2. Подсчитать текущую нагрузку по открытым тикетам
3. Назначить на агента с минимальной нагрузкой
4. При равной нагрузке — round-robin (по последнему назначению)
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from app.models import User, Ticket, TicketStatus, UserRole
import structlog

logger = structlog.get_logger()


def find_best_agent(db: Session, tenant_id: int, category: str = None) -> Optional[int]:
    """
    Finds the best available agent to handle a new ticket based on current workload.
    
    Algorithm:
    1. Get all available agents/admins in tenant
    2. Count their active (non-final) tickets
    3. Sort by workload ascending
    4. On tie: prefer agent who was assigned longest ago (round-robin)
    
    Returns User.id of the best agent, or None if no agents available.
    """
    
    # 1. Get all available agents in tenant
    agents = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role.in_([UserRole.AGENT, UserRole.ADMIN]),
        User.is_available == True
    ).all()
    
    if not agents:
        # Fallback: find any admin regardless of availability
        admin = db.query(User).filter(
            User.tenant_id == tenant_id,
            User.role == UserRole.ADMIN
        ).first()
        if admin:
            logger.warning("routing_fallback_admin", admin_id=admin.id, tenant_id=tenant_id)
            return admin.id
        
        logger.warning("routing_no_agents", tenant_id=tenant_id)
        return None

    # 2. Get IDs of non-final statuses for this tenant
    non_final_status_ids = [
        s[0] for s in db.query(TicketStatus.id).filter(
            TicketStatus.tenant_id == tenant_id,
            TicketStatus.is_final == False
        ).all()
    ]

    # 3. Calculate workload and last assignment for each agent
    agent_scores = []
    for agent in agents:
        # Count active tickets
        active_count = 0
        if non_final_status_ids:
            active_count = db.query(Ticket).filter(
                Ticket.assigned_to == agent.id,
                Ticket.status_id.in_(non_final_status_ids)
            ).count()
        
        # Get timestamp of most recent assignment (for round-robin on ties)
        latest_assignment = db.query(func.max(Ticket.created_at)).filter(
            Ticket.assigned_to == agent.id,
            Ticket.tenant_id == tenant_id
        ).scalar()
        
        agent_scores.append({
            "id": agent.id,
            "name": agent.full_name or agent.email,
            "active_tickets": active_count,
            "latest_assignment": latest_assignment
        })

    # 4. Sort: primary by ticket count (asc), secondary by latest assignment (asc = oldest first)
    from datetime import datetime
    agent_scores.sort(key=lambda x: (
        x["active_tickets"],
        x["latest_assignment"] if x["latest_assignment"] else datetime.min
    ))
    
    best = agent_scores[0]
    logger.info("routing_assigned", 
                agent_id=best["id"], 
                agent_name=best["name"],
                active_tickets=best["active_tickets"],
                tenant_id=tenant_id)
    
    return best["id"]
