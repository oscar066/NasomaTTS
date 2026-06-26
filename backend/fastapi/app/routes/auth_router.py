from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from ..schemas.auth import GoogleAuthBody
from ..auth.setup import auth_backend, fastapi_users, get_user_manager
from ..models.reading_activity import ReadingActivity
from ..models.user import User, UserCreate, UserRead, UserUpdate
from ..auth.setup import UserManager
from ..services.auth_service import google_sign_in
from ..utils.deps import get_current_user
from ..utils.logger import setup_logger
from ..utils.rate_limit import limiter

logger = setup_logger("nasoma.routes.auth")
router = APIRouter()

router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)


@router.get("/users/me/reading-activity", tags=["users"])
async def get_reading_activity(current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    since = today - timedelta(days=29)

    rows = await ReadingActivity.find(
        ReadingActivity.user_id == current_user.id,
        ReadingActivity.date >= since.isoformat(),
    ).to_list()

    by_date = {r.date: r.words_read for r in rows}

    days = []
    for i in range(30):
        d = (since + timedelta(days=i)).isoformat()
        days.append({"date": d, "words_read": by_date.get(d, 0)})

    return {"days": days}


@router.get("/users/me/stats", tags=["users"])
async def get_my_stats(current_user: User = Depends(get_current_user)):
    higher_count = await User.find(
        User.words_read > current_user.words_read,
        User.is_active == True,  # noqa: E712
    ).count()
    rank = (higher_count + 1) if current_user.words_read > 0 else None
    return {
        "words_read": current_user.words_read,
        "rank": rank,
    }


@router.post("/auth/google", tags=["auth"])
@limiter.limit("10/minute")
async def google_auth(
    request: Request,
    body: GoogleAuthBody,
    user_manager: UserManager = Depends(get_user_manager),
):
    try:
        _, token = await google_sign_in(body.id_token, user_manager)
    except Exception as e:
        logger.error("Google auth failed: %s", e)
        raise
    logger.info("Google auth: user signed in")
    return {"access_token": token, "token_type": "bearer"}
