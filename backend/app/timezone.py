from datetime import datetime, timezone, timedelta

TASHKENT_TZ = timezone(timedelta(hours=5), name="Asia/Tashkent")


def utc_now() -> datetime:
    """Current time as timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def tashkent_now() -> datetime:
    """Current time in Tashkent (UTC+5) as timezone-aware datetime."""
    return datetime.now(TASHKENT_TZ)


def utc_to_tashkent(dt: datetime) -> datetime:
    """Convert a UTC datetime to Tashkent timezone."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(TASHKENT_TZ)


def format_tashkent(dt: datetime, fmt: str = "%d.%m.%Y %H:%M") -> str:
    """Format a datetime in Tashkent timezone."""
    return utc_to_tashkent(dt).strftime(fmt)
