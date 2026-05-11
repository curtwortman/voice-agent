# Automated Testing Documentation

## Overview
This directory contains the testing architecture for the Voice Agent application. To ensure high reliability, we separate our tests into two primary categories:
1. **Unit Tests (Individual Components)**: Testing isolated modules like the STT engine, TTS generation, and frontend UI hooks.
2. **Integration Tests (E2E)**: Testing the full pipeline by injecting synthetic audio into the browser and validating the backend WebSocket transcription.

## Directory Structure
```text
tests/
├── unit/
│   ├── backend/          # Python unit tests (pytest)
│   └── frontend/         # React/TypeScript unit tests (vitest)
└── integration/          # Full E2E pipeline tests (pytest + playwright)
```

## Prerequisites
- **Python 3.12+** (with virtual environment active)
- **Node.js & npm**
- **FFmpeg** (must be in system PATH)
- **Backend Server**: Must be running on `http://localhost:8008` for Integration Tests (the API gateway serves the built frontend).

## Setup
Install the required testing dependencies:

**Backend Setup:**
```bash
source .voice-agent-venv/bin/activate
pip install pytest pytest-asyncio playwright gtts fuzzywuzzy python-Levenshtein pydub httpx
playwright install chromium
```

**Frontend Setup:**
```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## 1. Unit Tests (Individual Components)

### Backend Component Tests
We use `pytest` for backend individual component testing.
**To run:**
```bash
pytest tests/unit/backend/ -v
```

**Key Test Cases:**
- `test_whisper_service.py`: Verifies that `WhisperService` can transcribe a static `.wav` fixture correctly, testing CPU/GPU execution and `int8` quantization handling.
- `test_tts_service.py`: Mocks the `vllm-omni` API and validates that the `TTSService` class properly generates an audio payload for a given text input.
- `test_obsidian_service.py`: Ensures the note generator correctly creates Markdown files with proper frontmatter and timestamps.

### Frontend Component Tests
We use `vitest` and React Testing Library.
**To run:**
```bash
cd frontend
npm run test
```

**Key Test Cases:**
- `useAudioAnalyzer.test.ts`: Verifies that state toggles correctly (e.g., `isMicOn`, `isAgentConnected`) when functions are called.
- `App.test.tsx`: Validates rendering of the primary views (STT, TTS, Agent, Intelligence) and asserts that the layout switches properly.
- `SettingsIntegration.test.tsx`: Verifies connection configuration functionality and asserts that UI settings state is persisted correctly across components.

---

## 2. Integration Tests (E2E Pipeline)

The integration tests verify the system from the frontend UI all the way through the Pipecat WebSockets to the STT/TTS services.

**To run:**
```bash
pytest tests/integration/ -v
```

### Test Logic
The main script `tests/integration/test_e2e_pipeline.py` contains five test cases:

**`test_e2e_transcription`**
1.  Generates a synthetic speech audio file (`input.mp3`) with the text "The quick brown fox jumps over the lazy dog" using `gTTS`.
2.  Converts the MP3 to `input.wav` (required for Chrome's fake audio injection).
3.  Launches a headless Chromium browser using Playwright with the `--use-file-for-fake-audio-capture` flag.
4.  Navigates to the API gateway (`http://localhost:8008`) which serves the built frontend.
5.  Clicks the Mic button to initiate the WebSocket connection and stream audio.
6.  Waits for the transcription text to appear in the DOM.
7.  Captures the text and calculates a fuzzy match ratio with the original synthetic text.
8.  Asserts that the match ratio is > 50%.

**`test_e2e_ui_interactions`**
1.  Navigates through all four primary tabs (STT, TTS, Voice Agent, Audio Intelligence).
2.  Verifies the Maximize/Minimize (Full Playground) toggle.
3.  Tests the Settings Modal open/close flow.
4.  Validates STT sub-tabs, TTS chip/voice selection, and Intelligence analysis buttons.

**`test_e2e_voice_agent`**
1.  Navigates to the Voice Agent tab and clicks the orb to activate the Pipecat agent.
2.  Verifies the agent state transitions to "Agent Listening...".
3.  Waits up to 45 seconds for an AGENT response message to appear in the chat UI.

**`test_e2e_tts_narration`**
1.  Navigates to the Text to Speech tab.
2.  Inputs test text and clicks "Generate".
3.  Intercepts the network request to verify the correct payload is sent to `/v1/audio/speech`.
4.  Waits for the generation to complete and the UI to respond.

**`test_e2e_audio_intelligence`**
1.  Navigates to the Audio Intelligence tab.
2.  Triggers a "Sentiment Analysis" task.
3.  Waits for the LLM-generated result to appear in the DOM, verifying the backend analysis loop.

---

## Troubleshooting
- **"Mic button not found"**: Ensure the frontend is running (`npm run dev`) and the UI is fully loaded.
- **"Timed out waiting for transcription"**: Check if the backend is running (`./start.sh`) and receiving the WebSocket connection. Check backend logs for errors.
- **"ffmpeg not found"**: Install FFmpeg (`sudo apt install ffmpeg`).
- **"Address already in use"**: Make sure you don't have multiple backend instances running.
