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
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings(BeanieBaseUser.Settings):
        name = "users"


class UserRead(schemas.BaseUser[PydanticObjectId]):
    username: str
    avatar: str
    plan: str


class UserCreate(schemas.BaseUserCreate):
    username: str


class UserUpdate(schemas.BaseUserUpdate):
    username: Optional[str] = None
    avatar: Optional[str] = None
