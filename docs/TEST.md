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
- **Backend Server**: Must be running on `http://localhost:8000` for Integration Tests.
- **Frontend Server**: Must be running on `http://localhost:5173` for Integration Tests.

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

---

## 2. Integration Tests (E2E Pipeline)

The integration tests verify the system from the frontend UI all the way through the Pipecat WebSockets to the STT/TTS services.

**To run:**
```bash
pytest tests/integration/ -v
```

### Test Logic
The main script `tests/integration/test_e2e_pipeline.py` performs the following steps:
1.  Generates a synthetic speech audio file (`fixtures/input.mp3`) with the text "The quick brown fox jumps over the lazy dog" using `gTTS`.
2.  Converts the MP3 to `input.wav` (required for Chrome's fake audio injection).
3.  Launches a headless Chromium browser using Playwright with the `--use-file-for-fake-audio-capture` flag.
4.  Navigates to the local frontend URL (`http://localhost:5173`).
5.  Interacts with the UI (clicks the Mic/Orb button to initiate the WebSocket connection).
6.  Waits for the transcription or agent response to appear in the DOM.
7.  Captures the text and calculates a fuzzy match ratio with the original synthetic text.
8.  Asserts that the match ratio is > 80%.

---

## Troubleshooting
- **"Mic button not found"**: Ensure the frontend is running (`npm run dev`) and the UI is fully loaded.
- **"Timed out waiting for transcription"**: Check if the backend is running (`./start.sh`) and receiving the WebSocket connection. Check backend logs for errors.
- **"ffmpeg not found"**: Install FFmpeg (`sudo apt install ffmpeg`).
- **"Address already in use"**: Make sure you don't have multiple backend instances running.
