"""
Centralised logging configuration for NasomaTTS.

All application modules obtain their logger via :func:`setup_logger`.  The
function returns a standard :class:`logging.Logger` decorated with a coloured
console formatter so log levels are immediately distinguishable at a glance.

Third-party libraries that produce excessive output (pymongo, motor, asyncio)
are silenced to ERROR level at import time so they only surface genuine faults.
"""

import logging

import colorama
from colorama import Fore, Style

# Required on Windows; no-op on macOS/Linux.
colorama.init(autoreset=True)

# ── Silence chatty third-party loggers ────────────────────────────────────────
# These libraries log at DEBUG/INFO for every operation, which drowns out
# application-level messages.  We only want to hear from them on errors.
for _noisy in ("pymongo", "motor", "asyncio"):
    logging.getLogger(_noisy).setLevel(logging.ERROR)


def setup_logger(
    name: str,
    level: int = logging.DEBUG,
    console_level: int = logging.DEBUG,
) -> logging.Logger:
    """Create and return a named logger with coloured console output.

    The function is idempotent: calling it twice with the same *name* returns
    the existing logger without adding duplicate handlers.

    Args:
        name: Logger name — use a dotted ``nasoma.*`` namespace so loggers
            form a hierarchy (e.g. ``"nasoma.routes.auth"``).
        level: Minimum level the logger itself processes.  Records below this
            are discarded before reaching any handler.
        console_level: Minimum level forwarded to the console handler.  Set
            higher than *level* to suppress verbose output in production.

    Returns:
        A configured :class:`logging.Logger` instance.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Guard against duplicate handlers when the module is reloaded (e.g.
    # during hot-reload in development).
    if logger.handlers:
        return logger

    console_handler = logging.StreamHandler()
    console_handler.setLevel(console_level)

    class _ColoredFormatter(logging.Formatter):
        """Log formatter that applies ANSI colour codes per severity level."""

        _FORMATS = {
            logging.DEBUG:    Fore.CYAN   + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Style.RESET_ALL,
            logging.INFO:     Fore.GREEN  + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Style.RESET_ALL,
            logging.WARNING:  Fore.YELLOW + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Style.RESET_ALL,
            logging.ERROR:    Fore.RED    + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Style.RESET_ALL,
            logging.CRITICAL: Fore.RED + Style.BRIGHT + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Style.RESET_ALL,
        }

        def format(self, record: logging.LogRecord) -> str:
            fmt = self._FORMATS.get(record.levelno, self._FORMATS[logging.DEBUG])
            return logging.Formatter(fmt).format(record)

    console_handler.setFormatter(_ColoredFormatter())
    logger.addHandler(console_handler)

    return logger
