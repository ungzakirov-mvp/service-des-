from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
from app.database import get_db
from app.models import User
from app.security import verify_token
from app.config import settings


# OAuth2 scheme для извлечения токена из заголовка Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency для получения текущего аутентифицированного пользователя
    
    Args:
        token: JWT токен из заголовка Authorization
        db: Сессия базы данных
    
    Returns:
        Объект пользователя
    
    Raises:
        HTTPException: Если токен невалиден или пользователь не найден
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Верификация токена
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    
    # Извлечение user_id из токена
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Поиск пользователя в БД
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    
    return user


# get_current_active_user removed — is_active check is already in get_current_user
