"""
Kokoro TTS service client.

Talks to the Kokoro endpoint over HTTP.  Owns an in-memory LRU audio cache
keyed by (doc_id, page, para, voice) so repeated requests for the same
paragraph are instant.  Background prefetch is fired as asyncio tasks so
upcoming paragraphs are usually cached before the client asks for them.
"""

import asyncio
import collections
from typing import Optional

import httpx

from ..utils.config import settings
from ..utils.logger import setup_logger
from .voices import VOICE_REGISTRY

logger = setup_logger("nasoma.services.tts")

_CACHE_MAX = 100  # Maximum number of synthesized paragraphs kept in memory.


class KokoroService:
    """HTTP client to the Kokoro TTS sidecar, with LRU paragraph cache."""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._cache: collections.OrderedDict[str, bytes] = collections.OrderedDict()
        self._available = False
        self._prefetch_tasks: set[asyncio.Task] = set()
        self._inflight: set[str] = set()  # Keys currently being synthesized

    async def load(self) -> None:
        """Create the HTTP client and do a single non-blocking probe.

        A failed probe does NOT prevent the API from starting — Modal containers
        are cold at boot and take longer than a quick ping allows.  Connectivity
        is re-checked lazily on the first synthesis request.
        """
        self._client = httpx.AsyncClient(
            base_url=settings.kokoro_url,
            timeout=httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0),
        )
        await self._probe()

    async def _probe(self) -> bool:
        """Single /health check. Updates _available in place and returns it."""
        try:
            resp = await self._client.get("/health")
            if resp.status_code == 200:
                if not self._available:
                    logger.info("Kokoro TTS connected at %s", settings.kokoro_url)
                self._available = True
                return True
        except Exception as exc:
            logger.info("Kokoro not reachable: %s", exc)
        self._available = False
        return False

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()

    @property
    def available(self) -> bool:
        return self._available

    def list_voices(self) -> list[dict]:
        return [
            {
                "id":    vid,
                "label": info["label"],
                "icon":  info.get("icon", ""),
                "group": info.get("group", ""),
            }
            for vid, info in VOICE_REGISTRY.items()
        ]

    # ── Cache helpers

    def _key(self, doc_id: str, page: int, para: int, voice: str) -> str:
        return f"{doc_id}:{page}:{para}:{voice}"

    def _cache_get(self, key: str) -> Optional[bytes]:
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def _cache_set(self, key: str, data: bytes) -> None:
        self._cache[key] = data
        self._cache.move_to_end(key)
        while len(self._cache) > _CACHE_MAX:
            self._cache.popitem(last=False)

    def is_cached(self, doc_id: str, page: int, para: int, voice: str) -> bool:
        return self._key(doc_id, page, para, voice) in self._cache

    # ── Synthesis

    async def synthesize(self, text: str, voice: str = "sophia") -> Optional[bytes]:
        """Call the Kokoro sidecar and return WAV bytes, or None on failure.

        If Kokoro was unreachable at startup (e.g. Modal cold start), a lazy
        probe is attempted here so the first playback request wakes the container.
        """
        if not self._client:
            return None
        if not self._available:
            # Modal serverless containers cold-start in 10-30s. Retry patiently
            # before giving up so the first request after a cold start succeeds.
            for attempt in range(4):
                if await self._probe():
                    break
                if attempt < 3:
                    await asyncio.sleep(10)
            if not self._available:
                return None
        kokoro_id = VOICE_REGISTRY.get(voice, {}).get("kokoro_id", "af_heart")
        try:
            resp = await self._client.post(
                "/v1/audio/speech",
                json={
                    "model": "kokoro",
                    "input": text,
                    "voice": kokoro_id,
                    "response_format": "wav",
                },
            )
            if resp.status_code == 200:
                return resp.content
            logger.error("Kokoro /v1/audio/speech returned %s: %s", resp.status_code, resp.text[:200])
            return None
        except Exception as exc:
            logger.error("Kokoro synthesis error: %s", exc)
            return None

    async def synthesize_paragraph(
        self,
        doc_id: str,
        page: int,
        para: int,
        text: str,
        voice: str = "sophia",
    ) -> Optional[bytes]:
        """Synthesize a paragraph, serving from cache when available."""
        key = self._key(doc_id, page, para, voice)
        hit = self._cache_get(key)
        if hit is not None:
            logger.debug("Cache hit: %s", key)
            return hit
        wav = await self.synthesize(text, voice)
        if wav:
            self._cache_set(key, wav)
        return wav

    # ── Background prefetch

    def schedule_prefetch(
        self,
        doc_id: str,
        upcoming: list[tuple[int, int, str]],  # [(page, para, text), ...]
        voice: str,
    ) -> None:
        """Fire-and-forget: synthesize upcoming paragraphs into the cache."""
        async def _run():
            for page, para, text in upcoming:
                key = self._key(doc_id, page, para, voice)
                if key in self._cache or key in self._inflight:
                    continue
                self._inflight.add(key)
                logger.debug("Prefetching %s", key)
                try:
                    await self.synthesize_paragraph(doc_id, page, para, text, voice)
                finally:
                    self._inflight.discard(key)

        task = asyncio.create_task(_run())
        self._prefetch_tasks.add(task)
        task.add_done_callback(self._prefetch_tasks.discard)


tts_service = KokoroService()
