from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.domains.comments import service as comment_service
from app.domains.tickets.schemas import CommentCreate, CommentResponse

router = APIRouter(prefix="/comments", tags=["Комментарии"])


@router.post("/", response_model=CommentResponse)
async def create_comment(
    comment: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await comment_service.create_comment(db, comment, current_user)


@router.get("/ticket/{ticket_id}", response_model=List[CommentResponse])
def get_comments(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return comment_service.get_comments(db, ticket_id, current_user)
