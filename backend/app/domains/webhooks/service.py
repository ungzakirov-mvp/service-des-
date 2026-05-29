"""Stable integration boundary — no business logic, only payload normalization + delegation."""
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models import Tenant
from app.domains.webhooks import constants as const
from app.domains.webhooks import queries as qry
from app.domains.webhooks import validators as val
from app.domains.webhooks import security as sec
from app.domains.webhooks.schemas import InboundEmailPayload
from app.services.email_service import process_inbound_email
from app.services.telegram_bot import telegram_bot
from app.domains.audit import service as audit_svc


async def process_email_webhook(
    raw_body: bytes,
    tenant: Tenant,
    idempotency_key: Optional[str],
    db: Session,
    audit_ctx: Dict[str, Any],
) -> Dict[str, Any]:
    import json
    payload_data = json.loads(raw_body.decode("utf-8"))
    val.validate_payload_structure(payload_data, const.WEBHOOK_SOURCE_EMAIL)

    payload = InboundEmailPayload(**payload_data)

    result = {"ticket_id": None, "readable_id": None}

    try:
        ticket = process_inbound_email(
            db=db,
            email_from=payload.sender,
            subject=payload.subject,
            body=payload.body,
            tenant_id=tenant.id,
        )
        result["ticket_id"] = ticket.id
        result["readable_id"] = ticket.readable_id

        audit_svc.record(
            db, tenant_id=tenant.id,
            action=const.WEBHOOK_AUDIT_ACTION_PROCESSED,
            target_type="webhook",
            target_id=ticket.id,
            details={
                "source": const.WEBHOOK_SOURCE_EMAIL,
                "sender": payload.sender,
                **audit_ctx,
            },
            source=const.WEBHOOK_SOURCE_EMAIL,
        )

        if idempotency_key:
            qry.record_idempotency(db, idempotency_key, const.WEBHOOK_SOURCE_EMAIL, result)

    except Exception as e:
        audit_svc.record(
            db, tenant_id=tenant.id,
            action=const.WEBHOOK_AUDIT_ACTION_REJECTED,
            target_type="webhook",
            details={
                "source": const.WEBHOOK_SOURCE_EMAIL,
                "error": str(e),
                **audit_ctx,
            },
            source=const.WEBHOOK_SOURCE_EMAIL,
        )
        raise

    return result


async def process_telegram_webhook(
    raw_body: bytes,
    tenant: Tenant,
    idempotency_key: Optional[str],
    db: Session,
    audit_ctx: Dict[str, Any],
) -> Dict[str, Any]:
    import json
    payload_data = json.loads(raw_body.decode("utf-8"))
    val.validate_payload_structure(payload_data, const.WEBHOOK_SOURCE_TELEGRAM)

    await telegram_bot.handle_update(payload_data)

    audit_svc.record(
        db, tenant_id=tenant.id,
        action=const.WEBHOOK_AUDIT_ACTION_PROCESSED,
        target_type="webhook",
        details={
            "source": const.WEBHOOK_SOURCE_TELEGRAM,
            "update_id": payload_data.get("update_id"),
            **audit_ctx,
        },
        source=const.WEBHOOK_SOURCE_TELEGRAM,
    )

    return {"status": "ok"}
