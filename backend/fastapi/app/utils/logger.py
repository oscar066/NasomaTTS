"""Centralised logging — coloured console output, noisy libs silenced."""

import logging

import colorama
from colorama import Fore, Style

colorama.init(autoreset=True)

for _noisy in ("pymongo", "motor", "asyncio"):
    logging.getLogger(_noisy).setLevel(logging.ERROR)


def setup_logger(name: str, level: int = logging.DEBUG, console_level: int = logging.DEBUG) -> logging.Logger:
    """Return a named logger with coloured console output. Idempotent."""
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if logger.handlers:
        return logger

    console_handler = logging.StreamHandler()
    console_handler.setLevel(console_level)

    class _ColoredFormatter(logging.Formatter):
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
