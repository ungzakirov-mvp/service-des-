from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app import schemas
from app.domains.auth import service as auth_service

router = APIRouter(prefix="/auth", tags=["Аутентификация"])


@router.post("/register", response_model=schemas.Token, status_code=201,
             summary="Регистрация нового пользователя")
def register(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    return auth_service.register_user(db, user_data, ip)


@router.post("/login", response_model=schemas.Token, summary="Вход в систему")
def login(request: Request, user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    return auth_service.login_user(db, user_data, ip)


@router.post("/login/form", response_model=schemas.Token)
def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    return auth_service.login_user_form(db, form_data.username, form_data.password, ip)


@router.post("/refresh", response_model=schemas.Token, summary="Обновить токены (с ротацией refresh токена)")
def refresh_token(body: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_user_token(db, body.refresh_token)


@router.get("/me", response_model=schemas.UserResponse, summary="Получить профиль текущего пользователя")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/telegram/link-token", summary="Сгенерировать одноразовый код для привязки Telegram")
def generate_telegram_link_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return auth_service.generate_telegram_link_token(db, current_user)


@router.post("/switch-org", summary="Переключиться между организациями")
def switch_org(
    body: schemas.SwitchOrgRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return auth_service.switch_organization(db, current_user, body.organization_id)
