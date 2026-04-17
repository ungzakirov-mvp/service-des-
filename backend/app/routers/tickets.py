from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List
from app.database import get_db
from app.models import Ticket, User, TicketStatus, TicketTimeline, TimelineEventType, TicketPriority, UserRole, Attachment, Notification
from app.dependencies import get_current_user
from app.exceptions import ticket_not_found, unauthorized
from app.services.sla_service import SLAService
from app.services.automation_service import AutomationService
from app.services.audit_service import AuditService
from app.services.websocket_manager import manager
from app.routers.notifications import broadcast_notification
from app.logger import log_business_event
from app.email import send_new_ticket_notification
from app.services.routing_service import find_best_agent
from app.telegram_bot import notify_agent_new_ticket, notify_client_status_change
from app import schemas

router = APIRouter(prefix="/tickets", tags=["Тикеты"])

@router.post("/", response_model=schemas.TicketResponse, status_code=201,
             summary="Создать тикет (Enterprise)",
             description="Создание тикета с авто-присвоением статуса и ID")
async def create_ticket(
    ticket_in: schemas.TicketCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get Default Status for Tenant
    default_status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == current_user.tenant_id,
        TicketStatus.order == 1 
    ).first()
    
    if not default_status:
        # Fallback if configuration is missing
        raise HTTPException(500, "Default status not configured for tenant")

    # 2. Calculate Readable ID (Auto-increment per tenant)
    last_ticket = db.query(Ticket).filter(
        Ticket.tenant_id == current_user.tenant_id
    ).order_by(desc(Ticket.readable_id)).first()
    
    next_readable_id = (last_ticket.readable_id + 1) if last_ticket else 1
    
    # Calculate SLA due date using SLAService
    sla_due = SLAService.calculate_due_date(db, current_user.tenant_id, ticket_in.priority)

    # 2.2 Auto-routing (Find best agent)
    assigned_agent_id = find_best_agent(db, current_user.tenant_id)

    # 2.3 CRM: Auto-link to company if not provided
    company_id = ticket_in.company_id or current_user.company_id

    # Override agent if explicitly assigned
    if ticket_in.assigned_to:
        assigned_agent_id = ticket_in.assigned_to

    # 3. Create Ticket
    new_ticket = Ticket(
        tenant_id=current_user.tenant_id,
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
        scheduled_at=ticket_in.scheduled_at
    )
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    # 4. Create Timeline Event (Creation)
    timeline_event = TicketTimeline(
        ticket_id=new_ticket.id,
        user_id=current_user.id,
        event_type=TimelineEventType.create,
        content=f"Тикет #{next_readable_id} создан"
    )
    db.add(timeline_event)
    db.commit()

    log_business_event("ticket_created", ticket_id=new_ticket.id, tenant_id=current_user.tenant_id)

    # 5. Notify via Email
    background_tasks.add_task(
        send_new_ticket_notification,
        email=current_user.email,
        ticket_id=new_ticket.id,
        title=new_ticket.title
    )
    
    # 5.1 Notify assigned agent via Telegram
    if assigned_agent_id:
        background_tasks.add_task(
            notify_agent_new_ticket,
            agent_id=assigned_agent_id,
            ticket_id=new_ticket.id,
            readable_id=next_readable_id,
            title=new_ticket.title,
            client_name=current_user.full_name or current_user.email
        )
    
    # 6. Process Automations (Async)
    await AutomationService.process_event(db, "on_ticket_create", new_ticket)

    # 7. Audit Log
    AuditService.log(
        db,
        tenant_id=new_ticket.tenant_id,
        action="TICKET_CREATE",
        user_id=current_user.id,
        target_type="ticket",
        target_id=new_ticket.id,
        details={"title": new_ticket.title}
    )

    # 8. Real-time Broadcast
    await manager.broadcast_to_tenant({
        "type": "TICKET_CREATED",
        "data": {
            "id": new_ticket.id,
            "readable_id": next_readable_id,
            "title": new_ticket.title,
            "description": new_ticket.description,
            "priority": new_ticket.priority,
            "status": new_ticket.status_rel.name if new_ticket.status_rel else "Новый",
            "created_by": current_user.full_name or current_user.email,
            "created_by_id": current_user.id,
        }
    }, tenant_id=new_ticket.tenant_id)

    return new_ticket

@router.get("/", response_model=List[schemas.TicketResponse])
def list_tickets(
    status_id: Optional[int] = Query(None),
    priority: Optional[TicketPriority] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket).filter(Ticket.tenant_id == current_user.tenant_id)
    
    if status_id:
        query = query.filter(Ticket.status_id == status_id)
    if priority:
        query = query.filter(Ticket.priority == priority)
        
    # User can only see their own tickets unless Agent/Admin
    if current_user.role == "client": # Assuming string check or UserRole enum
        query = query.filter(Ticket.created_by == current_user.id)
        
    tickets = query.order_by(desc(Ticket.created_at)).offset(skip).limit(limit).all()
    return tickets

@router.get("/{ticket_id}", response_model=schemas.TicketDetailResponse)
def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    
    if not ticket:
        raise ticket_not_found()
        
    if current_user.role == "client" and ticket.created_by != current_user.id:
        raise unauthorized()
        
    return ticket

@router.patch("/{ticket_id}", response_model=schemas.TicketResponse)
async def update_ticket(
    ticket_id: int,
    update: schemas.TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    
    if not ticket:
        raise ticket_not_found()

    # Track changes for timeline
    changes = []
    
    new_status_name = None
    if update.status_id and update.status_id != ticket.status_id:
        new_status = db.query(TicketStatus).get(update.status_id)
        if new_status and new_status.tenant_id == current_user.tenant_id:
            changes.append(f"Статус изменен на '{new_status.name}'")
            new_status_name = new_status.name
            ticket.status_id = update.status_id

    if update.priority and update.priority != ticket.priority:
        old_prio = ticket.priority
        ticket.priority = update.priority
        changes.append(f"Приоритет изменен с '{old_prio}' на '{update.priority}'")
        # Recalculate SLA
        SLAService.update_ticket_sla(db, ticket)

    if update.assigned_to and update.assigned_to != ticket.assigned_to:
        new_agent = db.query(User).filter(User.id == update.assigned_to, User.tenant_id == current_user.tenant_id).first()
        if new_agent:
            changes.append(f"Тикет назначен на '{new_agent.full_name or new_agent.email}'")
            ticket.assigned_to = update.assigned_to
            # Real-time Notification for assigned agent
            await broadcast_notification(
                db, 
                user_id=new_agent.id, 
                tenant_id=ticket.tenant_id,
                title="Новое назначение",
                content=f"Вам назначен тикет #{ticket.id}: {ticket.title}"
            )

    if update.company_id and update.company_id != ticket.company_id:
        new_company = db.query(Company).filter(Company.id == update.company_id, Company.tenant_id == current_user.tenant_id).first()
        if new_company:
            changes.append(f"Компания изменена на '{new_company.name}'")
            ticket.company_id = update.company_id

    if update.title or update.description:
         if update.title: ticket.title = update.title
         if update.description: ticket.description = update.description

    if update.tags is not None:
        ticket.tags = update.tags
         # Might log edit content, skippped for brevity

    db.commit()
    db.refresh(ticket)
    
    # Log timeline if significantly changed
    if changes:
        timeline_event = TicketTimeline(
            ticket_id=ticket.id,
            user_id=current_user.id,
            event_type=TimelineEventType.STATUS_CHANGE,
            content=", ".join(changes)
        )
        db.add(timeline_event)
        db.commit()
        
        # Notify client via Telegram about status change
        if new_status_name:
            await notify_client_status_change(ticket.id, new_status_name)

    # Process Automations (Async)
    if any("Статус изменен" in c for c in changes):
        await AutomationService.process_event(db, "on_status_change", ticket, context={"changes": changes})

    # Audit Log
    AuditService.log(
        db,
        tenant_id=ticket.tenant_id,
        action="TICKET_UPDATE",
        user_id=current_user.id,
        target_id=ticket.id,
        details={"changes": changes}
    )

    # Real-time Broadcast
    await manager.broadcast_to_tenant({
        "type": "REFRESH_TICKETS",
        "ticket_id": ticket.id,
        "message": f"Тикет #{ticket.id} обновлен"
    }, tenant_id=ticket.tenant_id)

    return ticket

@router.get("/{ticket_id}/timeline", response_model=List[schemas.TimelineEventResponse])
def get_ticket_timeline(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    
    if not ticket:
        raise ticket_not_found()

    # Allow access if creator, or agent/admin
    # Simplified check for now:
    if current_user.role == "client" and ticket.created_by != current_user.id:
        raise unauthorized()

    events = db.query(TicketTimeline).filter(
        TicketTimeline.ticket_id == ticket_id
    ).order_by(TicketTimeline.created_at).all()
    
    return events

@router.post("/{ticket_id}/rate", response_model=schemas.TicketResponse)
async def rate_ticket(
    ticket_id: int,
    rating: schemas.TicketRating,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    
    if not ticket:
        raise ticket_not_found()
        
    # Only creator can rate
    if ticket.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only ticket creator can rate")
        
    # Only allow rating if resolved/closed (simple check by status name/is_final)
    # We assume statuses with is_final=True allow rating
    if not ticket.status_rel.is_final and ticket.status_rel.name.lower() not in ['решён', 'закрыт', 'resolved', 'closed']:
         raise HTTPException(status_code=400, detail="Ticket must be resolved to rate")

    ticket.rating = rating.rating
    ticket.rating_comment = rating.comment
    
    # Log to timeline
    timeline_event = TicketTimeline(
        ticket_id=ticket.id,
        user_id=current_user.id,
        event_type="rating",
        content=f"Оценка тикета: {rating.rating}/5. {rating.comment or ''}"
    )
    db.add(timeline_event)
    db.commit()
    db.refresh(ticket)
    
    return ticket

@router.post("/{ticket_id}/accept", response_model=schemas.TicketResponse)
async def accept_ticket(ticket_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id).first()
    if not ticket:
        raise ticket_not_found()
    if current_user.role not in [UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Только агент или админ может принять тикет")
    if ticket.accepted_at:
        raise HTTPException(status_code=400, detail="Тикет уже принят")
    from datetime import datetime as dt
    ticket.assigned_to = current_user.id
    ticket.accepted_at = dt.now()
    in_progress = db.query(TicketStatus).filter(TicketStatus.tenant_id == current_user.tenant_id, TicketStatus.name.ilike("%работ%")).first()
    if in_progress:
        ticket.status_id = in_progress.id
    db.add(TicketTimeline(ticket_id=ticket.id, user_id=current_user.id, event_type="STATUS_CHANGE", content="Агент принял тикет"))
    db.commit()
    db.refresh(ticket)
    return ticket

@router.post("/{ticket_id}/resolve", response_model=schemas.TicketResponse)
async def resolve_ticket(
    ticket_id: int, 
    resolution_comment: str = "",
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Агент отмечает тикет как выполненный (требует подтверждения клиента)
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id).first()
    if not ticket:
        raise ticket_not_found()
    
    # Only agent or admin can resolve
    if current_user.role not in [UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Только агент или администратор может завершить работу")
    
    # Find "Ожидает клиента" status
    awaiting_status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == current_user.tenant_id,
        TicketStatus.name == "Ожидает клиента"
    ).first()
    
    if not awaiting_status:
        raise HTTPException(status_code=500, detail="Статус 'Ожидает клиента' не настроен")
    
    from datetime import datetime
    ticket.status_id = awaiting_status.id
    ticket.resolved_at = datetime.now()
    ticket.resolved_by = current_user.id
    
    # Log to timeline
    content = f"Агент {current_user.full_name or current_user.email} завершил работу над тикетом"
    if resolution_comment:
        content += f": {resolution_comment}"
    
    db.add(TicketTimeline(
        ticket_id=ticket.id, 
        user_id=current_user.id, 
        event_type="STATUS_CHANGE",
        content=content,
        extra_metadata={"new_status": awaiting_status.name, "resolved_by": current_user.id}
    ))
    
    # Create notification for client
    db.add(Notification(
        tenant_id=ticket.tenant_id,
        user_id=ticket.created_by,
        title="Тикет завершён",
        message=f"Ваш тикет #{ticket.readable_id} '{ticket.title}' выполнен. Пожалуйста, подтвердите закрытие.",
        link=f"/tickets/{ticket.id}"
    ))
    
    db.commit()
    db.refresh(ticket)
    
    # Broadcast update
    await manager.broadcast_to_tenant({
        "type": "TICKET_RESOLVED",
        "ticket_id": ticket.id,
        "readable_id": ticket.readable_id
    }, tenant_id=ticket.tenant_id)
    
    return ticket

@router.post("/{ticket_id}/close", response_model=schemas.TicketResponse)
async def close_ticket(ticket_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Клиент закрывает тикет после подтверждения выполнения
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id).first()
    if not ticket:
        raise ticket_not_found()
    
    # Only creator (client) or admin can close
    if ticket.created_by != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Только создатель тикета или администратор может закрыть тикет")
    
    closed_status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == current_user.tenant_id, 
        TicketStatus.is_final == True
    ).first()
    
    if not closed_status:
        closed_status = db.query(TicketStatus).filter(
            TicketStatus.tenant_id == current_user.tenant_id
        ).order_by(TicketStatus.order.desc()).first()
    
    if not closed_status:
        raise HTTPException(status_code=500, detail="Нет финального статуса")
    
    ticket.status_id = closed_status.id
    ticket.closed_by = current_user.id
    
    db.add(TicketTimeline(ticket_id=ticket.id, user_id=current_user.id, event_type="STATUS_CHANGE",
        content=f"Тикет закрыт клиентом: {closed_status.name}", 
        extra_metadata={"new_status": closed_status.name, "closed_by_role": current_user.role}))
    
    # Notify agent about closure
    if ticket.assigned_to:
        db.add(Notification(
            tenant_id=ticket.tenant_id,
            user_id=ticket.assigned_to,
            title="Тикет закрыт",
            message=f"Клиент подтвердил закрытие тикета #{ticket.readable_id} '{ticket.title}'",
            link=f"/tickets/{ticket.id}"
        ))
    
    db.commit()
    db.refresh(ticket)
    
    # Broadcast
    await manager.broadcast_to_tenant({
        "type": "TICKET_CLOSED",
        "ticket_id": ticket.id,
        "readable_id": ticket.readable_id
    }, tenant_id=ticket.tenant_id)
    
    return ticket

@router.post("/{ticket_id}/reopen", response_model=schemas.TicketResponse)
async def reopen_ticket(
    ticket_id: int, 
    reason: str = "",
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Клиент или агент могут переоткрыть закрытый тикет
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id).first()
    if not ticket:
        raise ticket_not_found()
    
    # Check if ticket is in final status
    current_status = db.query(TicketStatus).filter(TicketStatus.id == ticket.status_id).first()
    if not current_status or not current_status.is_final:
        raise HTTPException(status_code=400, detail="Тикет не находится в закрытом статусе")
    
    # Find "В работе" status
    in_progress_status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == current_user.tenant_id,
        TicketStatus.name == "В работе"
    ).first()
    
    if not in_progress_status:
        raise HTTPException(status_code=500, detail="Статус 'В работе' не настроен")
    
    ticket.status_id = in_progress_status.id
    ticket.closed_by = None
    ticket.resolved_at = None
    ticket.resolved_by = None
    
    content = f"Тикет переоткрыт"
    if reason:
        content += f": {reason}"
    content += f" пользователем {current_user.full_name or current_user.email}"
    
    db.add(TicketTimeline(
        ticket_id=ticket.id, 
        user_id=current_user.id, 
        event_type="STATUS_CHANGE",
        content=content,
        extra_metadata={"reopened_by": current_user.id}
    ))
    
    db.commit()
    db.refresh(ticket)
    
    # Broadcast
    await manager.broadcast_to_tenant({
        "type": "TICKET_REOPENED",
        "ticket_id": ticket.id,
        "readable_id": ticket.readable_id
    }, tenant_id=ticket.tenant_id)
    
    return ticket

@router.post("/{ticket_id}/assign/{agent_id}", response_model=schemas.TicketResponse)
async def assign_ticket(ticket_id: int, agent_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Только администратор может переназначить агента")
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id).first()
    if not ticket:
        raise ticket_not_found()
    agent = db.query(User).filter(User.id == agent_id, User.tenant_id == current_user.tenant_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Агент не найден")
    old_assignee = ticket.assigned_to
    ticket.assigned_to = agent_id
    db.add(TicketTimeline(ticket_id=ticket.id, user_id=current_user.id, event_type="ASSIGNMENT_CHANGE",
        content=f"Тикет переназначен на {agent.full_name or agent.email}",
        extra_metadata={"old_assignee": old_assignee, "new_assignee": agent_id}))
    db.commit()
    db.refresh(ticket)
    return ticket

@router.get("/stats/agents", response_model=List[schemas.AgentPerformance])
def get_agent_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Только для админов")
    from sqlalchemy import func as sqlfunc
    agents = db.query(User).filter(User.tenant_id == current_user.tenant_id, User.role.in_([UserRole.AGENT, UserRole.ADMIN])).all()
    resolved_ids = [s.id for s in db.query(TicketStatus).filter(TicketStatus.tenant_id == current_user.tenant_id, TicketStatus.is_final == True).all()]
    stats = []
    for agent in agents:
        resolved = db.query(Ticket).filter(Ticket.assigned_to == agent.id, Ticket.tenant_id == current_user.tenant_id, Ticket.status_id.in_(resolved_ids)).count()
        avg_rating_res = db.query(sqlfunc.avg(Ticket.rating)).filter(Ticket.assigned_to == agent.id, Ticket.tenant_id == current_user.tenant_id, Ticket.rating != None).scalar()
        stats.append(schemas.AgentPerformance(agent_id=agent.id, full_name=agent.full_name, resolved_count=resolved, avg_resolution_hours=None, sla_compliance_rate=round(float(avg_rating_res), 1) if avg_rating_res else None))
    return stats


@router.get("/{ticket_id}/attachments", response_model=List[schemas.AttachmentResponse])
def get_ticket_attachments(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить вложения тикета"""
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.tenant_id == current_user.tenant_id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    attachments = db.query(Attachment).filter(
        Attachment.ticket_id == ticket_id,
        Attachment.tenant_id == current_user.tenant_id
    ).all()
    
    return attachments
