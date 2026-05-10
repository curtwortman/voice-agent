# Product Requirements Document (PRD)

## 1. Project Overview
> **Status:** Active
> **Objective:** Create a dual-purpose Voice Agent service featuring text-to-speech (TTS) voice cloning, high-accuracy speech-to-text (STT) transcription, and a real-time conversational AI loop. The system acts as a backend service powering both offline dictation/narration and a low-latency web/desktop AI assistant interface.

## 2. Target Audience & Use Cases
- **Primary User:** Local deployment on Linux Desktop (Ubuntu 22.04) or self-hosted environments.
- **Use Case 1 (Conversational Agent):** Low-latency, multi-turn voice interactions for an AI assistant.
- **Use Case 2 (Meeting Notes/Dictation):** High-accuracy offline dictation and transcription. Automatically processing meeting recordings into Obsidian-compliant Markdown files with LLM-generated summaries and graph links.
- **Use Case 3 (Narration):** High-quality TTS and voice cloning using the user's voice for custom content generation.

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

### 3.3 Integration & Architecture
- **Hardware Acceleration:** Dual-GPU hardware compatibility (AMD ROCm `HSA_OVERRIDE_GFX_VERSION=11.0.0` and NVIDIA CUDA 12.2).
- **Dockerized Microservices:**
  - `vllm-omni` (Port 8001): Dedicated container for heavy TTS/LLM tensor operations.
  - `api-gateway` (Port 8000): FastAPI orchestration container managing websockets, Obsidian parsing, and state.
- **WebSocket Routing Strategy:**
  - **`/ws/transcribe` (Offline/Dictation):** Receives chunked `.webm` audio. Transcodes and processes via Whisper. High accuracy, higher latency. Ideal for meeting recordings.
  - **`/ws/agent` (Conversational):** Receives raw PCM audio. Managed entirely by the Pipecat pipeline (VAD -> STT -> LLM Context -> TTS -> Transport). Ultra-low latency, multi-turn capable.
- **LLM Pipeline:** Requires an OpenAI-compatible endpoint (e.g., local Ollama instance on Port 11434) to provide the "brain" for conversational responses and Obsidian summarizations.

## 4. Future Considerations
- Complete frontend migration to the `AudioWorklet` raw PCM standard for Pipecat.
- Speaker diarization for multi-participant dictation and meeting transcripts.
- Packaging the web frontend into a standalone native Linux desktop orb application (via Tauri or Electron).
- Dynamic tag taxonomy and vault path configuration for the Obsidian integration.
