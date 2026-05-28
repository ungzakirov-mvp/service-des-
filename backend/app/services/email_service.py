from sqlalchemy.orm import Session
from app.models import User, Ticket, Tenant, TicketStatus, TicketTimeline, TimelineEventType, UserRole
from app.security import hash_password
from app.sla import calculate_sla_due_date
from app.services.routing_service import find_best_agent
from app.logger import log_business_event
from app import schemas

def process_inbound_email(
    db: Session,
    email_from: str,
    subject: str,
    body: str,
    sender_name: str = None
):
    """
    Parses an inbound email and creates a ticket.
    If user doesn't exist, creates a Client account in Demo Tenant.
    """
    
    # 1. Resolve Tenant (For MVP, hardcode to Demo or find by domain)
    # Ideally: analyze "To" address (support@tenant.upservice.io)
    # Fallback to default Demo tenant
    tenant = db.query(Tenant).filter(Tenant.slug == "demo").first()
    if not tenant:
        # Fallback to any first tenant if demo missing
        tenant = db.query(Tenant).first()
        if not tenant:
            raise Exception("No tenant configured")

    # 2. Find or Create User
    user = db.query(User).filter(User.email == email_from).first()
    if not user:
        # Create new Client
        password = os.environ.get("EMAIL_AUTO_CREATE_PASSWORD", "")
        user = User(
            email=email_from,
            password=hash_password(password),
            full_name=sender_name or email_from.split('@')[0],
            role=UserRole.CLIENT,
            tenant_id=tenant.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_business_event("user_created_via_email", user_id=user.id, email=user.email)

    # 3. Create Ticket
    # Get default status
    default_status = db.query(TicketStatus).filter(
        TicketStatus.tenant_id == tenant.id,
        TicketStatus.order == 1
    ).first()

    # Calc ID
    from sqlalchemy import desc
    last_ticket = db.query(Ticket).filter(
        Ticket.tenant_id == tenant.id
    ).order_by(desc(Ticket.readable_id)).first()
    next_id = (last_ticket.readable_id if last_ticket else 0) + 1

    # SLA (Default to Low/Medium for email? Let's say Medium)
    priority = "medium"
    sla_due = calculate_sla_due_date(priority)

    # Auto-routing
    assigned_agent_id = find_best_agent(db, tenant.id)

    ticket = Ticket(
        tenant_id=tenant.id,
        readable_id=next_id,
        title=subject,
        description=body, # In real world, strip HTML signatures
        priority=priority,
        status_id=default_status.id,
        created_by=user.id,
        assigned_to=assigned_agent_id,
        sla_due_at=sla_due
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # 4. Timeline Event
    timeline = TicketTimeline(
        ticket_id=ticket.id,
        user_id=user.id,
        event_type=TimelineEventType.create,
        content=f"Тикет создан через Email: {subject}"
    )
    db.add(timeline)
    db.commit()

    return ticket
