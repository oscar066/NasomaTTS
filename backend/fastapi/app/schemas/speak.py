from pydantic import BaseModel


class SpeakRequest(BaseModel):
    text: str
    voice: str = "dave"
    wpm: int = 150
