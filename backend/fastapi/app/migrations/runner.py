"""
Versioned migration runner for NasomaTTS.

How it works
────────────
Migration files live in this directory and must be named:

    NNNN_description.py    e.g.  0001_move_pages_to_collection.py

Each file must export:

    DESCRIPTION: str           — human-readable label stored in migration_history
    async def upgrade(db) -> None   — the migration logic; receives a Motor database

On every app startup the runner:
  1. Reads ``migration_history`` to find already-applied versions.
  2. Scans this directory for migration files, sorted by version prefix.
  3. Runs any unapplied migrations in order.
  4. Records each applied migration in ``migration_history``.

Idempotency guarantee
─────────────────────
Each migration is recorded by version string before returning.  If a migration
raises an exception it is NOT recorded, so the next startup will retry it.
Individual migrations should be written to tolerate re-runs (e.g. using
``upsert`` or catching duplicate-key errors on ``insert_many``).

Adding a new migration
──────────────────────
Create ``app/migrations/NNNN_your_description.py`` with::

    DESCRIPTION = "What this migration does"

    async def upgrade(db) -> None:
        ...  # use raw Motor `db` — no Beanie models here
"""

import importlib
import os
import re
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from ..utils.logger import setup_logger

logger = setup_logger("nasoma.migrations")

_MIGRATION_RE = re.compile(r"^(\d{4})_.*\.py$")


async def run_migrations(db: AsyncIOMotorDatabase) -> None:
    """Discover and apply all pending migrations."""
    history = db["migration_history"]

    applied: set[str] = {
        doc["version"]
        async for doc in history.find({}, {"version": 1, "_id": 0})
    }

    migrations_dir = os.path.dirname(__file__)
    pending = sorted(
        f for f in os.listdir(migrations_dir)
        if _MIGRATION_RE.match(f)
    )

    if not pending:
        return

    ran = 0
    for filename in pending:
        version = _MIGRATION_RE.match(filename).group(1)
        if version in applied:
            continue

        module_path = f"app.migrations.{filename[:-3]}"
        module = importlib.import_module(module_path)
        description = getattr(module, "DESCRIPTION", filename)

        logger.info("Applying migration %s: %s", version, description)
        try:
            await module.upgrade(db)
        except Exception as exc:
            logger.error("Migration %s FAILED: %s", version, exc)
            raise

        await history.insert_one({
            "version":     version,
            "description": description,
            "applied_at":  datetime.now(timezone.utc),
        })
        logger.info("Migration %s applied successfully", version)
        ran += 1

    if ran == 0:
        logger.debug("No pending migrations")
    else:
        logger.info("%d migration(s) applied", ran)
