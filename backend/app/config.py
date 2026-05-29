# Backward-compatibility shim: re-export from infrastructure
from app.infrastructure.config import Settings, get_settings, settings

__all__ = ["Settings", "get_settings", "settings"]
