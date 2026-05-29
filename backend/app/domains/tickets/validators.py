from app.models import Ticket, TicketStatus, UserRole


def verify_tenant_ticket(ticket: Ticket, tenant_id: int):
    if ticket.tenant_id != tenant_id:
        from app.exceptions import ticket_not_found
        raise ticket_not_found()


def describe_status_change(old_status_id: int, new_status_id: int, new_status: TicketStatus) -> str:
    return f"Статус изменен на '{new_status.name}'"


def describe_priority_change(old_priority: str, new_priority: str) -> str:
    return f"Приоритет изменен с '{old_priority}' на '{new_priority}'"


def describe_assignment_change(agent_name: str) -> str:
    return f"Тикет назначен на '{agent_name}'"


def describe_company_change(company_name: str) -> str:
    return f"Компания изменена на '{company_name}'"
