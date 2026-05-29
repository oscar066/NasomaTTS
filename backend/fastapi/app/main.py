"""
NasomaTTS API — application entry point.

This module creates the FastAPI application, registers middleware, mounts all
routers, and wires up the startup/shutdown lifecycle via the ``lifespan``
context manager.

Server startup order:
  1. MongoDB connection pool is opened.
  2. NeuTTS model is loaded (or skipped gracefully if unavailable).
  3. The application begins serving requests.

Shutdown order:
  1. In-flight requests are allowed to complete.
  2. MongoDB connection pool is closed.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .db.database import close_db, connect_db
from .routes import auth_router, documents_router, pdf_router, speak_router, voices_router
from .services.tts import tts_service
from .utils.logger import setup_logger

logger = setup_logger("nasoma.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application-level resources across the server lifetime.

    FastAPI calls the code before ``yield`` on startup and the code after
    ``yield`` on shutdown, ensuring resources are always released cleanly even
    if the server is interrupted.
    """
    logger.info("Starting up NasomaTTS API")
    await connect_db()
    await tts_service.load()
    logger.info("Startup complete")
    yield
    logger.info("Shutting down NasomaTTS API")
    await close_db()


app = FastAPI(
    title="NasomaTTS API",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every HTTP request with its method, path, and response status code."""
    response = await call_next(request)
    logger.info("%s %s %s", request.method, request.url.path, response.status_code)
    return response


# ── Routers
app.include_router(auth_router.router)
app.include_router(documents_router.router)
app.include_router(pdf_router.router)
app.include_router(voices_router.router)
app.include_router(speak_router.router)


@app.get("/health", tags=["health"])
async def health():
    """Health check endpoint.

    Returns the server status and whether the NeuTTS engine is loaded.  Used
    by load balancers and monitoring tools to verify the service is ready.
    """
    return {"status": "ok", "tts_available": tts_service.available}
