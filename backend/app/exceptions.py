# Backward-compatibility shim: re-export from infrastructure
from app.infrastructure.exceptions import (
    ServiceDeskException, UserNotFoundException, UserAlreadyExistsException,
    InvalidCredentialsException, TicketNotFoundException, UnauthorizedException,
    ValidationException, user_not_found, user_already_exists, invalid_credentials,
    ticket_not_found, unauthorized,
)

__all__ = [
    "ServiceDeskException", "UserNotFoundException", "UserAlreadyExistsException",
    "InvalidCredentialsException", "TicketNotFoundException", "UnauthorizedException",
    "ValidationException", "user_not_found", "user_already_exists", "invalid_credentials",
    "ticket_not_found", "unauthorized",
]
