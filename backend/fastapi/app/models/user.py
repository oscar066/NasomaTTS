from datetime import datetime
from typing import Optional

from beanie import Document, PydanticObjectId
from fastapi_users.db import BeanieBaseUser
from fastapi_users import schemas
from pydantic import Field


class User(BeanieBaseUser, Document):
    username: str
    avatar: str = ""
    plan: str = "free"
    words_read: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    pref_voice: Optional[str] = None
    pref_speed: Optional[float] = None

    class Settings(BeanieBaseUser.Settings):
        name = "users"


class UserRead(schemas.BaseUser[PydanticObjectId]):
    username: str
    avatar: str
    plan: str
    pref_voice: Optional[str] = None
    pref_speed: Optional[float] = None


class UserCreate(schemas.BaseUserCreate):
    username: str


class UserUpdate(schemas.BaseUserUpdate):
    username: Optional[str] = None
    avatar: Optional[str] = None
    pref_voice: Optional[str] = None
    pref_speed: Optional[float] = None
