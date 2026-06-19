"""arq WorkerSettings — run with: arq app.workers.settings.WorkerSettings"""

from arq.connections import RedisSettings

from ..utils.config import settings
from .tasks import send_verification_email, send_password_reset_email


class WorkerSettings:
    functions = [send_verification_email, send_password_reset_email]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 30
    keep_result = 300
