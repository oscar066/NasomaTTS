from contextlib import asynccontextmanager

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .utils.cache import close_cache, connect_cache
from .utils.config import settings
from .utils.rate_limit import limiter
from .db.database import close_db, connect_db
from .routes import admin_router, auth_router, documents_router, pdf_router, speak_router, voices_router
from .services.tts import tts_service
from .utils.logger import setup_logger
from .workers import pool as worker_pool

logger = setup_logger("nasoma.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up NasomaTTS API")
    await connect_db()
    await connect_cache(settings.redis_url)
    await tts_service.load()
    arq_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    worker_pool.set_pool(arq_pool)
    logger.info("Startup complete")
    yield
    logger.info("Shutting down NasomaTTS API")
    await close_db()
    await close_cache()
    await arq_pool.close()


app = FastAPI(
    title="NasomaTTS API",
    version="2.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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

# Routers
app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(documents_router.router)
app.include_router(pdf_router.router)
app.include_router(voices_router.router)
app.include_router(speak_router.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "tts_available": tts_service.available}
