import pytest
from unittest.mock import patch, MagicMock
import os
import sys

# Add backend to path so we can import services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend")))

os.environ["VOICE_LIBRARY_DIR"] = "/tmp/voice_library"

from tts_service import TTSService

@patch.dict(os.environ, {"VOICE_LIBRARY_DIR": "/tmp/voice_library"})
def test_tts_service_initialization():
    """Test TTSService initializes and loads API URL."""
    service = TTSService()
    assert service.api_url is not None

@patch.dict(os.environ, {"VOICE_LIBRARY_DIR": "/tmp/voice_library"})
@patch("httpx.Client.post")
def test_tts_service_generate_audio(mock_post):
    """Test that generate_audio sends correct payload."""
    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"mock_audio_data"
    mock_post.return_value = mock_response

    service = TTSService()
    success = service.generate_audio("Hello world", "output.mp3", "default", "mp3", 1.0)
    
    assert success is True
    # Ensure post was called with correct text
    assert mock_post.called
    kwargs = mock_post.call_args.kwargs
    assert "json" in kwargs
    assert kwargs["json"]["input"] == "Hello world"
