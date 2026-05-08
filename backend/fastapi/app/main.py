from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import close_db, connect_db
from .routes import auth, documents, pdf, speak, voices
from .services.tts import tts_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await tts_service.load()
    yield
    await close_db()


app = FastAPI(title="NasomaTTS API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(pdf.router)
app.include_router(voices.router)
app.include_router(speak.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "tts_available": tts_service.available}
