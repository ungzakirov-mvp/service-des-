from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Ticket, SLAPolicy, TicketPriority
from app.logger import logger

class SLAService:
    @staticmethod
    def calculate_due_date(db: Session, tenant_id: int, priority: str) -> datetime:
        """
        Расчет времени дедлайна (Resolution Due Date) на основе политики SLA
        """
        # Try to find a custom policy for this tenant and priority
        policy = db.query(SLAPolicy).filter(
            SLAPolicy.tenant_id == tenant_id,
            SLAPolicy.priority == priority,
            SLAPolicy.is_active == True
        ).first()

        # Default resolution times (in minutes) if no policy is found
        default_times = {
            TicketPriority.LOW: 72 * 60,      # 72 hours = 3 days
            TicketPriority.MEDIUM: 48 * 60,   # 48 hours = 2 days
            TicketPriority.HIGH: 24 * 60,     # 24 hours = 1 day
            TicketPriority.CRITICAL: 8 * 60   # 8 hours = рабочий день
        }

        minutes_to_add = policy.resolution_time_minutes if policy else default_times.get(priority, 24 * 60)
        
        due_at = datetime.now() + timedelta(minutes=minutes_to_add)
        
        logger.info("sla_calculated", 
                    tenant_id=tenant_id, 
                    priority=priority, 
                    due_at=due_at.isoformat(),
                    using_policy=bool(policy))
                    
        return due_at

    @staticmethod
    def update_ticket_sla(db: Session, ticket: Ticket):
        """
        Обновление дедлайна тикета (например, при смене приоритета)
        """
        new_due_at = SLAService.calculate_due_date(db, ticket.tenant_id, ticket.priority)
        ticket.sla_due_at = new_due_at
        db.add(ticket)
        # We don't commit here, usually handled by the caller router
