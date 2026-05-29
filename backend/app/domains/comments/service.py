from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models import Ticket, User, TicketTimeline, TimelineEventType, UserRole
from app.logger import log_business_event
from app.domains.notifications import service as notif_service
from app.domains.tickets.schemas import CommentCreate, CommentResponse
from app.domains.tickets import constants as const
from app.domains.tickets import queries as qry


async def create_comment(db: Session, comment: CommentCreate,
                         current_user: User) -> CommentResponse:
    qry.get_tenant_ticket_or_404(db, comment.ticket_id, current_user.tenant_id)

    timeline_event = TicketTimeline(
        ticket_id=comment.ticket_id,
        user_id=current_user.id,
        event_type=TimelineEventType.COMMENT,
        content=comment.text,
        is_internal=comment.is_internal,
    )
    db.add(timeline_event)
    db.commit()
    db.refresh(timeline_event)

    log_business_event(const.BUSINESS_EVENT_COMMENT_CREATED,
                       ticket_id=comment.ticket_id, user_id=current_user.id)

    ticket = db.query(Ticket).filter(Ticket.id == comment.ticket_id).first()
    is_agent = current_user.role in (UserRole.AGENT, UserRole.ADMIN)

    if not comment.is_internal:
        if is_agent and ticket and ticket.created_by:
            await notif_service.notify_client_new_reply(
                comment.ticket_id,
                current_user.full_name or current_user.email,
                comment.text,
            )
        elif not is_agent and ticket and ticket.assigned_to:
            await notif_service.notify_agent_new_comment(
                ticket.assigned_to,
                ticket.readable_id,
                current_user.full_name or current_user.email,
                comment.text,
            )

    await notif_service.broadcast_event(
        current_user.tenant_id, const.WS_EVENT_COMMENT_ADDED,
        data={
            "id": timeline_event.id,
            "ticket_id": comment.ticket_id,
            "text": timeline_event.content,
            "author_name": current_user.full_name or current_user.email,
            "is_internal": timeline_event.is_internal,
        },
    )

    return CommentResponse(
        id=timeline_event.id,
        ticket_id=comment.ticket_id,
        text=timeline_event.content,
        author_name=current_user.full_name or current_user.email,
        created_at=timeline_event.created_at,
    )


def get_comments(db: Session, ticket_id: int,
                 current_user: User) -> List[CommentResponse]:
    qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)

    events = db.query(TicketTimeline).filter(
        TicketTimeline.ticket_id == ticket_id,
        TicketTimeline.event_type == TimelineEventType.COMMENT,
    ).order_by(TicketTimeline.created_at).all()

    return [
        CommentResponse(
            id=e.id,
            ticket_id=e.ticket_id,
            text=e.content,
            author_name=e.actor.full_name or e.actor.email,
            created_at=e.created_at,
        )
        for e in events
    ]
