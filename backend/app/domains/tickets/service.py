from datetime import datetime, timezone
from typing import Optional, List
from io import StringIO
import csv as csv_module

from fastapi import HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, func as sqlfunc, update as sql_update

from app.models import (
    Ticket, User, Company, TicketStatus, TicketTimeline,
    TimelineEventType, TicketPriority, UserRole, Attachment, Notification,
    TicketRating, TimeEntry
)
from app import schemas
from app.services.sla_service import SLAService
from app.services.automation_service import AutomationService
from app.services.routing_service import find_best_agent
from app.domains.notifications import service as notif_service
from app.domains.tickets import constants as const
from app.domains.tickets import permissions as perm
from app.domains.tickets import queries as qry
from app.domains.tickets import events as evt
from app.domains.tickets import validators as val


async def create_ticket(
    db: Session, ticket_in: schemas.TicketCreate, current_user: User
) -> Ticket:
    tenant_id = current_user.tenant_id
    default_status = qry.get_default_status(db, tenant_id)
    next_readable_id = qry.get_next_readable_id(db, tenant_id)

    sla_due = SLAService.calculate_due_date(db, tenant_id, ticket_in.priority)

    assigned_agent_id = ticket_in.assigned_to
    company_id = ticket_in.company_id or current_user.company_id

    new_ticket = Ticket(
        tenant_id=tenant_id,
        readable_id=next_readable_id,
        title=ticket_in.title,
        description=ticket_in.description,
        priority=ticket_in.priority,
        status_id=default_status.id,
        created_by=current_user.id,
        assigned_to=assigned_agent_id,
        company_id=company_id,
        tags=ticket_in.tags,
        sla_due_at=sla_due,
        scheduled_at=ticket_in.scheduled_at,
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    db.add(TicketTimeline(
        ticket_id=new_ticket.id,
        user_id=current_user.id,
        event_type=const.TIMELINE_EVENT_CREATE,
        content=f"Тикет #{next_readable_id} создан",
    ))
    db.commit()

    evt.log_business(db, tenant_id, const.BUSINESS_EVENT_TICKET_CREATED,
                     ticket_id=new_ticket.id)

    await notif_service.send_new_ticket_notification(
        email=current_user.email,
        ticket_id=new_ticket.id,
        title=new_ticket.title,
    )

    if assigned_agent_id:
        company_name = None
        company_color = None
        if new_ticket.company_id:
            company = db.query(Company).filter(Company.id == new_ticket.company_id).first()
            if company:
                company_name = company.name
                company_color = company.color or "#0066CC"
        await notif_service.notify_agent_new_ticket(
            agent_id=assigned_agent_id,
            ticket_id=new_ticket.id,
            readable_id=next_readable_id,
            title=new_ticket.title,
            client_name=current_user.full_name or current_user.email,
            priority=new_ticket.priority,
            description=new_ticket.description,
            company_name=company_name,
            company_color=company_color,
        )

    await AutomationService.process_event(db, "on_ticket_create", new_ticket)

    evt.log_audit(db, tenant_id, "TICKET_CREATE", current_user.id,
                  new_ticket.id, {"title": new_ticket.title})

    await evt.broadcast_ticket_event(
        tenant_id, const.WS_EVENT_CREATED, new_ticket.id,
        readable_id=next_readable_id,
        title=new_ticket.title,
        description=new_ticket.description,
        priority=new_ticket.priority,
        status=new_ticket.status_rel.name if new_ticket.status_rel else "Новый",
        created_by=current_user.full_name or current_user.email,
        created_by_id=current_user.id,
    )

    return new_ticket


def list_tickets(
    db: Session, current_user: User,
    status_id: Optional[int] = None,
    priority: Optional[str] = None,
    skip: int = 0, limit: int = 100,
) -> List[Ticket]:
    query = qry.list_tickets_query(
        db, current_user.tenant_id, current_user,
        status_id=status_id, priority=priority,
    )
    return query.offset(skip).limit(limit).all()


def get_ticket(db: Session, ticket_id: int, current_user: User) -> Ticket:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)
    perm.require_ticket_access(ticket, current_user)
    return ticket


async def update_ticket(
    db: Session, ticket_id: int, update: schemas.TicketUpdate, current_user: User
) -> Ticket:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)
    tenant_id = current_user.tenant_id

    if current_user.role == UserRole.CLIENT and ticket.created_by != current_user.id:
        raise HTTPException(status_code=403,
                            detail="Нет прав на редактирование этого тикета")

    changes = []
    new_status_name = None

    if update.status_id is not None and update.status_id != ticket.status_id:
        new_status = db.query(TicketStatus).get(update.status_id)
        if new_status and new_status.tenant_id == tenant_id:
            changes.append(val.describe_status_change(ticket.status_id, update.status_id, new_status))
            new_status_name = new_status.name
            ticket.status_id = update.status_id

    if update.priority is not None and update.priority != ticket.priority:
        old_prio = ticket.priority
        ticket.priority = update.priority
        changes.append(val.describe_priority_change(old_prio, update.priority))
        SLAService.update_ticket_sla(db, ticket)

    if update.assigned_to is not None and update.assigned_to != ticket.assigned_to:
        new_agent = db.query(User).filter(
            User.id == update.assigned_to, User.tenant_id == tenant_id
        ).first()
        if new_agent:
            agent_name = new_agent.full_name or new_agent.email
            changes.append(val.describe_assignment_change(agent_name))
            ticket.assigned_to = update.assigned_to
            await evt.create_notification(
                db, new_agent.id, ticket.tenant_id,
                title="Новое назначение",
                message=f"Вам назначен тикет #{ticket.id}: {ticket.title}",
                link=f"/tickets/{ticket.id}",
            )

    if update.company_id is not None and update.company_id != ticket.company_id:
        new_company = db.query(Company).filter(
            Company.id == update.company_id, Company.tenant_id == tenant_id
        ).first()
        if new_company:
            changes.append(val.describe_company_change(new_company.name))
            ticket.company_id = update.company_id

    if update.title is not None:
        ticket.title = update.title
    if update.description is not None:
        ticket.description = update.description

    if update.tags is not None:
        ticket.tags = update.tags

    db.commit()
    db.refresh(ticket)

    await evt.broadcast_ticket_event(
        tenant_id, const.WS_EVENT_REFRESH, ticket.id,
        message=f"Тикет #{ticket.id} обновлен"
    )

    if changes:
        db.add(TicketTimeline(
            ticket_id=ticket.id,
            user_id=current_user.id,
            event_type=const.TIMELINE_EVENT_STATUS_CHANGE,
            content=", ".join(changes),
        ))
        db.commit()

        if new_status_name:
            await notif_service.notify_client_status_change(ticket.id, new_status_name)

    if any("Статус изменен" in c for c in changes):
        await AutomationService.process_event(
            db, "on_status_change", ticket, context={"changes": changes}
        )

    evt.log_audit(db, tenant_id, "TICKET_UPDATE", current_user.id,
                  ticket.id, {"changes": changes})

    return ticket


def get_ticket_timeline(db: Session, ticket_id: int, current_user: User) -> List[TicketTimeline]:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)
    perm.require_ticket_access(ticket, current_user)
    return db.query(TicketTimeline).filter(
        TicketTimeline.ticket_id == ticket_id
    ).order_by(TicketTimeline.created_at).all()


async def rate_ticket(db: Session, ticket_id: int, rating: schemas.TicketRating,
                      current_user: User) -> Ticket:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)

    if not perm.can_rate_ticket(ticket, current_user):
        raise HTTPException(status_code=403, detail="Only ticket creator can rate")

    status_rel = ticket.status_rel
    if not status_rel or (not status_rel.is_final and status_rel.name.lower()
                          not in ('решён', 'закрыт', 'resolved', 'closed')):
        raise HTTPException(status_code=400,
                            detail="Ticket must be resolved to rate")

    existing = db.query(TicketRating).filter(TicketRating.ticket_id == ticket.id).first()
    if existing:
        existing.rating = rating.rating
    else:
        db.add(TicketRating(tenant_id=ticket.tenant_id, ticket_id=ticket.id,
                            rating=rating.rating))

    db.execute(sql_update(Ticket).where(Ticket.id == ticket.id).values(rating=rating.rating))
    db.flush()
    ticket.rating_comment = rating.comment

    db.add(TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        event_type="rating",
        content=f"Оценка тикета: {rating.rating}/5. {rating.comment or ''}",
    ))
    db.commit()
    db.refresh(ticket)

    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_REFRESH, ticket.id,
        message=f"Тикет #{ticket.id} оценен"
    )
    return ticket


async def accept_ticket(db: Session, ticket_id: int, current_user: User) -> Ticket:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)

    if not perm.can_accept_ticket(current_user):
        raise HTTPException(status_code=403,
                            detail="Только агент или админ может принять тикет")
    if ticket.accepted_at:
        raise HTTPException(status_code=400, detail="Тикет уже принят")

    ticket.assigned_to = current_user.id
    ticket.accepted_at = datetime.now()

    in_progress = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == current_user.tenant_id,
        TicketStatus.name.ilike("%работ%"),
    ).first()
    if in_progress:
        ticket.status_id = in_progress.id

    db.add(TicketTimeline(
        ticket_id=ticket.id, user_id=current_user.id,
        event_type=const.TIMELINE_EVENT_STATUS_CHANGE,
        content="Агент принял тикет",
    ))
    db.commit()
    db.refresh(ticket)

    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_REFRESH, ticket.id,
        message=f"Тикет #{ticket.id} принят агентом"
    )
    return ticket


async def resolve_ticket(db: Session, ticket_id: int, current_user: User,
                         resolution_comment: str = "") -> Ticket:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)

    if not perm.can_resolve_ticket(current_user):
        raise HTTPException(status_code=403,
                            detail="Только агент или администратор может завершить работу")

    awaiting_status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == current_user.tenant_id,
        TicketStatus.name == const.RESOLVED_STATUS_NAME,
    ).first()
    if not awaiting_status:
        raise HTTPException(status_code=500,
                            detail="Статус 'Ожидает клиента' не настроен")

    ticket.status_id = awaiting_status.id
    ticket.resolved_at = datetime.now()
    ticket.resolved_by = current_user.id

    content = f"Агент {current_user.full_name or current_user.email} завершил работу над тикетом"
    if resolution_comment:
        content += f": {resolution_comment}"

    db.add(TicketTimeline(
        ticket_id=ticket.id, user_id=current_user.id,
        event_type=const.TIMELINE_EVENT_STATUS_CHANGE,
        content=content,
        extra_metadata={"new_status": awaiting_status.name,
                        "resolved_by": current_user.id},
    ))

    await evt.create_notification(
        db, ticket.created_by, ticket.tenant_id,
        title="Тикет завершён",
        message=f"Ваш тикет #{ticket.readable_id} '{ticket.title}' выполнен. "
                f"Пожалуйста, подтвердите закрытие.",
        link=f"/tickets/{ticket.id}",
    )

    db.commit()
    db.refresh(ticket)

    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_REFRESH, ticket.id,
        message=f"Тикет #{ticket.id} принят агентом"
    )
    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_RESOLVED, ticket.id,
        readable_id=ticket.readable_id
    )
    return ticket


async def close_ticket(db: Session, ticket_id: int, current_user: User) -> Ticket:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)

    if not perm.can_close_ticket(ticket, current_user):
        raise HTTPException(
            status_code=403,
            detail="Только создатель тикета или администратор может закрыть тикет",
        )

    closed_status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == current_user.tenant_id,
        TicketStatus.is_final == True,
    ).first()
    if not closed_status:
        closed_status = db.query(TicketStatus).filter(
            TicketStatus.tenant_id == current_user.tenant_id
        ).order_by(TicketStatus.order.desc()).first()
    if not closed_status:
        raise HTTPException(status_code=500, detail="Нет финального статуса")

    ticket.status_id = closed_status.id
    ticket.closed_by = current_user.id

    db.add(TicketTimeline(
        ticket_id=ticket.id, user_id=current_user.id,
        event_type=const.TIMELINE_EVENT_STATUS_CHANGE,
        content=f"Тикет закрыт клиентом: {closed_status.name}",
        extra_metadata={"new_status": closed_status.name,
                        "closed_by_role": current_user.role},
    ))

    if ticket.assigned_to:
        await evt.create_notification(
            db, ticket.assigned_to, ticket.tenant_id,
            title="Тикет закрыт",
            message=f"Клиент подтвердил закрытие тикета #{ticket.readable_id} "
                    f"'{ticket.title}'",
            link=f"/tickets/{ticket.id}",
        )

    db.commit()
    db.refresh(ticket)

    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_REFRESH, ticket.id,
        message=f"Тикет #{ticket.id} принят агентом"
    )
    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_CLOSED, ticket.id,
        readable_id=ticket.readable_id
    )
    return ticket


async def reopen_ticket(db: Session, ticket_id: int, current_user: User,
                        reason: str = "") -> Ticket:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)

    current_status = db.query(TicketStatus).filter(
        TicketStatus.id == ticket.status_id
    ).first()
    if not current_status or not current_status.is_final:
        raise HTTPException(status_code=400,
                            detail="Тикет не находится в закрытом статусе")

    in_progress_status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == current_user.tenant_id,
        TicketStatus.name == const.IN_PROGRESS_STATUS_NAME,
    ).first()
    if not in_progress_status:
        raise HTTPException(status_code=500,
                            detail="Статус 'В работе' не настроен")

    ticket.status_id = in_progress_status.id
    ticket.closed_by = None
    ticket.resolved_at = None
    ticket.resolved_by = None

    content = f"Тикет переоткрыт"
    if reason:
        content += f": {reason}"
    content += f" пользователем {current_user.full_name or current_user.email}"

    db.add(TicketTimeline(
        ticket_id=ticket.id, user_id=current_user.id,
        event_type=const.TIMELINE_EVENT_STATUS_CHANGE,
        content=content,
        extra_metadata={"reopened_by": current_user.id},
    ))

    db.commit()
    db.refresh(ticket)

    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_REFRESH, ticket.id,
        message=f"Тикет #{ticket.id} принят агентом"
    )
    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_REOPENED, ticket.id,
        readable_id=ticket.readable_id
    )
    return ticket


async def assign_ticket(db: Session, ticket_id: int, agent_id: int,
                        current_user: User) -> Ticket:
    if not perm.can_assign_ticket(current_user):
        raise HTTPException(status_code=403,
                            detail="Только администратор может переназначить агента")

    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)
    agent = db.query(User).filter(
        User.id == agent_id, User.tenant_id == current_user.tenant_id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Агент не найден")

    old_assignee = ticket.assigned_to
    ticket.assigned_to = agent_id

    db.add(TicketTimeline(
        ticket_id=ticket.id, user_id=current_user.id,
        event_type=const.TIMELINE_EVENT_ASSIGNMENT_CHANGE,
        content=f"Тикет переназначен на {agent.full_name or agent.email}",
        extra_metadata={"old_assignee": old_assignee, "new_assignee": agent_id},
    ))
    db.commit()
    db.refresh(ticket)

    await evt.broadcast_ticket_event(
        ticket.tenant_id, const.WS_EVENT_REFRESH, ticket.id,
        message=f"Тикет #{ticket.id} принят агентом"
    )
    return ticket


def delete_ticket(db: Session, ticket_id: int, current_user: User) -> None:
    if not perm.can_delete_ticket(current_user):
        raise HTTPException(status_code=403,
                            detail="Только администраторы могут удалять заявки")

    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)

    db.query(TicketTimeline).filter(TicketTimeline.ticket_id == ticket_id).delete()
    db.query(Attachment).filter(Attachment.ticket_id == ticket_id).delete()
    db.delete(ticket)
    db.commit()


def get_agent_stats(db: Session, current_user: User) -> list:
    if not perm.can_delete_ticket(current_user):
        raise HTTPException(status_code=403, detail="Только для админов")

    tenant_id = current_user.tenant_id
    agents = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role.in_([UserRole.AGENT, UserRole.ADMIN]),
    ).all()

    resolved_ids = [
        s.id for s in db.query(TicketStatus).filter(
            TicketStatus.tenant_id == tenant_id,
            TicketStatus.is_final == True,
        ).all()
    ]

    stats = []
    for agent in agents:
        resolved = db.query(Ticket).filter(
            Ticket.assigned_to == agent.id,
            Ticket.tenant_id == tenant_id,
            Ticket.status_id.in_(resolved_ids),
        ).count()

        avg_rating = db.query(sqlfunc.avg(Ticket.rating)).filter(
            Ticket.assigned_to == agent.id,
            Ticket.tenant_id == tenant_id,
            Ticket.rating != None,
        ).scalar()

        stats.append(schemas.AgentPerformance(
            agent_id=agent.id,
            full_name=agent.full_name,
            resolved_count=resolved,
            avg_resolution_hours=None,
            sla_compliance_rate=round(float(avg_rating), 1) if avg_rating else None,
        ))
    return stats


def get_ticket_attachments(db: Session, ticket_id: int,
                           current_user: User) -> List[Attachment]:
    ticket = qry.get_tenant_ticket_or_404(db, ticket_id, current_user.tenant_id)
    perm.require_ticket_access(ticket, current_user)
    return db.query(Attachment).filter(
        Attachment.ticket_id == ticket_id,
        Attachment.tenant_id == current_user.tenant_id,
    ).all()


def export_tickets_csv(db: Session, current_user: User) -> Response:
    tenant_id = current_user.tenant_id
    query = db.query(Ticket).filter(Ticket.tenant_id == tenant_id)
    if current_user.role == UserRole.CLIENT:
        query = query.filter(Ticket.created_by == current_user.id)

    tickets = query.order_by(desc(Ticket.created_at)).all()

    output = StringIO()
    output.write('\uFEFF')
    writer = csv_module.writer(output, delimiter=';', quoting=csv_module.QUOTE_ALL)
    writer.writerow([
        'ID', 'Заголовок', 'Описание', 'Статус', 'Приоритет',
        'Заявитель', 'Исполнитель', 'Компания', 'SLA', 'Создан',
    ])

    for t in tickets:
        status = t.status_rel.name if t.status_rel else str(t.status_id)
        creator = (t.creator.full_name or t.creator.email) if t.creator else '-'
        assignee = (t.assignee.full_name or t.assignee.email) if t.assignee else '-'
        company = t.company.name if t.company else '-'
        sla = t.sla_due_at.strftime('%Y-%m-%d %H:%M') if t.sla_due_at else '-'
        created = t.created_at.strftime('%Y-%m-%d %H:%M') if t.created_at else '-'

        writer.writerow([
            t.readable_id, t.title or '',
            (t.description or '').replace('\n', ' ').replace('\r', ''),
            status, t.priority, creator, assignee, company, sla, created,
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content.encode('utf-8'),
        media_type='text/csv',
        headers={
            'Content-Disposition': 'attachment; filename="tickets_export.csv"',
            'Content-Type': 'text/csv; charset=utf-8',
        },
    )
