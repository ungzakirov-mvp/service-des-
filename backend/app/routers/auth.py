from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Tenant, UserRole
from app.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.exceptions import user_already_exists, invalid_credentials
from app.logger import log_business_event
from app.config import settings
from app import schemas
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Аутентификация"])

@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED,
             summary="Регистрация нового пользователя",
             description="Создание нового пользователя. В MVP версии все пользователи попадают в Demo Company.")
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
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
    
    # Создание токенов
    access_token = create_access_token(data={"sub": str(new_user.id), "tenant_id": new_user.tenant_id})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/login", response_model=schemas.Token,
             summary="Вход в систему",
             description="Аутентификация пользователя")
def login(request: Request, user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user:
        # Log failed attempt
        AuditService.log(
            db, 
            tenant_id=1, # Sniffing tenant from email or just default for now
            action="USER_LOGIN_FAILED", 
            details={"email": user_data.email},
            ip_address=request.client.host if request.client else "unknown"
        )
        raise invalid_credentials()
    
    if not verify_password(user_data.password, user.password):
        # Log failed attempt
        AuditService.log(
            db, 
            tenant_id=user.tenant_id, 
            action="USER_LOGIN_FAILED", 
            user_id=user.id,
            details={"email": user_data.email},
            ip_address=request.client.host if request.client else "unknown"
        )
        raise invalid_credentials()
    
    # Log successful login
    AuditService.log(
        db, 
        tenant_id=user.tenant_id, 
        action="USER_LOGIN_SUCCESS", 
        user_id=user.id,
        ip_address=request.client.host if request.client else "unknown"
    )
    
    log_business_event("user_logged_in", user_id=user.id, email=user.email)
    
    access_token = create_access_token(data={"sub": str(user.id), "tenant_id": user.tenant_id})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/login/form", response_model=schemas.Token)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password):
        raise invalid_credentials()
    
    access_token = create_access_token(data={"sub": str(user.id), "tenant_id": user.tenant_id})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
from app.dependencies import get_current_user

@router.get("/me", response_model=schemas.UserResponse, summary="Получить профиль текущего пользователя")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
