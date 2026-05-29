from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.infrastructure.authz import require_staff
from app import schemas
from app.domains.timetracking import service as tt_service

router = APIRouter(prefix="/timetracking", tags=["Time Tracking"])


@router.post("/log", response_model=schemas.TimeEntryResponse, status_code=201)
def log_time(
    entry_in: schemas.TimeEntryCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return tt_service.log_time(db, entry_in, current_user)


@router.get("/ticket/{ticket_id}", response_model=List[schemas.TimeEntryResponse])
def get_ticket_time_entries(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return tt_service.get_ticket_time_entries(db, ticket_id, current_user)


@router.get("/ticket/{ticket_id}/total")
def get_ticket_total_time(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return tt_service.get_ticket_total_time(db, ticket_id, current_user)
