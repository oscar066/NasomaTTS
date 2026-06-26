from unittest.mock import PropertyMock, patch

import pytest


@pytest.mark.asyncio
async def test_health_ok(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "tts_available" in data


@pytest.mark.asyncio
async def test_health_tts_unavailable(client):
    with patch("app.services.tts_service.KokoroService.available", new_callable=PropertyMock, return_value=False):
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["tts_available"] is False
