import structlog
import logging
import sys


def setup_logging():
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


logger = structlog.get_logger()


def log_request(method: str, path: str, status_code: int, duration: float):
    logger.info("http_request", method=method, path=path, status_code=status_code, duration_ms=round(duration * 1000, 2))


def log_error(error: Exception, context: dict = None):
    logger.error("error", error_type=type(error).__name__, error_message=str(error), context=context or {})


def log_business_event(event_type: str, **kwargs):
    logger.info("business_event", event_type=event_type, **kwargs)
