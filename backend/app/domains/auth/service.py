import secrets
import time
from collections import defaultdict
from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import User, Tenant, UserRole, RefreshToken
from app.infrastructure.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    verify_token, hash_refresh_token, generate_jti,
)
from app.infrastructure.exceptions import user_already_exists, invalid_credentials
from app.infrastructure.logger import log_business_event
from app.infrastructure.config import settings
from app.domains.audit import service as audit_svc
from app.infrastructure.timezone import utc_now
from app import schemas


# Rate limiting: in-memory login attempt tracking
_login_attempts: dict = defaultdict(list)
_LOGIN_MAX_ATTEMPTS = 10
_LOGIN_WINDOW_SECONDS = 900


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


def _create_tokens(db: Session, user_id: int, tenant_id: int) -> dict:
    jti = generate_jti()
    access_token = create_access_token(data={"sub": str(user_id), "tenant_id": tenant_id})
    refresh_token = create_refresh_token(data={"sub": str(user_id)}, jti=jti)
    expires_at = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = RefreshToken(
        token_hash=hash_refresh_token(refresh_token),
        user_id=user_id,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


def register_user(db: Session, user_data: schemas.UserCreate, ip: str) -> dict:
    _check_login_rate_limit(ip)
    _record_login_attempt(ip)

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise user_already_exists()

    tenant = db.query(Tenant).filter(Tenant.slug == "demo").first()
    if not tenant:
        raise HTTPException(status_code=500, detail="Default tenant setup missing")

    new_user = User(
        email=user_data.email,
        password=hash_password(user_data.password),
        full_name=user_data.full_name,
        tenant_id=tenant.id,
        role=user_data.role,
        company_id=user_data.company_id,
        anudesk_email=user_data.anudesk_email,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_business_event("user_registered", user_id=new_user.id, email=new_user.email, tenant_id=new_user.tenant_id)
    return _create_tokens(db, new_user.id, new_user.tenant_id)


def login_user(db: Session, user_data: schemas.UserLogin, ip: str) -> dict:
    _check_login_rate_limit(ip)

    user = db.query(User).filter(User.email == user_data.email).first()
    if not user:
        _record_login_attempt(ip)
        audit_svc.record(db, tenant_id=1, action="USER_LOGIN_FAILED", details={"email": user_data.email}, ip_address=ip)
        raise invalid_credentials()

    if not verify_password(user_data.password, user.password):
        _record_login_attempt(ip)
        audit_svc.record(db, tenant_id=user.tenant_id, action="USER_LOGIN_FAILED", user_id=user.id, details={"email": user_data.email}, ip_address=ip)
        raise invalid_credentials()

    _login_attempts.pop(ip, None)
    audit_svc.record(db, tenant_id=user.tenant_id, action="USER_LOGIN_SUCCESS", user_id=user.id, ip_address=ip)
    log_business_event("user_logged_in", user_id=user.id, email=user.email)
    return _create_tokens(db, user.id, user.tenant_id)


def login_user_form(db: Session, username: str, password: str, ip: str, source: str = "swagger_form") -> dict:
    _check_login_rate_limit(ip)

    user = db.query(User).filter(User.email == username).first()
    if not user or not verify_password(password, user.password):
        _record_login_attempt(ip)
        audit_svc.record(db, tenant_id=user.tenant_id if user else 1, action="USER_LOGIN_FAILED", details={"email": username, "source": source}, ip_address=ip)
        raise invalid_credentials()

    _login_attempts.pop(ip, None)
    audit_svc.record(db, tenant_id=user.tenant_id, action="USER_LOGIN_SUCCESS", user_id=user.id, details={"source": source}, ip_address=ip)
    return _create_tokens(db, user.id, user.tenant_id)


def refresh_user_token(db: Session, refresh_token_str: str) -> dict:
    payload = verify_token(refresh_token_str)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_hash = hash_refresh_token(refresh_token_str)
    stored = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked == False
    ).first()

    if not stored:
        raise HTTPException(status_code=401, detail="Refresh token revoked or expired")

    stored.revoked = True
    db.commit()

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return _create_tokens(db, user.id, user.tenant_id)


def generate_telegram_link_token(db: Session, user: User) -> dict:
    token = secrets.token_urlsafe(32)
    user.telegram_link_token = token
    db.add(user)
    db.commit()
    return {"token": token, "instructions": "Отправьте /link <код> боту @tickets_novum_bot в Telegram для привязки аккаунта."}


def switch_organization(db: Session, user: User, organization_id: str) -> dict:
    from app.models import UserOrganization as UO

    target_org_id = organization_id
    if target_org_id == "all":
        orgs = db.query(UO).filter(UO.user_id == user.id, UO.is_active == True).all()
        if len(orgs) < 2:
            raise HTTPException(status_code=400, detail="Need access to at least 2 organizations for 'all' mode")
        new_tenant_id = 0
    else:
        try:
            target_int = int(target_org_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid organization_id")
        membership = db.query(UO).filter(
            UO.user_id == user.id,
            UO.tenant_id == target_int,
            UO.is_active == True
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Access denied to this organization")
        new_tenant_id = target_int

    token = create_access_token(data={"sub": str(user.id), "tenant_id": new_tenant_id})
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
