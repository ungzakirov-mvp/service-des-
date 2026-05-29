# Backward-compatibility shim: re-export from infrastructure
from app.infrastructure.database import DATABASE_URL, engine, SessionLocal, Base, get_db

__all__ = ["DATABASE_URL", "engine", "SessionLocal", "Base", "get_db"]
