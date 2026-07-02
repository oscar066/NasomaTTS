"""arq WorkerSettings — run with: arq app.workers.settings.WorkerSettings"""

from arq.connections import RedisSettings

from ..utils.config import settings
from .tasks import (
    index_single_document,
    index_user_documents,
    send_password_reset_email,
    send_verification_email,
)


async def startup(ctx):
    from ..db.database import connect_db
    from ..ai.services.initializers import warm_up
    await connect_db()
    await warm_up()


async def shutdown(ctx):
    from ..db.database import close_db
    await close_db()


class WorkerSettings:
    functions = [
        send_verification_email,
        send_password_reset_email,
        index_single_document,
        index_user_documents,
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 300  # 5 min — indexing large books can take time
    keep_result = 300
