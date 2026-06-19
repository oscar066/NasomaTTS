"""Module-level arq pool — set once at startup, used anywhere without request context."""

_pool = None


def set_pool(pool) -> None:
    global _pool
    _pool = pool


def get_pool():
    return _pool
