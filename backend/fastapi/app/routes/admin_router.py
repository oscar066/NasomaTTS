import secrets
from datetime import datetime, timedelta

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth.setup import fastapi_users, get_user_manager
from ..auth.setup import UserManager
from ..models.document import NasomaDocument
from ..models.user import User, UserCreate

router = APIRouter(prefix="/admin", tags=["admin"])

current_superuser = fastapi_users.current_user(active=True, superuser=True)


@router.get("/stats")
async def get_stats(_: User = Depends(current_superuser)):
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    total_users = await User.count()
    total_docs  = await NasomaDocument.count()

    new_users_this_week = await User.find(
        User.created_at >= week_ago
    ).count()
    new_docs_this_week = await NasomaDocument.find(
        NasomaDocument.created_at >= week_ago
    ).count()

    verified_users   = await User.find(User.is_verified == True).count()
    unverified_users = total_users - verified_users

    return {
        "total_users":         total_users,
        "total_documents":     total_docs,
        "new_users_this_week": new_users_this_week,
        "new_docs_this_week":  new_docs_this_week,
        "verified_users":      verified_users,
        "unverified_users":    unverified_users,
    }


@router.get("/users")
async def list_users(
    search: str = "",
    skip:   int = 0,
    limit:  int = 20,
    _: User = Depends(current_superuser),
):
    query = User.find()
    if search:
        query = User.find({"$or": [
            {"email":    {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}},
        ]})

    total = await query.count()
    users = await query.skip(skip).limit(limit).to_list()

    rows = []
    for user in users:
        doc_count = await NasomaDocument.find(
            NasomaDocument.author == user.id
        ).count()
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
            "doc_count":    doc_count,
        })

    return {"total": total, "users": rows}


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    _: User = Depends(current_superuser),
):
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Cannot deactivate a superuser")

    await user.set({"is_active": not user.is_active})
    return {"id": user_id, "is_active": user.is_active}


class AdminCreateUserBody(BaseModel):
    email: str
    username: str
    is_superuser: bool = False
    plan: str = "free"


@router.post("/users")
async def create_user(
    body: AdminCreateUserBody,
    _: User = Depends(current_superuser),
    user_manager: UserManager = Depends(get_user_manager),
):
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}")

    existing = await User.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    temp_password = secrets.token_urlsafe(20)

    user_create = UserCreate(
        email=body.email,
        username=body.username,
        password=temp_password,
        is_superuser=body.is_superuser,
    )

    try:
        created = await user_manager.create(user_create, safe=False)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Apply the chosen plan (default from UserCreate is "free")
    if body.plan != "free":
        await created.set({"plan": body.plan})

    return {"id": str(created.id), "email": created.email, "username": created.username}


VALID_PLANS = {"free", "pro"}


class AdminEditUserBody(BaseModel):
    plan: str
    is_superuser: bool


@router.patch("/users/{user_id}")
async def edit_user(
    user_id: str,
    body: AdminEditUserBody,
    acting: User = Depends(current_superuser),
):
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}")

    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent an admin from removing their own superuser status
    if str(acting.id) == user_id and not body.is_superuser:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role.")

    await user.set({"plan": body.plan, "is_superuser": body.is_superuser})
    return {"id": user_id, "plan": user.plan, "is_superuser": user.is_superuser}


class AdminUpdatePlanBody(BaseModel):
    plan: str


@router.patch("/users/{user_id}/plan")
async def update_user_plan(
    user_id: str,
    body: AdminUpdatePlanBody,
    _: User = Depends(current_superuser),
):
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of: {', '.join(VALID_PLANS)}")

    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await user.set({"plan": body.plan})
    return {"id": user_id, "plan": user.plan}


@router.post("/users/{user_id}/resend-verification")
async def resend_verification(
    user_id: str,
    _: User = Depends(current_superuser),
    user_manager: UserManager = Depends(get_user_manager),
):
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified.")

    await user_manager.request_verify(user)
    return {"sent": True}
