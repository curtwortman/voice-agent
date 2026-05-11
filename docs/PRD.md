# Product Requirements Document (PRD)

## 1. Project Overview
> **Status:** Active
> **Objective:** Create a dual-purpose Voice Agent service featuring text-to-speech (TTS) voice cloning, high-accuracy speech-to-text (STT) transcription, and a real-time conversational AI loop. The system acts as a backend service powering both offline dictation/narration and a low-latency web/desktop AI assistant interface.

## 2. Target Audience & Use Cases
- **Primary User:** Local deployment on Linux Desktop (Ubuntu 22.04) or self-hosted environments.
- **Use Case 1 (Conversational Agent):** Low-latency, multi-turn voice interactions for an AI assistant.
- **Use Case 2 (Meeting Notes/Dictation):** High-accuracy offline dictation and transcription. Automatically processing meeting recordings into Obsidian-compliant Markdown files with LLM-generated summaries and graph links.
- **Use Case 3 (Narration):** High-quality TTS and voice cloning using the user's voice for custom content generation.
- **Use Case 4 (Audio Intelligence):** Analyze transcripts and calls to extract summaries, sentiment, and intent.

### Use Case 1: Conversational Voice Agent
**Goal:** Engage in low-latency, multi-turn, natural voice interactions with an AI assistant.
**Workflow:**
1. The user opens the web application and navigates to the **Voice Agent** tab in the slidebox UI.
2. The user clicks the central animated orb ("Click here to talk to me") to initiate a session.
3. The orb state changes to "Agent Listening...", indicating the WebSocket (`/ws/agent`) is actively streaming audio.
4. The user speaks naturally. If the user pauses or interrupts the AI, the underlying Pipecat pipeline (with Silero VAD) automatically handles turn-taking.
**Expected Outcome:** The agent responds with high-quality, cloned text-to-speech audio with extremely low latency, creating a seamless conversational experience. The conversation history is also displayed in the UI and automatically saved to the Obsidian vault upon disconnection.

### Use Case 2: Dictation and Meeting Transcription
**Goal:** Dictate notes or transcribe meetings with high accuracy for offline record-keeping.
**Workflow:**
1. The user navigates to the **Speech to Text** tab and selects the "Nova: Transcription" sub-view.
2. The user either clicks the large "Mic On" button to begin dictating or clicks "Use Your Own File" to upload an existing meeting recording (`.mp3` or `.wav`).
3. For live dictation, the audio is continuously streamed to the backend (`/ws/transcribe`) and transcribed in real-time. For file uploads, the file is processed in chunks.
4. The transcribed text appears in the large text area, formatted dynamically based on language detection.
**Expected Outcome:** A highly accurate text transcription is generated. The user can easily copy or download the text using the provided footer action buttons, or rely on the backend to automatically parse the transcript into an Obsidian-compliant Markdown note with LLM-generated summaries and tags.

### Use Case 3: Text-to-Speech Narration and Voice Cloning
**Goal:** Generate high-quality voice audio from text using custom voice profiles for narration.
**Workflow:**
1. The user navigates to the **Text to Speech** tab.
2. The user types or pastes their desired script into the input text area.
3. The user selects a specific industry context (e.g., Finance, Healthcare) using the filter chips, and selects a desired Voice Profile (e.g., Thalia, Odysseus) from the list.
4. The user clicks the "Generate" button, triggering an API call to the backend (`/v1/audio/speech`).
**Expected Outcome:** The system generates an MP3 audio file using the selected voice profile and automatically plays it back in the browser.

### Use Case 4: Audio Intelligence and Analysis
**Goal:** Analyze existing transcripts or calls to extract actionable insights such as sentiment or intents.
**Workflow:**
1. The user navigates to the **Audio Intelligence** tab.
2. An existing recording or transcript is loaded into the active context.
3. The user clicks an analysis action button: "Summarization", "Sentiment Analysis", or "Intent Detection".
4. The frontend queries the backend LLM service with the transcript context and the selected analysis prompt.
**Expected Outcome:** The UI displays a structured, color-coded output (e.g., a green summary note) highlighting the extracted insights alongside the original transcript.

## 3. Comprehensive Feature List

### 3.1 Frontend Features (React / Web Interface)
- **Dual-View UI Architecture:**
  - **Minimized Mode:** A focused, high-fidelity modal interface designed to sit unobtrusively on the screen or mobile viewport (iOS standalone PWA supported).
  - **Playground Mode:** A full-screen, three-column developer layout for extensive interactions, debugging, and settings management.
- **Audio Visualizer (`AudioVisualizer.tsx` / `Visualizer.tsx`):**
  - Real-time frequency analysis rendering an animated waveform/orb to indicate recording state and volume levels.
- **Microphone & Streaming Control (`AudioRecorder.tsx` & `useAudioAnalyzer.ts`):**
  - Granular control over microphone permissions and device selection.
  - *Planned:* `AudioWorklet`-based raw PCM audio capture for ultra-low latency Pipecat streaming.
  - Legacy `.webm` `MediaRecorder` chunking for high-accuracy offline dictation.
- **Settings & Profile Management (`SettingsModal.tsx`):**
  - UI for managing voice profiles, connecting to custom backend endpoints, and modifying system prompts or TTS voice selections.
- **PWA & Mobile Optimization:**
  - Standardized CSS (`env(safe-area-inset)`) and `manifest.json` for edge-to-edge iOS Home Screen standalone app deployment.

### 3.2 Backend Features (FastAPI + Local Models)
- **Real-Time Voice Agent (Pipecat Framework):**
  - Low-latency WebSocket ingest (`/ws/agent`) accepting raw PCM audio.
  - Integrated `SileroVADAnalyzer` for Voice Activity Detection to handle user interruptions naturally.
  - Local Pipecat wrappers bridging inference directly to Faster-Whisper and local TTS.
- **High-Accuracy Speech-to-Text (STT):**
  - Faster-Whisper integration capable of transcribing continuous audio via WebSocket (`/ws/transcribe`) using `ffmpeg` chunk processing.
- **Text-to-Speech (TTS) & Voice Cloning:**
  - OpenAI-compatible TTS endpoints (`/v1/audio/speech`).
  - Voice Profile Library (`/v1/voices/clone`) allowing users to upload a reference audio file to instantly create a cloned voice profile.
  - Model support for `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` served via vLLM-Omni for real-time audio generation.
- **Obsidian Vault Integration:**
  - Autonomous post-processing of transcripts and conversation logs.
  - LLM-powered generation of structured Markdown notes including Action Items, Tags, Summaries, and `[[wikilinks]]`.
  - Automatic saving of notes directly into a designated local Obsidian vault directory.
- **Robust Automated Testing:**
  - **Unit Tests:** React Testing Library and Vitest covering component renders, settings state, and button functionality.
  - **E2E Playwright:** Simulates real browser hardware injection (`--use-file-for-fake-audio-capture`), validating the full pipeline from physical audio to backend WebSocket Whisper STT.

### 3.3 Integration & Architecture
- **Hardware Acceleration:** Dual-GPU hardware compatibility (AMD ROCm `HSA_OVERRIDE_GFX_VERSION=11.0.0` and NVIDIA CUDA 12.2). Container profiles leverage `--trust-remote-code` and `--enforce-eager` to prevent vLLM OOM crashes.
- **Dockerized Microservices:**
  - `vllm-omni` (Port 8009): Dedicated container for heavy TTS/LLM tensor operations. Enforces a `--max-model-len 4096` to ensure extreme stability during continuous streaming.
  - `api-gateway` (Port 8008): FastAPI orchestration container managing websockets, Obsidian parsing, and state.
- **Centralized Environment Configuration (`.env`):**
  - Fully decentralized host and port assignments. 
  - Automated `start.sh` and `test.sh` lifecycle scripts that dynamically bind WebSockets and avoid port-in-use conflicts (via `ss` preflight checks).
- **WebSocket Routing Strategy:**
  - **`/ws/transcribe` (Offline/Dictation):** Receives chunked `.webm` audio. Transcodes and processes via Whisper. High accuracy, higher latency. Ideal for meeting recordings.
  - **`/ws/agent` (Conversational):** Receives raw PCM audio. Managed entirely by the Pipecat pipeline (VAD -> STT -> LLM Context -> TTS -> Transport). Ultra-low latency, multi-turn capable.
- **LLM Pipeline:** Requires an OpenAI-compatible endpoint (e.g., local Ollama instance on Port 11434) to provide the "brain" for conversational responses and Obsidian summarizations.

## 4. Future Considerations
- Complete frontend migration to the `AudioWorklet` raw PCM standard for Pipecat.
- Speaker diarization for multi-participant dictation and meeting transcripts.
- Packaging the web frontend into a standalone native Linux desktop orb application (via Tauri or Electron).
- Dynamic tag taxonomy and vault path configuration for the Obsidian integration.

## 5. Technical Highlights
- **VRAM Tuning**: Exposed `GPU_MEM_UTILIZATION` for fine-grained hardware control across NVIDIA/ROCM.
- **Custom Persona**: Externalized system prompt to `bot_prompt.txt` for easy agent customization without code changes.
- **WebSocket Transport**: Bi-directional audio streaming via `FastAPIWebsocketTransport` with Protobuf serialization.
- **Low-Latency VAD**: Silero VAD integration for natural, interruption-friendly conversational loops.
