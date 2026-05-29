from app.models import Notification, User


def can_view_notification(notification: Notification, user: User) -> bool:
    return notification.user_id == user.id and notification.tenant_id == user.tenant_id
