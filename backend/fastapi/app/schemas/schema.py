from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserSignIn(BaseModel):
    email: str
    password: str


class DocumentCreate(BaseModel):
    title: str
    content: str
    pdf_url: str | None = None