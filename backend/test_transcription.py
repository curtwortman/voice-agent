import pytest
import os
from gtts import gTTS
from fastapi.testclient import TestClient
from websockets.sync.client import connect
import tempfile

# We need to connect to the running server, or start one.
# For this test, we'll assume the server is running on localhost:8000 as per the user state.
# Ideally, we would use TestClient with the app, but since it's a websocket and we want to test the full flow including potential network/server issues,
# and the user has the server running, we can try to connect to the running instance or use TestClient's websocket support if we import the app.

# However, importing 'app' from 'server' might be tricky if paths aren't set up right or if we want to avoid side effects.
# Let's try to use the running server first as it's an integration test.
# If that's not robust enough, we can switch to importing the app.

SERVER_URL = "ws://localhost:8000/ws/transcribe"

def generate_test_audio(text, filename):
    tts = gTTS(text=text, lang='en')
    tts.save(filename)

def test_transcription_flow():
    test_text = "Hello world, this is a test."

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
        audio_path = temp_audio.name

    try:
        # Generate Audio
        generate_test_audio(test_text, audio_path)

        # Connect to Websocket
        # Note: The server expects bytes.
        with open(audio_path, "rb") as f:
            audio_data = f.read()

        # Using websockets library to connect to the running server
        try:
            with connect(SERVER_URL) as websocket:
                websocket.send(audio_data)

                # The server sends back the text
                # We might need to wait a bit or receive multiple times if it streams,
                # but the current implementation seems to send it all at once after processing.
                # However, the server loop receives bytes, writes to file, and THEN transcribes.
                # It keeps doing this. It might not trigger transcription until it decides to?
                # Looking at server.py:
                # while True:
                #     data = await websocket.receive_bytes()
                #     ... write to file ...
                #     text = whisper_service.transcribe(session_file_path)
                #     await websocket.send_text(text)

                # So for every chunk of bytes it receives, it tries to transcribe the WHOLE file?
                # That seems inefficient but that's how it is written.
                # So if we send one big chunk, we should get one response.

                result = websocket.recv()
                print(f"Received: {result}")

                # Basic normalization for comparison
                assert "hello world" in result.lower()
                assert "this is a test" in result.lower()

        except ConnectionRefusedError:
            pytest.fail("Could not connect to server. Is it running on localhost:8000?")

    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
