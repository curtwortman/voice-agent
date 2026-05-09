import os
import pytest
import requests
from whisper_service import WhisperService

# URL of a sample audio file (short English speech)
# Using a reliable source like Wikimedia Commons or similar if possible,
# or a known test file. For this example, I'll use a placeholder or a very common sample if I can find one.
# Let's use a small file from a public repo or similar.
# A common test file is "jfk.wav" often used in speech examples.
SAMPLE_AUDIO_URL = "https://github.com/ggerganov/whisper.cpp/raw/master/samples/jfk.wav"
SAMPLE_AUDIO_FILENAME = "test_stt_sample.wav"

def download_audio(url, filename):
    if os.path.exists(filename):
        return True
    try:
        print(f"Downloading {url} to {filename}...")
        response = requests.get(url)
        response.raise_for_status()
        with open(filename, 'wb') as f:
            f.write(response.content)
        print("Download complete.")
        return True
    except Exception as e:
        print(f"Failed to download audio: {e}")
        return False

def test_stt_download_and_transcribe():
    # 1. Download Audio
    assert download_audio(SAMPLE_AUDIO_URL, SAMPLE_AUDIO_FILENAME), "Failed to download test audio file"

    # 2. Transcribe
    # Use 'base' or 'tiny' for faster testing
    service = WhisperService(model_size="base", device="cpu")
    text = service.transcribe(SAMPLE_AUDIO_FILENAME)

    print(f"Transcribed text: {text}")

    # 3. Assert
    # JFK sample usually contains "And so my fellow Americans..."
    assert text is not None
    assert len(text) > 0
    # Loose check for key phrases
    assert "fellow americans" in text.lower() or "ask not" in text.lower()

    # Cleanup (optional, maybe keep for inspection)
    # os.remove(SAMPLE_AUDIO_FILENAME)

if __name__ == "__main__":
    # Allow running directly
    test_stt_download_and_transcribe()
    print("Test passed!")
