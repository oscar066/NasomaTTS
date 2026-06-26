"""Admin routes — user management and platform stats."""

import secrets
from datetime import datetime, timedelta

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..auth.setup import UserManager, fastapi_users, get_user_manager
from ..models.document import NasomaDocument
from ..models.user import User, UserCreate
from ..schemas.admin import VALID_PLANS, AdminCreateUserBody, AdminEditUserBody, AdminUpdatePlanBody
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.routes.admin")
router = APIRouter(prefix="/admin", tags=["admin"])

current_superuser = fastapi_users.current_user(active=True, superuser=True)


@router.get("/stats")
async def get_stats(_: User = Depends(current_superuser)):
    now      = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    total_users = await User.count()
    total_docs  = await NasomaDocument.count()

    return {
        "total_users":         total_users,
        "total_documents":     total_docs,
        "new_users_this_week": await User.find(User.created_at >= week_ago).count(),
        "new_docs_this_week":  await NasomaDocument.find(NasomaDocument.created_at >= week_ago).count(),
        "verified_users":      await User.find(User.is_verified == True).count(),  # noqa: E712
        "unverified_users":    total_users - await User.find(User.is_verified == True).count(),  # noqa: E712
    }


@router.get("/users")
async def list_users(
    search: str = "",
    skip:   int = 0,
    limit:  int = 20,
    _: User = Depends(current_superuser),
):
    query = User.find({"$or": [
        {"email":    {"$regex": search, "$options": "i"}},
        {"username": {"$regex": search, "$options": "i"}},
    ]}) if search else User.find()

    total = await query.count()
    users = await query.skip(skip).limit(limit).to_list()

    rows = []
    for user in users:
        rows.append({
            "id":           str(user.id),
            "email":        user.email,
            "username":     user.username,
            "avatar":       user.avatar,
            "plan":         user.plan,
            "is_active":    user.is_active,
            "is_verified":  user.is_verified,
            "is_superuser": user.is_superuser,
            "joined":       user.created_at,
            "doc_count":    await NasomaDocument.find(NasomaDocument.author == user.id).count(),
        })

    return {"total": total, "users": rows}


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, acting: User = Depends(current_superuser)):
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Cannot deactivate a superuser")

    new_state = not user.is_active
    await user.set({"is_active": new_state})
    logger.info("Admin %s toggled user %s active=%s", acting.email, user_id, new_state)
    return {"id": user_id, "is_active": new_state}


@router.post("/users")
async def create_user(
    body: AdminCreateUserBody,
    acting: User = Depends(current_superuser),
    user_manager: UserManager = Depends(get_user_manager),
):
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}")

    if await User.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    try:
        created = await user_manager.create(
            UserCreate(email=body.email, username=body.username, password=secrets.token_urlsafe(20), is_superuser=body.is_superuser),
            safe=False,
        )
    except Exception as e:
        logger.error("Admin user creation failed for %s: %s", body.email, e)
        raise HTTPException(status_code=400, detail=str(e))

    if body.plan != "free":
        await created.set({"plan": body.plan})

    logger.info("Admin %s created user %s plan=%s", acting.email, created.email, body.plan)
    return {"id": str(created.id), "email": created.email, "username": created.username}


@router.patch("/users/{user_id}")
async def edit_user(user_id: str, body: AdminEditUserBody, acting: User = Depends(current_superuser)):
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}")

    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(acting.id) == user_id and not body.is_superuser:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role.")

    await user.set({"plan": body.plan, "is_superuser": body.is_superuser})
    logger.info("Admin %s edited user %s: plan=%s superuser=%s", acting.email, user_id, body.plan, body.is_superuser)
    return {"id": user_id, "plan": body.plan, "is_superuser": body.is_superuser}


@router.patch("/users/{user_id}/plan")
async def update_user_plan(user_id: str, body: AdminUpdatePlanBody, acting: User = Depends(current_superuser)):
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}")

    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await user.set({"plan": body.plan})
    logger.info("Admin %s set user %s plan=%s", acting.email, user_id, body.plan)
    return {"id": user_id, "plan": body.plan}


@router.post("/users/{user_id}/resend-verification")
async def resend_verification(
    user_id: str,
    acting: User = Depends(current_superuser),
    user_manager: UserManager = Depends(get_user_manager),
):
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified.")

    await user_manager.request_verify(user)
    logger.info("Admin %s resent verification to %s", acting.email, user.email)
    return {"sent": True}
