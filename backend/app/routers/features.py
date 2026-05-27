"""
Роутеры для новых бизнес-функций:
- Time Tracking (тайм-трекинг)
- Canned Responses (шаблоны ответов)
- Ticket Checklists (чек-листы)
- Ticket Ratings (CSAT оценки)
- Internal Notes (приватные заметки)
- Automation Rules (автоматизация)
- Customer Assets (оборудование клиентов)
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.dependencies import get_current_user
from app import models, schemas
from app.sla import calculate_sla_due_date
import json

router = APIRouter(prefix="/api/v1/features", tags=["features"])

# ============================================================================
# TIME TRACKING
# ============================================================================
@router.post("/time-entries/start", response_model=schemas.TimeEntryResponse)
def start_timer(
    data: schemas.TimeEntryStart,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Начать таймер для тикета"""
    # Проверяем что тикет существует
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == data.ticket_id,
        models.Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Проверяем что нет активного таймера
    active_timer = db.query(models.TimeEntry).filter(
        models.TimeEntry.user_id == current_user.id,
        models.TimeEntry.is_running == True
    ).first()
    if active_timer:
        raise HTTPException(status_code=400, detail="Already have active timer. Stop it first.")
    
    # Создаем новый таймер
    time_entry = models.TimeEntry(
        tenant_id=current_user.tenant_id,
        ticket_id=data.ticket_id,
        user_id=current_user.id,
        started_at=datetime.utcnow(),
        is_running=True,
        description=data.description
    )
    db.add(time_entry)
    db.commit()
    db.refresh(time_entry)
    
    # Добавляем в timeline
    timeline = models.TicketTimeline(
        tenant_id=current_user.tenant_id,
        ticket_id=data.ticket_id,
        user_id=current_user.id,
        event_type="timer_started",
        content=json.dumps({"timer_id": time_entry.id})
    )
    db.add(timeline)
    db.commit()
    
    return time_entry


@router.post("/time-entries/{entry_id}/stop", response_model=schemas.TimeEntryResponse)
def stop_timer(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Остановить таймер"""
    time_entry = db.query(models.TimeEntry).filter(
        models.TimeEntry.id == entry_id,
        models.TimeEntry.user_id == current_user.id,
        models.TimeEntry.is_running == True
    ).first()
    
    if not time_entry:
        raise HTTPException(status_code=404, detail="Active timer not found")
    
    time_entry.ended_at = datetime.utcnow()
    time_entry.is_running = False
    
    # Вычисляем минуты
    delta = time_entry.ended_at - time_entry.started_at
    time_entry.minutes = int(delta.total_seconds() / 60)
    
    db.commit()
    db.refresh(time_entry)
    
    return time_entry


@router.get("/time-entries/my", response_model=List[schemas.TimeEntryResponse])
def get_my_time_entries(
    ticket_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получить мои записи времени"""
    query = db.query(models.TimeEntry).filter(
        models.TimeEntry.user_id == current_user.id,
        models.TimeEntry.tenant_id == current_user.tenant_id
    )
    
    if ticket_id:
        query = query.filter(models.TimeEntry.ticket_id == ticket_id)
    if start_date:
        query = query.filter(models.TimeEntry.created_at >= start_date)
    if end_date:
        query = query.filter(models.TimeEntry.created_at <= end_date)
    
    entries = query.order_by(models.TimeEntry.created_at.desc()).all()
    return entries


@router.get("/time-entries/timer-status", response_model=schemas.TimerStatus)
def get_timer_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получить статус текущего таймера"""
    active_timer = db.query(models.TimeEntry).filter(
        models.TimeEntry.user_id == current_user.id,
        models.TimeEntry.is_running == True
    ).first()
    
    # Считаем общее время за сегодня
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_today = db.query(models.TimeEntry).filter(
        models.TimeEntry.user_id == current_user.id,
        models.TimeEntry.created_at >= today
    ).all()
    
    total_minutes = sum(e.minutes for e in total_today)
    if active_timer:
        delta = datetime.utcnow() - active_timer.started_at
        total_minutes += int(delta.total_seconds() / 60)
    
    return {
        "is_running": active_timer is not None,
        "current_entry": active_timer,
        "total_today_minutes": total_minutes
    }


@router.get("/time-entries/ticket/{ticket_id}/summary")
def get_ticket_time_summary(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Сводка по времени для тикета"""
    entries = db.query(models.TimeEntry).filter(
        models.TimeEntry.ticket_id == ticket_id,
        models.TimeEntry.tenant_id == current_user.tenant_id
    ).all()
    
    total_minutes = sum(e.minutes for e in entries)
    billable_minutes = sum(e.minutes for e in entries if e.is_billable)
    
    return {
        "total_minutes": total_minutes,
        "total_hours": round(total_minutes / 60, 2),
        "billable_minutes": billable_minutes,
        "billable_hours": round(billable_minutes / 60, 2),
        "entry_count": len(entries),
        "entries": entries
    }


# ============================================================================
# CANNED RESPONSES
# ============================================================================
@router.get("/canned-responses", response_model=List[schemas.CannedResponseResponse])
def get_canned_responses(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получить шаблоны ответов (личные + общие)"""
    query = db.query(models.CannedResponse).filter(
        models.CannedResponse.tenant_id == current_user.tenant_id,
        ((models.CannedResponse.is_personal == False) | 
         (models.CannedResponse.created_by == current_user.id))
    )
    
    if search:
        query = query.filter(
            (models.CannedResponse.title.ilike(f"%{search}%")) |
            (models.CannedResponse.shortcut.ilike(f"%{search}%"))
        )
    
    responses = query.order_by(models.CannedResponse.title).all()
    return responses


@router.post("/canned-responses", response_model=schemas.CannedResponseResponse)
def create_canned_response(
    data: schemas.CannedResponseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Создать шаблон ответа"""
    response = models.CannedResponse(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **data.dict()
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return response


@router.put("/canned-responses/{response_id}", response_model=schemas.CannedResponseResponse)
def update_canned_response(
    response_id: int,
    data: schemas.CannedResponseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Обновить шаблон ответа"""
    response = db.query(models.CannedResponse).filter(
        models.CannedResponse.id == response_id,
        models.CannedResponse.tenant_id == current_user.tenant_id,
        ((models.CannedResponse.is_personal == False) | 
         (models.CannedResponse.created_by == current_user.id))
    ).first()
    
    if not response:
        raise HTTPException(status_code=404, detail="Canned response not found")
    
    for field, value in data.dict(exclude_unset=True).items():
        setattr(response, field, value)
    
    db.commit()
    db.refresh(response)
    return response


@router.delete("/canned-responses/{response_id}")
def delete_canned_response(
    response_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Удалить шаблон ответа"""
    response = db.query(models.CannedResponse).filter(
        models.CannedResponse.id == response_id,
        models.CannedResponse.tenant_id == current_user.tenant_id,
        models.CannedResponse.created_by == current_user.id
    ).first()
    
    if not response:
        raise HTTPException(status_code=404, detail="Canned response not found")
    
    db.delete(response)
    db.commit()
    return {"message": "Canned response deleted"}


# ============================================================================
# TICKET CHECKLISTS
# ============================================================================
@router.get("/tickets/{ticket_id}/checklist", response_model=List[schemas.TicketChecklistResponse])
def get_ticket_checklist(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получить чек-лист тикета"""
    items = db.query(models.TicketChecklist).filter(
        models.TicketChecklist.ticket_id == ticket_id,
        models.TicketChecklist.tenant_id == current_user.tenant_id
    ).order_by(models.TicketChecklist.order).all()
    return items


@router.post("/tickets/{ticket_id}/checklist", response_model=schemas.TicketChecklistResponse)
def add_checklist_item(
    ticket_id: int,
    data: schemas.TicketChecklistCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Добавить пункт в чек-лист"""
    # Проверяем что тикет существует
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == ticket_id,
        models.Ticket.tenant_id == current_user.tenant_id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Находим максимальный order
    max_order = db.query(models.TicketChecklist).filter(
        models.TicketChecklist.ticket_id == ticket_id
    ).count()
    
    item = models.TicketChecklist(
        tenant_id=current_user.tenant_id,
        ticket_id=ticket_id,
        order=max_order,
        **data.dict(exclude={'ticket_id'})
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/checklist/{item_id}/toggle", response_model=schemas.TicketChecklistResponse)
def toggle_checklist_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Переключить статус пункта чек-листа"""
    item = db.query(models.TicketChecklist).filter(
        models.TicketChecklist.id == item_id,
        models.TicketChecklist.tenant_id == current_user.tenant_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    
    item.is_completed = not item.is_completed
    if item.is_completed:
        item.completed_by = current_user.id
        item.completed_at = datetime.utcnow()
    else:
        item.completed_by = None
        item.completed_at = None
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/checklist/{item_id}")
def delete_checklist_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Удалить пункт чек-листа"""
    item = db.query(models.TicketChecklist).filter(
        models.TicketChecklist.id == item_id,
        models.TicketChecklist.tenant_id == current_user.tenant_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Checklist item deleted"}


# ============================================================================
# TICKET RATINGS (CSAT)
# ============================================================================
@router.post("/tickets/{ticket_id}/rate", response_model=schemas.TicketRatingResponse)
def rate_ticket(
    ticket_id: int,
    data: schemas.TicketRatingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Оценить тикет (только создатель тикета)"""
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == ticket_id,
        models.Ticket.tenant_id == current_user.tenant_id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.created_by != current_user.id and current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only ticket creator can rate")
    
    # Проверяем что тикет закрыт
    if ticket.status_rel and ticket.status_rel.name not in ["закрыт", "closed", "решён", "resolved"]:
        raise HTTPException(status_code=400, detail="Can only rate closed tickets")
    
    # Проверяем что еще не оценен
    existing = db.query(models.TicketRating).filter(
        models.TicketRating.ticket_id == ticket_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ticket already rated")
    
    rating = models.TicketRating(
        tenant_id=current_user.tenant_id,
        ticket_id=ticket_id,
        rating=data.rating,
        comment=data.comment,
        is_public=data.is_public
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


@router.get("/ratings/my", response_model=List[schemas.TicketRatingResponse])
def get_my_ratings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получить мои оценки (для заказчиков)"""
    # Находим тикеты созданные пользователем
    tickets = db.query(models.Ticket.id).filter(
        models.Ticket.created_by == current_user.id
    ).subquery()
    
    ratings = db.query(models.TicketRating).filter(
        models.TicketRating.ticket_id.in_(tickets)
    ).all()
    return ratings


@router.get("/ratings/agent/{agent_id}/summary")
def get_agent_rating_summary(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Сводка рейтинга агента"""
    # Находим тикеты назначенные агенту
    tickets = db.query(models.Ticket.id).filter(
        models.Ticket.assigned_to == agent_id
    ).subquery()
    
    ratings = db.query(models.TicketRating).filter(
        models.TicketRating.ticket_id.in_(tickets)
    ).all()
    
    if not ratings:
        return {
            "average_rating": 0,
            "total_ratings": 0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        }
    
    total = len(ratings)
    avg = sum(r.rating for r in ratings) / total
    distribution = {i: sum(1 for r in ratings if r.rating == i) for i in range(1, 6)}
    
    return {
        "average_rating": round(avg, 2),
        "total_ratings": total,
        "rating_distribution": distribution
    }


# ============================================================================
# INTERNAL NOTES
# ============================================================================
@router.get("/tickets/{ticket_id}/internal-notes", response_model=List[schemas.InternalNoteResponse])
def get_internal_notes(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получить приватные заметки (только для агентов и админов)"""
    if current_user.role == models.UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Access denied")
    
    notes = db.query(models.InternalNote).filter(
        models.InternalNote.ticket_id == ticket_id,
        models.InternalNote.tenant_id == current_user.tenant_id
    ).order_by(models.InternalNote.is_pinned.desc(), models.InternalNote.created_at.desc()).all()
    
    return notes


@router.post("/tickets/{ticket_id}/internal-notes", response_model=schemas.InternalNoteResponse)
def create_internal_note(
    ticket_id: int,
    data: schemas.InternalNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Создать приватную заметку"""
    if current_user.role == models.UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Access denied")
    
    note = models.InternalNote(
        tenant_id=current_user.tenant_id,
        ticket_id=ticket_id,
        user_id=current_user.id,
        **data.dict(exclude={'ticket_id'})
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/internal-notes/{note_id}")
def delete_internal_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Удалить приватную заметку"""
    note = db.query(models.InternalNote).filter(
        models.InternalNote.id == note_id,
        models.InternalNote.tenant_id == current_user.tenant_id,
        models.InternalNote.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}


# ============================================================================
# AUTOMATION RULES
# ============================================================================
@router.get("/automation-rules", response_model=List[schemas.AutomationRuleResponse])
def get_automation_rules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Получить правила автоматизации (только для админов)"""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    rules = db.query(models.AutomationRule).filter(
        models.AutomationRule.tenant_id == current_user.tenant_id
    ).order_by(models.AutomationRule.order).all()
    return rules


@router.post("/automation-rules", response_model=schemas.AutomationRuleResponse)
def create_automation_rule(
    data: schemas.AutomationRuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Создать правило автоматизации"""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Находим максимальный order
    max_order = db.query(models.AutomationRule).filter(
        models.AutomationRule.tenant_id == current_user.tenant_id
    ).count()
    
    rule = models.AutomationRule(
        tenant_id=current_user.tenant_id,
        order=max_order,
        **data.dict()
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/automation-rules/{rule_id}", response_model=schemas.AutomationRuleResponse)
def update_automation_rule(
    rule_id: int,
    data: schemas.AutomationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Обновить правило автоматизации"""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    rule = db.query(models.AutomationRule).filter(
        models.AutomationRule.id == rule_id,
        models.AutomationRule.tenant_id == current_user.tenant_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    for field, value in data.dict(exclude_unset=True).items():
        setattr(rule, field, value)
    
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/automation-rules/{rule_id}")
def delete_automation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Удалить правило автоматизации"""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    rule = db.query(models.AutomationRule).filter(
        models.AutomationRule.id == rule_id,
        models.AutomationRule.tenant_id == current_user.tenant_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted"}


# ============================================================================

@router.get("/reports/time-tracking")
def get_time_tracking_report(
    start_date: datetime,
    end_date: datetime,
    user_id: Optional[int] = None,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Отчет по учету времени"""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        user_id = current_user.id  # Пользователи видят только свое время
    
    query = db.query(models.TimeEntry).filter(
        models.TimeEntry.tenant_id == current_user.tenant_id,
        models.TimeEntry.created_at >= start_date,
        models.TimeEntry.created_at <= end_date
    )
    
    if user_id:
        query = query.filter(models.TimeEntry.user_id == user_id)
    
    entries = query.all()
    
    # Группировка по пользователям
    by_user = {}
    for entry in entries:
        uid = entry.user_id
        if uid not in by_user:
            by_user[uid] = {"name": entry.user.full_name if entry.user else "Unknown", "minutes": 0, "billable": 0}
        by_user[uid]["minutes"] += entry.minutes
        if entry.is_billable:
            by_user[uid]["billable"] += entry.minutes
    
    total_minutes = sum(e.minutes for e in entries)
    billable_minutes = sum(e.minutes for e in entries if e.is_billable)
    
    return {
        "period": {"start": start_date, "end": end_date},
        "summary": {
            "total_hours": round(total_minutes / 60, 2),
            "billable_hours": round(billable_minutes / 60, 2),
            "total_entries": len(entries)
        },
        "by_user": by_user,
        "entries": entries
    }


@router.get("/reports/csat")
def get_csat_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Отчет по удовлетворенности клиентов (CSAT)"""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(models.TicketRating).filter(
        models.TicketRating.tenant_id == current_user.tenant_id
    )
    
    if start_date:
        query = query.filter(models.TicketRating.created_at >= start_date)
    if end_date:
        query = query.filter(models.TicketRating.created_at <= end_date)
    
    ratings = query.all()
    
    if not ratings:
        return {"message": "No ratings found for the period"}
    
    total = len(ratings)
    avg_rating = sum(r.rating for r in ratings) / total
    distribution = {i: sum(1 for r in ratings if r.rating == i) for i in range(1, 6)}
    
    # CSAT Score (оценки 4 и 5 считаются положительными)
    positive = distribution[4] + distribution[5]
    csat_score = (positive / total * 100) if total > 0 else 0
    
    return {
        "period": {"start": start_date, "end": end_date},
        "summary": {
            "total_ratings": total,
            "average_rating": round(avg_rating, 2),
            "csat_score": round(csat_score, 1),
            "positive_count": positive,
            "negative_count": total - positive
        },
        "distribution": distribution,
        "ratings": ratings
    }