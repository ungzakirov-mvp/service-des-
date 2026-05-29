from sqlalchemy.orm import Session
from app.models import Ticket, User, UserRole
from app.logger import logger
from app.services.notifications import notify_status_changed

class AutomationService:
    @staticmethod
    async def process_event(db: Session, event_type: str, ticket: Ticket, context: dict = None):
        """
        Обработка событий тикета для запуска автоматизаций
        """
        logger.info("automation_event_triggered", 
                    event_type=event_type, 
                    ticket_id=ticket.id, 
                    tenant_id=ticket.tenant_id)

        if event_type == "on_ticket_create":
            await AutomationService._handle_ticket_create(db, ticket)
        
        elif event_type == "on_status_change":
            await AutomationService._handle_status_change(db, ticket, context)

    @staticmethod
    async def _handle_ticket_create(db: Session, ticket: Ticket):
        # Example 1: Notify managers/admins about new ticket
        # (Already handled by notify_ticket_created but we can add more logic here)
        pass

    @staticmethod
    async def _handle_status_change(db: Session, ticket: Ticket, context: dict):
        # Example 2: If status is 'resolved', notify the creator
        # (This logic can be data-driven in later phases)
        # For now, we use it as a point to trigger existing notification logic
        await notify_status_changed(db, ticket)

    @staticmethod
    def auto_assign_by_category(db: Session, ticket: Ticket):
        """
        Пример автоматического назначения по категории
        """
        if not ticket.category:
            return

        # Simple logic: if category is 'Technical', assign to a specific team or agent
        # In a real SaaS, this would be based on tenant-defined rules
        pass
