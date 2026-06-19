from slowapi import Limiter
from slowapi.util import get_remote_address

# Global default: 60 requests/minute per IP.
# Sensitive auth endpoints override this with stricter limits via @limiter.limit().
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
