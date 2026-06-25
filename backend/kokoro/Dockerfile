FROM python:3.11-slim

WORKDIR /app

# espeak-ng is required by Kokoro's phonemizer for English text.
# libsndfile1 is required by soundfile for WAV encoding.
# curl is used by the Docker healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
    espeak-ng \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first to avoid pulling the much larger CUDA build
# (~300 MB vs ~2 GB).  Kokoro's own install will find torch already satisfied.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
