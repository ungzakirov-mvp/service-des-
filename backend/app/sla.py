from datetime import datetime, timedelta
from app.models import TicketPriority

# SLA Policy (Time to Resolve in hours) — aligned with services/sla_service.py
SLA_POLICY = {
    TicketPriority.LOW: 120,
    TicketPriority.MEDIUM: 72,
    TicketPriority.HIGH: 48,
    TicketPriority.CRITICAL: 24
}

def calculate_sla_due_date(priority: str, start_time: datetime = None) -> datetime:
    """
    Calculates SLA due date based on priority.
    TODO: Add Business Hours logic (9-18, Mon-Fri) for Enterprise version.
    Current MVP: 24/7 clock.
    """
    if not start_time:
        start_time = datetime.now() # naive if timezone agnostic, but we use timezone aware in DB
        
    hours = SLA_POLICY.get(priority, 24)
    return start_time + timedelta(hours=hours)

def get_time_remaining_str(due_at: datetime) -> str:
    if not due_at:
        return "-"
    
    # Needs timezone awareness matching DB
    # Assuming due_at is offset-aware if DB is
    
    now = datetime.now(due_at.tzinfo)
    delta = due_at - now
    
    if delta.total_seconds() < 0:
        return "Expired"
    
    hours = int(delta.total_seconds() // 3600)
    minutes = int((delta.total_seconds() % 3600) // 60)
    return f"{hours}h {minutes}m"
