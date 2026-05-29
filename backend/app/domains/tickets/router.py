from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Optional, List
from app.infrastructure.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app import schemas
from app.domains.tickets import service as ticket_service

router = APIRouter(prefix="/tickets", tags=["Тикеты"])


@router.post("/", response_model=schemas.TicketResponse, status_code=201)
async def create_ticket(
    ticket_in: schemas.TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await ticket_service.create_ticket(db, ticket_in, current_user)


@router.get("/", response_model=List[schemas.TicketResponse])
def list_tickets(
    status_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.list_tickets(db, current_user, status_id, priority, skip, limit)


@router.get("/{ticket_id}", response_model=schemas.TicketDetailResponse)
def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.get_ticket(db, ticket_id, current_user)


@router.patch("/{ticket_id}", response_model=schemas.TicketResponse)
async def update_ticket(
    ticket_id: int,
    update: schemas.TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await ticket_service.update_ticket(db, ticket_id, update, current_user)


@router.get("/{ticket_id}/timeline", response_model=List[schemas.TimelineEventResponse])
def get_ticket_timeline(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.get_ticket_timeline(db, ticket_id, current_user)


@router.post("/{ticket_id}/rate", response_model=schemas.TicketResponse)
async def rate_ticket(
    ticket_id: int,
    rating: schemas.TicketRating,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await ticket_service.rate_ticket(db, ticket_id, rating, current_user)


@router.post("/{ticket_id}/accept", response_model=schemas.TicketResponse)
async def accept_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await ticket_service.accept_ticket(db, ticket_id, current_user)


@router.post("/{ticket_id}/resolve", response_model=schemas.TicketResponse)
async def resolve_ticket(
    ticket_id: int,
    resolution_comment: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await ticket_service.resolve_ticket(
        db, ticket_id, current_user, resolution_comment
    )


@router.post("/{ticket_id}/close", response_model=schemas.TicketResponse)
async def close_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await ticket_service.close_ticket(db, ticket_id, current_user)


@router.post("/{ticket_id}/reopen", response_model=schemas.TicketResponse)
async def reopen_ticket(
    ticket_id: int,
    reason: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await ticket_service.reopen_ticket(db, ticket_id, current_user, reason)


@router.post("/{ticket_id}/assign/{agent_id}", response_model=schemas.TicketResponse)
async def assign_ticket(
    ticket_id: int,
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await ticket_service.assign_ticket(db, ticket_id, agent_id, current_user)


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket_service.delete_ticket(db, ticket_id, current_user)


@router.get("/stats/agents", response_model=List[schemas.AgentPerformance])
def get_agent_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.get_agent_stats(db, current_user)


@router.get("/{ticket_id}/attachments", response_model=List[schemas.AttachmentResponse])
def get_ticket_attachments(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.get_ticket_attachments(db, ticket_id, current_user)


@router.get("/export/csv", response_class=Response)
def export_tickets_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ticket_service.export_tickets_csv(db, current_user)
