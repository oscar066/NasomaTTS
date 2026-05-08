# Sample Voice Files

NeuTTS Air uses voice cloning — each preset voice needs a short reference audio clip.

## Getting the default "Dave" sample

The NeuTTS Air repository ships sample audio you can use directly:

```bash
# From the backend/fastapi directory
curl -L -o samples/dave.wav \
  https://github.com/neuphonic/neutts-air/raw/main/samples/dave.wav

curl -L -o samples/dave.txt \
  https://github.com/neuphonic/neutts-air/raw/main/samples/dave.txt
```

## Adding your own voice

1. Record a clean mono WAV file (16–44 kHz, 3–15 seconds, minimal background noise).
2. Save it as `samples/<id>.wav` and write its transcript to `samples/<id>.txt`.
3. Register it in `app/services/tts.py` under `PRESET_VOICES`:

```python
PRESET_VOICES = {
    "dave": { ... },
    "your_voice": {
        "label": "Your Voice Label",
        "audio": SAMPLES_DIR / "your_voice.wav",
        "text":  SAMPLES_DIR / "your_voice.txt",
    },
}
```

The service reloads voices at startup — restart the container to pick up new voices.
