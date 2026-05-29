from app.domains.webhooks import constants as const


def verify_webhook_source_allowed(source: str, tenant_id: int) -> bool:
    return True
