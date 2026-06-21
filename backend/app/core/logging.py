"""
app/core/logging.py — structured JSON logging for production.

Replaces bare print() statements with structured log records that
Railway (and any log aggregator like Datadog or Logtail) can parse,
filter, and alert on.

Usage:
    from app.core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("plant.seeded", plant_id=1, date="2026-06-01")
    logger.error("groq.failed", plant_id=1, error=str(e))

In development: logs are emitted as human-readable text.
In production (when DATABASE_URL is not SQLite): logs are emitted as
JSON so Railway's log viewer can parse key-value fields.
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone


class _JsonFormatter(logging.Formatter):
    """Format log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log: dict = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # Merge any extra keyword arguments passed to the logger call
        for key, val in record.__dict__.items():
            if key not in (
                "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "name",
                "message", "taskName",
            ):
                log[key] = val
        if record.exc_info:
            log["exc"] = self.formatException(record.exc_info)
        return json.dumps(log, default=str)


class _DevFormatter(logging.Formatter):
    """Colourised human-readable formatter for local development."""

    _COLOURS = {
        "DEBUG":    "\033[36m",   # cyan
        "INFO":     "\033[32m",   # green
        "WARNING":  "\033[33m",   # yellow
        "ERROR":    "\033[31m",   # red
        "CRITICAL": "\033[35m",   # magenta
    }
    _RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        colour = self._COLOURS.get(record.levelname, "")
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        return f"{colour}{ts} [{record.levelname}] {record.name}: {record.getMessage()}{self._RESET}"


def setup_logging() -> None:
    """
    Configure the root logger.

    Call once at application startup (in main.py lifespan).
    After this call, any module can do `logging.getLogger(__name__)`
    and its output will be consistently formatted.
    """
    is_production = not os.getenv("DATABASE_URL", "sqlite").startswith("sqlite")

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter() if is_production else _DevFormatter())

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(handler)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Use as: logger = get_logger(__name__)"""
    return logging.getLogger(name)
