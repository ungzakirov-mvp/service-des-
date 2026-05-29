import hmac
import hashlib
import time
from typing import Optional, Tuple
from fastapi import HTTPException
from app.domains.webhooks import constants as const


def compute_signature(secret: str, body: bytes, timestamp: int) -> str:
    message = f"{timestamp}.{body.decode('utf-8')}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_signature(signature: str, secret: str, body: bytes, timestamp: int) -> bool:
    expected = compute_signature(secret, body, timestamp)
    return hmac.compare_digest(expected, signature)


def validate_timestamp(timestamp: int, max_age: int = const.MAX_TIMESTAMP_AGE_SECONDS) -> bool:
    now = int(time.time())
    return abs(now - timestamp) <= max_age


def parse_signature_header(header: str) -> Optional[Tuple[str, int]]:
    try:
        parts = header.split(",")
        sig_part = parts[0].strip()
        t_part = parts[1].strip()
        if not sig_part.startswith(const.SIGNATURE_PREFIX):
            return None
        signature = sig_part[len(const.SIGNATURE_PREFIX):]
        if not t_part.startswith("t="):
            return None
        timestamp = int(t_part[2:])
        return signature, timestamp
    except (IndexError, ValueError):
        return None


def format_signature_header(secret: str, body: bytes) -> str:
    timestamp = int(time.time())
    sig = compute_signature(secret, body, timestamp)
    return f"{const.SIGNATURE_PREFIX}{sig},t={timestamp}"


def require_signed_webhook(
    signature_header: Optional[str],
    body_bytes: bytes,
    secret: str,
):
    if not signature_header:
        raise HTTPException(401, "Missing X-Webhook-Signature header")

    parsed = parse_signature_header(signature_header)
    if not parsed:
        raise HTTPException(401, "Invalid signature header format")

    signature, sig_timestamp = parsed

    if not validate_timestamp(sig_timestamp):
        raise HTTPException(401, "Webhook timestamp expired or invalid")

    if not verify_signature(signature, secret, body_bytes, sig_timestamp):
        raise HTTPException(403, "Invalid webhook signature")
