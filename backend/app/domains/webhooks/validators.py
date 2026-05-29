from typing import Any, Dict, Optional
from fastapi import HTTPException
from app.domains.webhooks import constants as const


def validate_payload_size(body_bytes: bytes) -> None:
    if len(body_bytes) > const.MAX_PAYLOAD_SIZE:
        raise HTTPException(413, detail=f"Payload exceeds {const.MAX_PAYLOAD_SIZE // 1024} KB limit")


def validate_payload_structure(payload: Dict[str, Any], source: str) -> None:
    errors = []

    if source == const.WEBHOOK_SOURCE_EMAIL:
        if "sender" not in payload or not isinstance(payload.get("sender"), str):
            errors.append("Missing or invalid 'sender' (must be string)")
        if "subject" not in payload or not isinstance(payload.get("subject"), str):
            errors.append("Missing or invalid 'subject' (must be string)")
        if "body" not in payload or not isinstance(payload.get("body"), str):
            errors.append("Missing or invalid 'body' (must be string)")
    elif source == const.WEBHOOK_SOURCE_TELEGRAM:
        if "update_id" not in payload:
            errors.append("Missing 'update_id'")

    if errors:
        raise HTTPException(400, detail=f"Invalid payload: {'; '.join(errors)}")


def validate_idempotency_key(key: Optional[str]) -> Optional[str]:
    if key is not None:
        if not isinstance(key, str) or len(key) < 1 or len(key) > 255:
            raise HTTPException(400, detail="Invalid X-Idempotency-Key format")
    return key
