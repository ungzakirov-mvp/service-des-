import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Tenant, UserRole, RefreshToken
from app.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token, hash_refresh_token, generate_jti
from app.exceptions import user_already_exists, invalid_credentials
from app.logger import log_business_event
from app.config import settings
from app import schemas
from app.services.audit_service import AuditService
from app.dependencies import get_current_user
from app.timezone import utc_now

router = APIRouter(prefix="/auth", tags=["Аутентификация"])

# Rate limiting: in-memory login attempt tracking
_login_attempts = defaultdict(list)
_LOGIN_MAX_ATTEMPTS = 10
_LOGIN_WINDOW_SECONDS = 900  # 15 minutes


def _create_tokens(db: Session, user_id: int, tenant_id: int) -> dict:
    """Create access & refresh tokens, store refresh token hash in DB."""
    jti = generate_jti()
    access_token = create_access_token(data={"sub": str(user_id), "tenant_id": tenant_id})
    refresh_token = create_refresh_token(data={"sub": str(user_id)}, jti=jti)

    # Store refresh token hash in DB for rotation/revocation
    expires_at = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = RefreshToken(
        token_hash=hash_refresh_token(refresh_token),
        user_id=user_id,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

def _check_login_rate_limit(ip: str):
    now = time.time()
    window_start = now - _LOGIN_WINDOW_SECONDS
    _login_attempts[ip] = [t for t in _login_attempts[ip] if t > window_start]
    if len(_login_attempts[ip]) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много попыток входа. Попробуйте через 15 минут."
        )

def _record_login_attempt(ip: str):
    _login_attempts[ip].append(time.time())

@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED,
             summary="Регистрация нового пользователя",
             description="Создание нового пользователя. В MVP версии все пользователи попадают в Demo Company.")
def register(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    _check_login_rate_limit(ip)
    _record_login_attempt(ip)
    # Проверка существования пользователя
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise user_already_exists()

    # В MVP/Demo версии привязываем всех к Demo Tenant
    # В продакшене здесь должна быть логика инвайтов или создания новой компании
    tenant = db.query(Tenant).filter(Tenant.slug == "demo").first()
    if not tenant:
        # Fallback if seed didn't run, though it should have
        raise HTTPException(status_code=500, detail="Default tenant setup missing")

    new_user = User(
        email=user_data.email,
        password=hash_password(user_data.password),
        full_name=user_data.full_name,
        tenant_id=tenant.id,
        role=user_data.role, # По умолчанию CLIENT
        company_id=user_data.company_id,
        anudesk_email=user_data.anudesk_email
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_business_event("user_registered", user_id=new_user.id, email=new_user.email, tenant_id=new_user.tenant_id)
    
    return _create_tokens(db, new_user.id, new_user.tenant_id)

@router.post("/login", response_model=schemas.Token,
             summary="Вход в систему",
             description="Аутентификация пользователя")
def login(request: Request, user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    _check_login_rate_limit(ip)
    
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user:
        _record_login_attempt(ip)
        AuditService.log(
            db, 
            tenant_id=1,
            action="USER_LOGIN_FAILED", 
            details={"email": user_data.email},
            ip_address=ip
        )
        raise invalid_credentials()
    
    if not verify_password(user_data.password, user.password):
        _record_login_attempt(ip)
        AuditService.log(
            db, 
            tenant_id=user.tenant_id, 
            action="USER_LOGIN_FAILED", 
            user_id=user.id,
            details={"email": user_data.email},
            ip_address=ip
        )
        raise invalid_credentials()
    
    # Reset rate limit on success
    _login_attempts.pop(ip, None)
    
    AuditService.log(
        db, 
        tenant_id=user.tenant_id, 
        action="USER_LOGIN_SUCCESS", 
        user_id=user.id,
        ip_address=ip
    )
    
    log_business_event("user_logged_in", user_id=user.id, email=user.email)
    
    return _create_tokens(db, user.id, user.tenant_id)

@router.post("/login/form", response_model=schemas.Token)
def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    _check_login_rate_limit(ip)
    
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password):
        _record_login_attempt(ip)
        AuditService.log(
            db,
            tenant_id=user.tenant_id if user else 1,
            action="USER_LOGIN_FAILED",
            details={"email": form_data.username, "source": "swagger_form"},
            ip_address=ip
        )
        raise invalid_credentials()
    
    # Reset rate limit on success
    _login_attempts.pop(ip, None)
    
    AuditService.log(
        db,
        tenant_id=user.tenant_id,
        action="USER_LOGIN_SUCCESS",
        user_id=user.id,
        details={"source": "swagger_form"},
        ip_address=ip
    )
    
    return _create_tokens(db, user.id, user.tenant_id)

@router.post("/refresh", response_model=schemas.Token, summary="Обновить токены (с ротацией refresh токена)")
def refresh_token(
    body: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    payload = verify_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Find the stored token by jti lookup via hash
    # Since we store by hash(token), we can't reverse-lookup jti directly.
    # Instead, we hash this token and look it up.
    token_hash = hash_refresh_token(body.refresh_token)
    stored = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked == False
    ).first()

    if not stored:
        # Token already revoked or doesn't exist — possible token theft
        raise HTTPException(status_code=401, detail="Refresh token revoked or expired")

    # Revoke old token (rotation)
    stored.revoked = True
    db.commit()

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return _create_tokens(db, user.id, user.tenant_id)


@router.get("/me", response_model=schemas.UserResponse, summary="Получить профиль текущего пользователя")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/telegram/link-token", summary="Сгенерировать одноразовый код для привязки Telegram")
def generate_telegram_link_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a one-time token for linking a Telegram account.
    User logs into the web app, clicks 'Link Telegram', gets a code,
    then sends /link <code> to the Telegram bot.
    """
    token = secrets.token_urlsafe(32)
    current_user.telegram_link_token = token
    db.add(current_user)
    db.commit()
    return {"token": token, "instructions": "Отправьте /link <код> боту @tickets_novum_bot в Telegram для привязки аккаунта."}

@router.post("/switch-org", summary="Переключиться между организациями")
def switch_org(
    body: schemas.SwitchOrgRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch current organization context. Issues new JWT with updated tenant_id."""
    from app.models import UserOrganization as UO

    target_org_id = body.organization_id
    if target_org_id == "all":
        # Verify user has access to 2+ orgs
        orgs = db.query(UO).filter(UO.user_id == current_user.id, UO.is_active == True).all()
        if len(orgs) < 2:
            raise HTTPException(status_code=400, detail="Need access to at least 2 organizations for 'all' mode")
        new_tenant_id = 0  # Sentinel for "all"
    else:
        try:
            target_int = int(target_org_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid organization_id")
        membership = db.query(UO).filter(
            UO.user_id == current_user.id,
            UO.tenant_id == target_int,
            UO.is_active == True
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Access denied to this organization")
        new_tenant_id = target_int

    token = create_access_token(data={"sub": str(current_user.id), "tenant_id": new_tenant_id})
    org = db.query(Tenant).filter(Tenant.id == new_tenant_id, Tenant.is_active == True).first()
    return {
        "access_token": token,
        "token_type": "bearer",
        "organization": {
            "id": org.id if org else None,
            "name": org.name if org else "All Organizations",
            "slug": org.slug if org else "all"
        } if new_tenant_id != 0 else {
            "id": "all",
            "name": "Все организации",
            "slug": "all"
        }
    }
