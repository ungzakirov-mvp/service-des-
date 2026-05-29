from typing import Optional
from fastapi import APIRouter, Depends, Header, Request, HTTPException
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.domains.webhooks import constants as const
from app.domains.webhooks import security as sec
from app.domains.webhooks import validators as val
from app.domains.webhooks import queries as qry
from app.domains.webhooks import service as svc
from app.domains.webhooks.schemas import WebhookResponse, WebhookErrorResponse

router = APIRouter(prefix="/webhooks", tags=["Вебхуки"])


@router.post("/email/inbound", summary="Входящий email через webhook")
async def receive_email(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None, alias=const.HEADER_SIGNATURE),
    x_tenant_id: Optional[str] = Header(None, alias=const.HEADER_TENANT_ID),
    x_idempotency_key: Optional[str] = Header(None, alias=const.HEADER_IDEMPOTENCY),
    db: Session = Depends(get_db),
):
    raw_body = await request.body()

    val.validate_payload_size(raw_body)

    tenant = qry.resolve_tenant(db, x_tenant_id, const.WEBHOOK_SOURCE_EMAIL)
    secret = qry.get_webhook_secret(tenant.id, const.WEBHOOK_SOURCE_EMAIL)

    sec.require_signed_webhook(x_webhook_signature, raw_body, secret)

    key = val.validate_idempotency_key(x_idempotency_key)
    if key and qry.check_idempotency(db, key, const.WEBHOOK_SOURCE_EMAIL):
        return WebhookResponse(status="ok", idempotent=True)

    audit_ctx = {"ip": request.client.host if request.client else "unknown"}
    result = await svc.process_email_webhook(raw_body, tenant, key, db, audit_ctx)
    return WebhookResponse(**result)


@router.post("/telegram", summary="Входящий webhook от Telegram")
async def telegram_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None, alias=const.HEADER_SIGNATURE),
    x_tenant_id: Optional[str] = Header(None, alias=const.HEADER_TENANT_ID),
    x_idempotency_key: Optional[str] = Header(None, alias=const.HEADER_IDEMPOTENCY),
    db: Session = Depends(get_db),
):
    raw_body = await request.body()

    val.validate_payload_size(raw_body)

    tenant = qry.resolve_tenant(db, x_tenant_id, const.WEBHOOK_SOURCE_TELEGRAM)
    secret = qry.get_webhook_secret(tenant.id, const.WEBHOOK_SOURCE_TELEGRAM)

    sec.require_signed_webhook(x_webhook_signature, raw_body, secret)

    key = val.validate_idempotency_key(x_idempotency_key)
    if key and qry.check_idempotency(db, key, const.WEBHOOK_SOURCE_TELEGRAM):
        return WebhookResponse(status="ok", idempotent=True)

    audit_ctx = {"ip": request.client.host if request.client else "unknown"}
    result = await svc.process_telegram_webhook(raw_body, tenant, key, db, audit_ctx)
    return WebhookResponse(**result)
