"""Admin request body schemas."""

from pydantic import BaseModel

VALID_PLANS = {"free", "pro"}


class AdminCreateUserBody(BaseModel):
    email: str
    username: str
    is_superuser: bool = False
    plan: str = "free"


class AdminEditUserBody(BaseModel):
    plan: str
    is_superuser: bool


class AdminUpdatePlanBody(BaseModel):
    plan: str
