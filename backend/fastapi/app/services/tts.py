"""
Kokoro TTS service client.

Talks to the kokoro-tts sidecar container over HTTP.  Owns an in-memory LRU
audio cache keyed by (doc_id, page, para, voice) so repeated requests for the
same paragraph are instant.  Background prefetch is fired as asyncio tasks so
upcoming paragraphs are usually cached before the client asks for them.

Voice registry maps our branded names (Sophia, Adam) to Kokoro internal IDs.
Adding a new voice only requires an entry here — no sample audio files needed.
"""

import asyncio
import collections
from typing import Optional

import httpx

from ..utils.config import settings
from ..utils.logger import setup_logger

logger = setup_logger("nasoma.services.tts")

VOICE_REGISTRY: dict[str, dict] = {
    # ── American English · Female ──────────────────────────────────────────
    "sophia":   {"label": "Sophia",   "kokoro_id": "af_heart",    "icon": "🌸", "group": "American"},
    "luna":     {"label": "Luna",     "kokoro_id": "af_alloy",    "icon": "🌙", "group": "American"},
    "aria":     {"label": "Aria",     "kokoro_id": "af_aoede",    "icon": "🎵", "group": "American"},
    "bella":    {"label": "Bella",    "kokoro_id": "af_bella",    "icon": "🦋", "group": "American"},
    "zara":     {"label": "Zara",     "kokoro_id": "af_jessica",  "icon": "⚡", "group": "American"},
    "iris":     {"label": "Iris",     "kokoro_id": "af_kore",     "icon": "🌿", "group": "American"},
    "nina":     {"label": "Nina",     "kokoro_id": "af_nicole",   "icon": "🎀", "group": "American"},
    "nova":     {"label": "Nova",     "kokoro_id": "af_nova",     "icon": "🌟", "group": "American"},
    "river":    {"label": "River",    "kokoro_id": "af_river",    "icon": "🌊", "group": "American"},
    "sarah":    {"label": "Sarah",    "kokoro_id": "af_sarah",    "icon": "🌺", "group": "American"},
    "sky":      {"label": "Sky",      "kokoro_id": "af_sky",      "icon": "☁️",  "group": "American"},
    # ── American English · Male ────────────────────────────────────────────
    "oscar":    {"label": "Oscar",    "kokoro_id": "am_adam",     "icon": "🎙️", "group": "American"},
    "echo":     {"label": "Echo",     "kokoro_id": "am_echo",     "icon": "🌀", "group": "American"},
    "eli":      {"label": "Eli",      "kokoro_id": "am_eric",     "icon": "🔥", "group": "American"},
    "thor":     {"label": "Thor",     "kokoro_id": "am_fenrir",   "icon": "🌩️", "group": "American"},
    "liam":     {"label": "Liam",     "kokoro_id": "am_liam",     "icon": "🏔️", "group": "American"},
    "max":      {"label": "Max",      "kokoro_id": "am_michael",  "icon": "🎯", "group": "American"},
    "onyx":     {"label": "Onyx",     "kokoro_id": "am_onyx",     "icon": "💎", "group": "American"},
    "rex":      {"label": "Rex",      "kokoro_id": "am_puck",     "icon": "🦁", "group": "American"},
    # ── British English · Female ───────────────────────────────────────────
    "alice":    {"label": "Alice",    "kokoro_id": "bf_alice",    "icon": "🫖", "group": "British"},
    "emma":     {"label": "Emma",     "kokoro_id": "bf_emma",     "icon": "🌹", "group": "British"},
    "isabella": {"label": "Isabella", "kokoro_id": "bf_isabella", "icon": "👑", "group": "British"},
    "lily":     {"label": "Lily",     "kokoro_id": "bf_lily",     "icon": "🌷", "group": "British"},
    # ── British English · Male ─────────────────────────────────────────────
    "daniel":   {"label": "Daniel",   "kokoro_id": "bm_daniel",   "icon": "🎩", "group": "British"},
    "fable":    {"label": "Fable",    "kokoro_id": "bm_fable",    "icon": "📖", "group": "British"},
    "george":   {"label": "George",   "kokoro_id": "bm_george",   "icon": "🎭", "group": "British"},
    "lewis":    {"label": "Lewis",    "kokoro_id": "bm_lewis",    "icon": "🏆", "group": "British"},
}

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
        """Connect to the Kokoro sidecar, retrying until it is ready."""
        self._client = httpx.AsyncClient(
            base_url=settings.kokoro_url,
            timeout=httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0),
        )
        for attempt in range(6):
            try:
                resp = await self._client.get("/health")
                if resp.status_code == 200:
                    self._available = True
                    data = resp.json()
                    logger.info(
                        "Kokoro TTS connected at %s — status=%s",
                        settings.kokoro_url,
                        data.get("status"),
                    )
                    return
            except Exception as exc:
                logger.info("Kokoro not ready (attempt %d/6): %s", attempt + 1, exc)
            if attempt < 5:
                await asyncio.sleep(5)
        logger.warning("Kokoro TTS unreachable after retries. Falling back to browser Web Speech API.")
        self._available = False

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
        """Call the Kokoro sidecar and return WAV bytes, or None on failure."""
        if not self._available or not self._client:
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
