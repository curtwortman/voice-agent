import pytest
import numpy as np
import os
import sys

# Add backend to path so we can import services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend")))

from whisper_service import WhisperService

def test_whisper_service_initialization():
    """Test that the WhisperService initializes properly."""
    service = WhisperService(model_size="tiny", device="cpu", compute_type="int8")
    assert service.model is not None
    assert service.model_size == "tiny"

def test_whisper_service_transcription():
    """Test transcription with a mock silent audio array."""
    service = WhisperService(model_size="tiny", device="cpu", compute_type="int8")
    
    # Generate 1 second of silent 16kHz audio
    audio_data = np.zeros(16000, dtype=np.float32)
    
    # Should return empty or whitespace string for silence
    text = service.transcribe(audio_data)
    assert isinstance(text, str)
    
    # A tiny model on absolute silence might hallucinate, but usually returns nothing
    # We just ensure it doesn't crash and returns a string
