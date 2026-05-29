from fastapi import HTTPException, status


class ServiceDeskException(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class UserNotFoundException(ServiceDeskException):
    pass


class UserAlreadyExistsException(ServiceDeskException):
    pass


class InvalidCredentialsException(ServiceDeskException):
    pass


class TicketNotFoundException(ServiceDeskException):
    pass


class UnauthorizedException(ServiceDeskException):
    pass


class ValidationException(ServiceDeskException):
    pass


def user_not_found():
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")


def user_already_exists():
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь с таким email уже существует")


def invalid_credentials():
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный email или пароль", headers={"WWW-Authenticate": "Bearer"})


def ticket_not_found():
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тикет не найден")


def unauthorized():
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для выполнения этой операции")
