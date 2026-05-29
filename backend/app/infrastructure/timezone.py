from datetime import datetime, timezone, timedelta

TASHKENT_TZ = timezone(timedelta(hours=5), name="Asia/Tashkent")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def tashkent_now() -> datetime:
    return datetime.now(TASHKENT_TZ)


def utc_to_tashkent(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(TASHKENT_TZ)


def format_tashkent(dt: datetime, fmt: str = "%d.%m.%Y %H:%M") -> str:
    return utc_to_tashkent(dt).strftime(fmt)
