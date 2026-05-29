# Backward-compatibility shim: re-export from infrastructure
from app.infrastructure.logger import logger, setup_logging, log_request, log_error, log_business_event

__all__ = ["logger", "setup_logging", "log_request", "log_error", "log_business_event"]
