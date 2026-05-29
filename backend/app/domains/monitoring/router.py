import os
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.security import verify_token
from app.domains.monitoring import service as mon_service

router = APIRouter(tags=["monitoring"])

API_KEY = os.environ.get("MONITORING_API_KEY", "")
if not API_KEY:
    import warnings
    warnings.warn("MONITORING_API_KEY not set - monitoring API key auth disabled")

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if x_api_key and x_api_key == API_KEY:
        return None
    if token:
        payload = verify_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user:
                    return user
    raise HTTPException(401, "Authentication required")


@router.post("/monitoring/metrics")
def receive_metrics(data: dict, x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(403, "Invalid API key")
    return mon_service.receive_metrics(data)


@router.get("/monitoring/metrics")
async def get_metrics(org_id: Optional[int] = None, host: Optional[str] = None,
                      user=Depends(get_optional_user),
                      db: Session = Depends(get_db)):
    return mon_service.get_metrics(db, user, org_id, host)


@router.get("/monitoring/history")
async def get_history(org_id: Optional[int] = None, metric: Optional[str] = None,
                      hours: int = 24,
                      user=Depends(get_optional_user),
                      db: Session = Depends(get_db)):
    return mon_service.get_history(db, user, org_id, metric, hours)


@router.get("/monitoring/dashboard")
async def get_dashboard(current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    return mon_service.get_dashboard(db, current_user)
