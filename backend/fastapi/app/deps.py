from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from bson import ObjectId

from .config import settings
from .db.database import get_db
from .utils.logger import setup_logger

logger = setup_logger(__name__)
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
):
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
        logger.warning("Token valid but user %s not found in DB", user_id)
        raise HTTPException(status_code=401, detail="User not found")

    logger.debug("Authenticated user %s", user_id)
    return user
