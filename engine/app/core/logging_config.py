import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from app.core.config import settings

class TokenFilter(logging.Filter):
    """
    Scans log records and redacts any accidental inclusion of the active session token.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str) and settings.SESSION_TOKEN:
            if settings.SESSION_TOKEN in record.msg:
                record.msg = record.msg.replace(settings.SESSION_TOKEN, "••••••••[REDACTED]")
        return True

def setup_logging():
    """
    Configures centralized rotating logging writing to %LOCALAPPDATA%\\CaptionLab\\logs\\engine.log.
    """
    settings.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = settings.LOGS_DIR / "engine.log"

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Avoid duplicate handlers if setup_logging is called multiple times
    if any(isinstance(h, RotatingFileHandler) for h in root_logger.handlers):
        return

    # Rotating file handler (5 MB per file, max 3 backup files)
    file_handler = RotatingFileHandler(
        str(log_file),
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] [%(name)s]: %(message)s"
    )
    file_handler.setFormatter(file_formatter)
    file_handler.addFilter(TokenFilter())

    # Console stream handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        "[%(levelname)s] %(name)s: %(message)s"
    )
    console_handler.setFormatter(console_formatter)
    console_handler.addFilter(TokenFilter())

    root_logger.addHandler(file_handler)
    # Only add console handler if not already present
    if not any(isinstance(h, logging.StreamHandler) and not isinstance(h, RotatingFileHandler) for h in root_logger.handlers):
        root_logger.addHandler(console_handler)

    logger = logging.getLogger("captionlab.startup")
    logger.info(f"Logging initialized. Log file: {log_file}")
