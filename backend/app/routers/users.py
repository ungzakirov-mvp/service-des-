from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, UserRole, Tenant
from app.dependencies import get_current_user
from app.authz import require_admin
from app.security import hash_password
from app import schemas

router = APIRouter(prefix="/users", tags=["Пользователи"])

@router.get("/", response_model=List[schemas.UserAdminResponse])
def list_users(
    role: Optional[UserRole] = Query(None),
    company_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
List users in the tenant. Filterable by role.
    """
    query = db.query(User).filter(User.tenant_id == current_user.tenant_id)
    
    if current_user.role == UserRole.CLIENT:
        if current_user.company_id:
            query = query.filter(User.company_id == current_user.company_id)
        else:
            return []

    if role:
        query = query.filter(User.role == role)

    if company_id:
        query = query.filter(User.company_id == company_id)
    
    from sqlalchemy.orm import joinedload
    query = query.options(joinedload(User.company))
         
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new user (Admin only).
    """

    # Check existence
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Create
    new_user = User(
        email=user_in.email,
        password=hash_password(user_in.password),
        full_name=user_in.full_name,
        tenant_id=current_user.tenant_id,
        role=user_in.role or UserRole.CLIENT,
        company_id=user_in.company_id,
        anudesk_email=user_in.anudesk_email,
# SECURITY: plain_password excluded from response: plain_password=user_in.password
    )
    
    # Quick fix: The user request implies creating user FOR an organization.
    # We should support company_id in creation.
    # Since UserCreate is shared, I will rely on a new schema locally or update schemas.py later if needed.
    # For now, base UserCreate doesn't have company_id.
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.patch("/me", response_model=schemas.UserResponse)
def update_me(
    update_data: schemas.UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile.
    """
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    
    if update_data.password:
        current_user.password = hash_password(update_data.password)
# SECURITY: plain_password excluded from response: current_user.plain_password = update_data.password

    if update_data.anudesk_email is not None:
        current_user.anudesk_email = update_data.anudesk_email

    db.commit()
    db.refresh(current_user)
    return current_user

@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user_admin(
    user_id: int,
    update_data: schemas.UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update any user (Admin only).
    """

    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if field == 'password' and value:
            setattr(user, 'password', hash_password(value))
# SECURITY: plain_password excluded from response: setattr(user, 'plain_password', value)
        else:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a user (Admin only). Cannot delete yourself.
    """

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя удалить свой аккаунт")

    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    db.delete(user)
    db.commit()
    return None
