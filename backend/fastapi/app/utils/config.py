"""
Application configuration.

Settings are loaded from environment variables.  Call to ``load_dotenv()``
at module load time ensures a local ``.env`` file is sourced automatically
during development; in production the variables are injected by Docker/the
host environment and ``load_dotenv()`` is a no-op.
"""

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    """Central configuration for NasomaTTS.

    All fields can be overridden by environment variables with the same name
    (case-insensitive).  Sensitive values such as secrets and credentials
    should always be set via environment variables in production — never
    committed to source control.
    """

    # ── MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "nasoma"

    # ── JWT authentication
    jwt_secret: str = "change-me"       # Must be overridden in production.
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24          # Token lifetime in hours.

    # ── Redis cache
    redis_url: str = "redis://localhost:6379"

    # ── MinIO object storage
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = "documents"     # Bucket where PDF binaries are stored.


# Module-level singleton — import this everywhere instead of instantiating
# Settings() multiple times.
settings = Settings()
