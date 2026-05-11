from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .db.database import close_db, connect_db
from .routes import auth, documents, pdf, speak, voices
from .services.tts import tts_service
from .utils.logger import setup_logger

logger = setup_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up NasomaTTS API")
    await connect_db()
    await tts_service.load()
    logger.info("Startup complete")
    yield
    logger.info("Shutting down NasomaTTS API")
    await close_db()


app = FastAPI(title="NasomaTTS API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    logger.info("%s %s %s", request.method, request.url.path, response.status_code)
    return response


app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(pdf.router)
app.include_router(voices.router)
app.include_router(speak.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "tts_available": tts_service.available}
