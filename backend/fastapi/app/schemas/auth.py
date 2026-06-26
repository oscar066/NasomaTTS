from pydantic import BaseModel


class GoogleAuthBody(BaseModel):
    id_token: str
