from ..auth.setup import current_active_user as get_current_user, fastapi_users

get_optional_user = fastapi_users.current_user(active=True, optional=True)

__all__ = ["get_current_user", "get_optional_user"]
