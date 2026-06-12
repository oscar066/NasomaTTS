from unittest.mock import patch


def test_voices_tts_available(client):
    voices = [{"id": "dave", "label": "Dave"}]
    with (
        patch("app.routes.voices_router.tts_service.available", True),
        patch("app.routes.voices_router.tts_service.list_voices", return_value=voices),
    ):
        response = client.get("/voices")

    assert response.status_code == 200
    data = response.json()
    assert data["tts_available"] is True
    assert data["voices"] == voices


def test_voices_tts_unavailable(client):
    with (
        patch("app.routes.voices_router.tts_service.available", False),
        patch("app.routes.voices_router.tts_service.list_voices", return_value=[]),
    ):
        response = client.get("/voices")

    assert response.status_code == 200
    data = response.json()
    assert data["tts_available"] is False
    assert data["voices"] == []
