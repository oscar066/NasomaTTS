"""
Shared FastAPI dependencies.

This module contains reusable ``Depends``-compatible callables that are
injected into route handlers.  Keeping them here (rather than inline in each
router) avoids duplication and makes the authentication logic easy to test in
isolation.
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from bson import ObjectId

from .config import settings
from .db.database import get_db
from .utils.logger import setup_logger

logger = setup_logger("nasoma.deps")

# HTTPBearer extracts the ``Authorization: Bearer <token>`` header and raises
# a 403 automatically when the header is missing.
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
) -> dict:
    """Validate the Bearer token and return the authenticated user document.

    This dependency is injected into any route that requires authentication.
    It performs two checks:

    1. **Token integrity** — the JWT signature and expiry are verified using
       the configured secret and algorithm.
    2. **User existence** — the ``id`` claim is looked up in the ``users``
       collection to confirm the account still exists.

    Args:
        credentials: The parsed ``Authorization`` header provided by
            :class:`~fastapi.security.HTTPBearer`.
        db: MongoDB database handle from :func:`~app.db.database.get_db`.

    Returns:
        The raw MongoDB user document (dict) for the authenticated user.

    Raises:
        HTTPException 401: If the token is invalid, expired, or the user no
            longer exists in the database.
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("id")
        if not user_id:
            logger.warning("Token decoded but missing 'id' claim")
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError as e:
        logger.warning("JWT verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        # Token was valid but the account was deleted after it was issued.
        logger.warning("Token valid but user %s not found in DB", user_id)
        raise HTTPException(status_code=401, detail="User not found")

    logger.debug("Authenticated user %s", user_id)
    return user
