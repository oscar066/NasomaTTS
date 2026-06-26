"""
Voice registry — maps branded voice IDs to Kokoro internal voice IDs.

Adding a new voice only requires a new entry here; no other file needs changing.
"""

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
