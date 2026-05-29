from app.models import Ticket, User, UserRole


def _is_staff(user: User) -> bool:
    return user.role in (UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)


def can_view_ticket(ticket: Ticket, user: User) -> bool:
    if _is_staff(user):
        return True
    return ticket.created_by == user.id


def can_edit_ticket(ticket: Ticket, user: User) -> bool:
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return True
    if user.role == UserRole.CLIENT:
        return ticket.created_by == user.id
    if user.role == UserRole.AGENT:
        return True
    return False


def can_accept_ticket(user: User) -> bool:
    return _is_staff(user)


def can_resolve_ticket(user: User) -> bool:
    return _is_staff(user)


def can_close_ticket(ticket: Ticket, user: User) -> bool:
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return True
    return ticket.created_by == user.id


def can_reopen_ticket(user: User) -> bool:
    return True


def can_assign_ticket(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


def can_delete_ticket(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


def can_rate_ticket(ticket: Ticket, user: User) -> bool:
    return ticket.created_by == user.id


def can_view_timeline(ticket: Ticket, user: User) -> bool:
    return can_view_ticket(ticket, user)


def can_view_attachments(ticket: Ticket, user: User) -> bool:
    return can_view_ticket(ticket, user)


def require_ticket_access(ticket: Ticket, user: User):
    if not can_view_ticket(ticket, user):
        from app.exceptions import unauthorized
        raise unauthorized()
