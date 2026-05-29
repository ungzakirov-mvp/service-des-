from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from app.models import Ticket, TicketStatus, User, UserRole


def get_tenant_ticket_or_404(db: Session, ticket_id: int, tenant_id: int) -> Ticket:
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == tenant_id
    ).first()
    if not ticket:
        from app.exceptions import ticket_not_found
        raise ticket_not_found()
    return ticket


def get_default_status(db: Session, tenant_id: int) -> TicketStatus:
    status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant_id,
        TicketStatus.order == 1
    ).first()
    if not status:
        from fastapi import HTTPException
        raise HTTPException(500, "Default status not configured for tenant")
    return status


def get_next_readable_id(db: Session, tenant_id: int) -> int:
    last = db.query(Ticket).filter(
        Ticket.tenant_id == tenant_id
    ).order_by(desc(Ticket.readable_id)).first()
    return (last.readable_id + 1) if last else 1


def list_tickets_query(db: Session, tenant_id: int, user: User,
                       status_id: Optional[int] = None,
                       priority: Optional[str] = None):
    query = db.query(Ticket).filter(Ticket.tenant_id == tenant_id)
    if status_id:
        query = query.filter(Ticket.status_id == status_id)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if user.role == UserRole.CLIENT:
        query = query.filter(Ticket.created_by == user.id)
    return query.order_by(desc(Ticket.created_at))
