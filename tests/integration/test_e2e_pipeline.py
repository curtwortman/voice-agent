import os
import pytest
from playwright.sync_api import sync_playwright, expect
from gtts import gTTS
from pydub import AudioSegment
from fuzzywuzzy import fuzz
import time
import re

# Constants
TEST_TEXT = "The quick brown fox jumps over the lazy dog"
INPUT_MP3 = "tests/input.mp3"
INPUT_WAV = "tests/input.wav"
TRANSCRIPTION_FILE = "tests/transcription.txt"
FRONTEND_PORT = os.getenv("API_PORT", "8008")
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"
VAULT_DIR = "obsidian_vault"

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
    # Clear vault before tests
    if os.path.exists(VAULT_DIR):
        for f in os.listdir(VAULT_DIR):
            if f.endswith(".md"):
                os.remove(os.path.join(VAULT_DIR, f))
    else:
        os.makedirs(VAULT_DIR, exist_ok=True)
        
    yield
    teardown_audio()

def configure_backend_port(page):
    """Opens Settings Modal and sets the correct Backend Port dynamically."""
    print("Configuring Backend Port to match environment...")
    api_port = os.getenv("API_PORT", "8008")
    page.locator('button[title="Settings"]').click()
    expect(page.locator('h2:has-text("System Configuration")')).to_be_visible()
    page.fill('input#backend-port', api_port)
    page.locator('button:has-text("Apply Changes")').click()
    expect(page.locator('h2:has-text("System Configuration")')).not_to_be_visible()

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

        # Configure Port so WebSockets hit the right backend
        configure_backend_port(page)

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

        # No 'Start Recording' button anymore. Clicking 'Mic ON' automatically starts the agent stream.
        print("Audio stream started.")

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
            pytest.fail(f"Timed out waiting for transcription. The backend on port {os.getenv('API_PORT', '8008')} may be offline, or the WebSocket connection to /ws/transcribe failed.")

        # Scrape text
        # We can target the div that contains the transcription.
        # It is inside the new UI element .text-area-content
        transcription_div = page.locator('.text-area-content')
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
        assert ratio > 50, f"Transcription failed. Expected '{TEST_TEXT}', got '{transcribed_text}' (Ratio: {ratio})"
        
        # Verify Obsidian File Generation (Use Case 2)
        print("Verifying Obsidian note generation...")
        time.sleep(5) # Give backend time to process LLM and save file
        files = [f for f in os.listdir(VAULT_DIR) if f.endswith(".md")]
        assert len(files) > 0, "No Obsidian note was generated for the transcription session."
        print(f"Found Obsidian note: {files[0]}")

def test_e2e_ui_interactions():
    """
    Verifies that all primary UI buttons and views function correctly.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(FRONTEND_URL)

        # Ensure page is loaded
        expect(page.locator("text=Flux: Voice Agents")).to_be_visible()

        # 1. Navigation Tabs
        print("Testing Navigation...")
        page.locator('button[role="tab"]:has-text("Text to Speech")').click()
        expect(page.locator('textarea[placeholder*="Ready to hear it in action"]')).to_be_visible()

        page.locator('button[role="tab"]:has-text("Voice Agent")').click()
        expect(page.locator('text=Click here to')).to_be_visible()

        page.locator('button[role="tab"]:has-text("Audio Intelligence")').click()
        expect(page.locator('button.analysis-btn:has-text("Summarization")')).to_be_visible()

        page.locator('button[role="tab"]:has-text("Speech to Text")').click()
        expect(page.locator("text=Flux: Voice Agents")).to_be_visible()

        # 2. Full Playground (Maximize/Minimize)
        print("Testing Maximize/Minimize...")
        # Maximize button has title="Full Playground"
        page.locator('button[title="Full Playground"]').click()
        # Wait for "REQUEST" and "RESPONSE" panels to appear
        expect(page.locator('text=REQUEST')).to_be_visible()
        expect(page.locator('text=RESPONSE')).to_be_visible()
        
        # Minimize button (Activity icon) is in the top left, but let's just use the X in the top right.
        # Actually, the X in the top right has no title. The App.tsx line 299: <X size={20} color="var(--text-dim)" onClick={() => setIsMaximized(false)} />
        # I can just click the Activity icon which also closes it.
        # Let's add a locator for the nav > div > svg
        page.locator('.playground-grid').locator('..').locator('nav svg').last.click()
        expect(page.locator('text=REQUEST')).not_to_be_visible()

        # 3. Settings Modal
        print("Testing Settings Modal...")
        page.locator('button[title="Settings"]').click()
        expect(page.locator('h2:has-text("System Configuration")')).to_be_visible()
        # Click Apply Changes button in modal to close it
        page.locator('button:has-text("Apply Changes")').click()
        expect(page.locator('h2:has-text("System Configuration")')).not_to_be_visible()

        # 4. STT Sub-Views & Action Buttons
        print("Testing STT Sub-tabs & Action Buttons...")
        page.locator('button[role="tab"]:has-text("Speech to Text")').click()
        page.locator('div.sub-tab:has-text("Nova: Transcription")').click()
        
        # Verify "Use Your Own File" button
        upload_btn = page.locator('button.btn-outline:has-text("Use Your Own File")')
        expect(upload_btn).to_be_visible()
        upload_btn.click()

        # Verify "Copy" and "Download" buttons
        page.locator('div.footer-action:has-text("Copy")').click()
        page.locator('div.footer-action:has-text("Download")').click()

        # 5. TTS Actions & Filters
        print("Testing TTS Generate & Filters...")
        page.locator('button[role="tab"]:has-text("Text to Speech")').click()
        
        # Test Chip Selection
        finance_chip = page.locator('div.chip:has-text("Finance")')
        finance_chip.click()
        expect(finance_chip).to_have_class(re.compile(r"active"))

        # Test Voice Selection
        odysseus_voice = page.locator('div.voice-item:has-text("Odysseus")')
        odysseus_voice.click()
        expect(odysseus_voice).to_have_class(re.compile(r"active"))

        # Test Generate Button
        generate_btn = page.locator('button.btn-primary:has-text("Generate")')
        expect(generate_btn).to_be_visible()
        
        # 6. Intelligence Analysis Buttons
        print("Testing Intelligence Buttons...")
        page.locator('button[role="tab"]:has-text("Audio Intelligence")').click()
        sentiment_btn = page.locator('button.analysis-btn:has-text("Sentiment Analysis")')
        sentiment_btn.click()
        expect(sentiment_btn).to_have_class(re.compile(r"active"))

        browser.close()

def test_e2e_voice_agent():
    """
    Verifies the full Pipecat Voice Agent pipeline: 
    Fake Mic -> STT -> LLM -> TTS -> Agent UI Response.
    """
    with sync_playwright() as p:
        # Launch options for fake audio injection
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
        expect(page.locator("text=Flux: Voice Agents")).to_be_visible()

        # Configure Port so WebSockets hit the right backend
        configure_backend_port(page)

        # Navigate to Voice Agent tab
        print("Navigating to Voice Agent tab...")
        page.locator('button[role="tab"]:has-text("Voice Agent")').click()
        
        # Click the orb to activate the agent
        print("Activating Agent Orb...")
        orb_locator = page.locator('text=Click here to')
        orb_locator.click()

        # The state should change to "Agent Listening..."
        try:
            expect(page.locator('text=Agent Listening...')).to_be_visible(timeout=5000)
        except AssertionError:
            pytest.fail(f"Failed to connect to Voice Agent WebSocket on port {os.getenv('API_PORT', '8008')}. Ensure the backend is running and the port is correct.")

        print("Agent is listening. Fake audio is streaming to the backend...")

        # The backend processes the audio, transcribes it, runs the LLM, and responds.
        # We wait for a DOM element representing the AGENT's response.
        # In App.tsx: <span className="font-semibold text-xs opacity-50 block mb-1">AGENT</span>
        print("Waiting for AGENT response message from backend...")
        
        try:
            # We give the LLM up to 45 seconds to generate and stream the response back.
            agent_message_label = page.locator('span:has-text("AGENT")').first
            expect(agent_message_label).to_be_visible(timeout=45000)
            print("Successfully received AGENT response!")
            
            # Optionally grab the text of the message for logging
            # The structure is: <div><span>AGENT</span><span>The actual message...</span></div>
            # We can grab the parent div's inner text.
            response_text = agent_message_label.locator('..').inner_text()
            print(f"Agent Response: {response_text.replace('AGENT', '').strip()}")
            
            # Verify Obsidian File Generation (Use Case 1)
            # We need to disconnect first to trigger the obsidian save
            print("Disconnecting Agent to trigger Obsidian save...")
            orb_locator.click()
            time.sleep(5)
            files = [f for f in os.listdir(VAULT_DIR) if f.endswith(".md")]
            assert len(files) > 1, "No Obsidian note was generated for the agent session (expected 2 files total now)."
            print("Agent session saved to Obsidian.")
            
        except Exception as e:
            print(f"Timed out waiting for AGENT response. Backend/LLM might be slow or offline.")
            raise e

        finally:
            browser.close()

def test_e2e_tts_narration():
    """
    Verifies Use Case 3: TTS Narration.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(FRONTEND_URL)
        configure_backend_port(page)

        print("Testing TTS Narration...")
        page.locator('button[role="tab"]:has-text("Text to Speech")').click()
        
        test_msg = "Testing the text to speech narration system."
        page.fill('textarea[placeholder*="Ready to hear it in action"]', test_msg)
        
        # Intercept the fetch request to /v1/audio/speech
        with page.expect_request("**/v1/audio/speech") as first:
            page.locator('button.btn-primary:has-text("Generate")').click()
        
        request = first.value
        assert request.method == "POST"
        payload = request.post_data_json
        assert payload["input"] == test_msg
        
        # Wait for the button to be re-enabled (generation finished)
        expect(page.locator('button.btn-primary:has-text("Generate")')).to_be_enabled(timeout=30000)
        print("TTS Narration test passed.")
        browser.close()

def test_e2e_audio_intelligence():
    """
    Verifies Use Case 4: Audio Intelligence.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(FRONTEND_URL)
        configure_backend_port(page)

        print("Testing Audio Intelligence...")
        page.locator('button[role="tab"]:has-text("Audio Intelligence")').click()
        
        # Click "Sentiment Analysis"
        page.locator('button.analysis-btn:has-text("Sentiment Analysis")').click()
        
        # Wait for the result to appear (not "Click an analysis task..." and not "Analyzing...")
        # We'll wait for a text that looks like a sentiment result.
        # Since it's an LLM, we just check it's not the initial/loading text.
        try:
            page.wait_for_function(
                "() => !document.body.innerText.includes('Click an analysis task') && !document.body.innerText.includes('Analyzing...')",
                timeout=45000
            )
            print("Successfully received Intelligence analysis!")
        except Exception as e:
            pytest.fail("Timed out waiting for Audio Intelligence analysis results.")

        browser.close()

if __name__ == "__main__":
    # For manual running
    setup_audio()
    test_e2e_transcription()
    teardown_audio()
