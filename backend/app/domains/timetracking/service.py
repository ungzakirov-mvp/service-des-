from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models import Ticket, TimeEntry, User
from app import schemas
from app.domains.tickets import queries as qry


def log_time(db: Session, entry_in: schemas.TimeEntryCreate,
             current_user: User) -> TimeEntry:
    qry.get_tenant_ticket_or_404(db, entry_in.ticket_id, current_user.tenant_id)

    new_entry = TimeEntry(
        tenant_id=current_user.tenant_id,
        ticket_id=entry_in.ticket_id,
        user_id=current_user.id,
        minutes=entry_in.minutes,
        description=entry_in.description,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


def get_ticket_time_entries(db: Session, ticket_id: int,
                            current_user: User) -> List[TimeEntry]:
    qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)
    return db.query(TimeEntry).filter(TimeEntry.ticket_id == ticket_id).all()


def get_ticket_total_time(db: Session, ticket_id: int,
                          current_user: User) -> dict:
    qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)
    entries = db.query(TimeEntry).filter(TimeEntry.ticket_id == ticket_id).all()
    total_minutes = sum(e.minutes for e in entries)
    return {
        "ticket_id": ticket_id,
        "total_minutes": total_minutes,
        "total_hours": round(total_minutes / 60, 2),
    }
