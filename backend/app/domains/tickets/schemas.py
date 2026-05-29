from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CommentCreate(BaseModel):
    ticket_id: int
    text: str
    is_internal: bool = False


class CommentResponse(BaseModel):
    id: int
    ticket_id: int
    text: str
    author_name: str
    created_at: datetime

    class Config:
        from_attributes = True
