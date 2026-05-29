"""
Application configuration.

Settings are loaded from environment variables or the .env file located one
directory above this package (i.e. backend/fastapi/.env).  Pydantic-settings
handles parsing, type coercion, and validation automatically.
"""

from pathlib import Path

from pydantic_settings import BaseSettings

# Resolve the .env file relative to this file so the app works regardless of
# the current working directory when the server is started.
_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    """Central configuration for NasomaTTS.

    All fields can be overridden by environment variables with the same name
    (case-insensitive).  Sensitive values such as secrets and credentials
    should always be set via environment variables in production — never
    committed to source control.
    """

    # ── MongoDB ───────────────────────────────────────────────────────────────
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "nasoma"

    # ── JWT authentication ────────────────────────────────────────────────────
    jwt_secret: str = "change-me"          # Must be overridden in production.
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24             # Token lifetime in hours.

    # ── MinIO object storage ──────────────────────────────────────────────────
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = "documents"        # Bucket where PDF binaries are stored.

    class Config:
        env_file = str(_ENV_FILE)


# Module-level singleton — import this everywhere instead of instantiating
# Settings() multiple times.
settings = Settings()
