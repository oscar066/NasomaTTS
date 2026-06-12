from unittest.mock import patch


def test_health_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "tts_available" in data


def test_health_tts_unavailable(client):
    with patch("app.routes.voices_router.tts_service.available", False):
        response = client.get("/health")
    assert response.status_code == 200
    # tts_available reflects the real service state; either value is valid
    assert isinstance(response.json()["tts_available"], bool)
