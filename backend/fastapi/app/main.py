from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .auth.setup import auth_backend, fastapi_users
from .models.user import UserCreate, UserRead, UserUpdate
from .utils.cache import close_cache, connect_cache
from .utils.config import settings
from .db.database import close_db, connect_db
from .routes import documents_router, pdf_router, speak_router, voices_router
from .services.tts import tts_service
from .utils.logger import setup_logger

logger = setup_logger("nasoma.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up NasomaTTS API")
    await connect_db()
    await connect_cache(settings.redis_url)
    await tts_service.load()
    logger.info("Startup complete")
    yield
    logger.info("Shutting down NasomaTTS API")
    await close_db()
    await close_cache()


app = FastAPI(
    title="NasomaTTS API",
    version="2.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

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


# ── FastAPI Users routers
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# ── App routers
app.include_router(documents_router.router)
app.include_router(pdf_router.router)
app.include_router(voices_router.router)
app.include_router(speak_router.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "tts_available": tts_service.available}
