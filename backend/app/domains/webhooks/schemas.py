from pydantic import BaseModel, Field
from typing import Optional


class InboundEmailPayload(BaseModel):
    sender: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=512)
    body: str = Field(..., min_length=0, max_length=65535)


class TelegramUpdatePayload(BaseModel):
    update_id: int
    message: Optional[dict] = None
    edited_message: Optional[dict] = None
    channel_post: Optional[dict] = None
    edited_channel_post: Optional[dict] = None


class WebhookResponse(BaseModel):
    status: str = "ok"
    detail: Optional[str] = None
    idempotent: bool = False


class WebhookErrorResponse(BaseModel):
    status: str = "error"
    detail: str
