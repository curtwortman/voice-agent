# Product Requirements Document (PRD)

## 1. Project Overview
> **Status:** Active
> **Objective:** Create a dual-purpose Voice Agent service featuring text-to-speech (TTS) voice cloning (specifically using the user's own voice) and speech-to-text (STT) for transcript generation. This service will power both long-form narration and a real-time AI assistant orb.

## 2. Target Audience & Use Cases
- **Primary User:** Local deployment on Linux Desktop (Ubuntu 22.04).
- **Use Case 1 (Narration):** High-quality TTS voice cloning using the user's voice for offline narration and content generation.
- **Use Case 2 (AI Assistant Orb):** Low-latency voice interactions for a desktop AI assistant orb.
- **Use Case 3 (Transcription):** Generating accurate transcripts from audio inputs via STT.
- **Use Case 4 (Meeting Notes):** Automatically recording meetings and saving Obsidian-compliant transcripts with LLM-generated summaries, action items, and knowledge graph links.

## 3. Core Features
- **Text-to-Speech (TTS):** Voice cloning utilizing `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` via vLLM-Omni to replicate the user's voice.
- **Speech-to-Text (STT):** High-performance transcription via Faster-Whisper.
- **Obsidian Integration:** Automatic post-processing of meeting transcripts into Obsidian-compatible Markdown files with YAML frontmatter, `[[wikilinks]]` for graph connections, and LLM-generated summaries.
- **Integration/API:** A unified FastAPI backend running inside a Docker container, exposing both TTS and STT capabilities on a designated port.
- **Client Interfaces:**
  - A web-based HTML/JS interface with audio visualizer, recording controls, and live transcription.
  - A standalone Linux desktop application (Ubuntu 22.04 compatible) for the AI assistant orb (planned).

## 4. Technical Constraints & Architecture
- **Hardware:** Dual-GPU support:
  - AMD Radeon RX 9070 XT (ROCm, `HSA_OVERRIDE_GFX_VERSION=11.0.0`)
  - NVIDIA RTX 4080 (CUDA 12.2)
- **Backend Deployment:** Dockerized two-container architecture:
  - `vllm-omni`: Dedicated TTS model serving on port 8001.
  - `api-gateway`: FastAPI orchestration (STT, TTS proxy, Obsidian) on port 8000.
- **LLM Dependency:** An OpenAI-compatible LLM endpoint (defaulting to local Ollama) for meeting transcript summarization and entity extraction.
- **API Framework:** FastAPI with WebSocket support for real-time STT streaming.

## 5. Future Considerations
- Minimizing time-to-first-byte (TTFB) latency for the AI assistant orb to ensure conversational fluidity.
- Packaging the standalone Linux desktop app efficiently (e.g., via Tauri or Electron).
- Speaker diarization for multi-participant meeting transcripts.
- Configurable Obsidian vault path and tag taxonomy.
