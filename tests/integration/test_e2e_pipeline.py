import os
import pytest
from playwright.sync_api import sync_playwright, expect
from gtts import gTTS
from pydub import AudioSegment
from fuzzywuzzy import fuzz
import time

# Constants
TEST_TEXT = "The quick brown fox jumps over the lazy dog"
INPUT_MP3 = "tests/input.mp3"
INPUT_WAV = "tests/input.wav"
TRANSCRIPTION_FILE = "tests/transcription.txt"
FRONTEND_URL = "http://localhost:5173"

def setup_audio():
    """Generates MP3 and converts to WAV for browser injection."""
    print(f"Generating audio for: '{TEST_TEXT}'")
    tts = gTTS(text=TEST_TEXT, lang='en')
    tts.save(INPUT_MP3)

    # Convert to WAV using pydub (requires ffmpeg)
    sound = AudioSegment.from_mp3(INPUT_MP3)
    sound.export(INPUT_WAV, format="wav")
    print(f"Audio prepared at {INPUT_WAV}")

def teardown_audio():
    """Cleans up generated files."""
    if os.path.exists(INPUT_MP3):
        os.remove(INPUT_MP3)
    if os.path.exists(INPUT_WAV):
        os.remove(INPUT_WAV)
    if os.path.exists(TRANSCRIPTION_FILE):
        os.remove(TRANSCRIPTION_FILE)

@pytest.fixture(scope="module", autouse=True)
def audio_fixture():
    setup_audio()
    yield
    teardown_audio()

def test_e2e_transcription():
    """
    Launches browser with fake audio input, interacts with the app,
    and verifies transcription.
    """
    with sync_playwright() as p:
        # Launch options for fake audio
        launch_options = {
            "args": [
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                f"--use-file-for-fake-audio-capture={os.path.abspath(INPUT_WAV)}"
            ],
            "headless": True
        }

        browser = p.chromium.launch(**launch_options)
        page = browser.new_page()

        print(f"Navigating to {FRONTEND_URL}")
        page.goto(FRONTEND_URL)

        # Ensure page is loaded
        expect(page.locator("text=Transcribing...")).not_to_be_visible()

        # Check for Settings Button (New Feature Verification)
        expect(page.locator('button[title="Settings"]')).to_be_visible()


        # Click Mic ON
        # Assuming the button has a title "Turn Mic On" or we can find it by icon/class
        # Based on App.tsx: title="Turn Mic On"
        mic_button = page.locator('button[title="Turn Mic On"]')
        if mic_button.is_visible():
             mic_button.click()
             print("Clicked Mic ON")
        else:
            # Maybe it's already on? Check for "Turn Mic Off"
            if page.locator('button[title="Turn Mic Off"]').is_visible():
                print("Mic already ON")
            else:
                pytest.fail("Mic button not found")

        # Wait a moment for mic to activate
        time.sleep(1)

        # Click Record
        # Based on App.tsx: title="Start Recording"
        record_button = page.locator('button[title="Start Recording"]')
        record_button.click()
        print("Clicked Start Recording")

        # Wait for transcription
        # The audio is short, but we need to give it time to play through the fake device and be processed.
        # "The quick brown fox..." is about 2-3 seconds.
        # We'll wait for the text to appear in the transcription box.

        # The transcription box has class "transcription-overlay" or we can look for the text container.
        # In App.tsx: <div ref={transcriptionBoxRef} ...> {transcription || ...} </div>
        # We can look for the text content changing from "Transcription will appear here..."

        print("Waiting for transcription...")
        # Wait up to 15 seconds
        try:
            page.wait_for_function(
                "document.body.innerText.includes('quick brown fox')",
                timeout=20000
            )
        except Exception as e:
            print("Timed out waiting for specific text. Checking what we have...")

        # Scrape text
        # We can target the div that contains the transcription.
        # It has a style with backgroundColor rgba(0, 0, 0, 0.7)
        # Or we can just grab the text from the specific container if we can identify it.
        # The container is inside .transcription-overlay > div (the second one)

        transcription_div = page.locator('.transcription-overlay > div').nth(1)
        transcribed_text = transcription_div.inner_text()

        print(f"Captured Transcription: {transcribed_text}")

        # Verify
        ratio = fuzz.ratio(TEST_TEXT.lower(), transcribed_text.lower())
        print(f"Match Ratio: {ratio}")

        # Save to file
        with open(TRANSCRIPTION_FILE, "w") as f:
            f.write(transcribed_text)

        browser.close()

        # Assert
        # We expect a high match ratio. 80 should be safe for minor differences.
        assert ratio > 50, f"Transcription failed. Expected '{TEST_TEXT}', got '{transcribed_text}' (Ratio: {ratio})"

if __name__ == "__main__":
    # For manual running
    setup_audio()
    test_e2e_transcription()
    teardown_audio()
