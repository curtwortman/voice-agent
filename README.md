# Voice Agent

A fully offline, GPU-accelerated AI voice assistant that streams LLM responses in real time with speech input and output on AMD ROCm and NVIDIA hardware.

## Overview
This project provides a fully local, GPU-accelerated AI voice assistant running on AMD ROCm and NVIDIA hardware. It combines high-performance TTS with real-time speech-to-text, all without relying on cloud services.

The assistant uses `vllm-omni` for fast `Qwen3-TTS` inference, `Faster-Whisper` for speech-to-text transcription, `Pipecat` for real-time conversational flow, and a `React`-based UI for interaction. Responses are streamed for low latency, and audio playback is automatically generated.

The system runs entirely offline on Ubuntu 22.04 or 24.04 with ROCm 6.1+ or CUDA 12.2+ and supports modern AMD and NVIDIA GPUs. It is designed for private AI assistant use, on-device LLM experimentation, enterprise demos, and showcasing high-performance local inference.

Everything runs 100% locally on your GPU.

## Features
- **OpenAI API Compatible** - Drop-in replacement for `POST /v1/audio/speech`.
- **Voice Input** - Microphone → Whisper → Pipecat Agent → Qwen3-TTS.
- **Real-Time Streaming** - Low-latency token-by-token PCM streaming for conversational AI.
- **Voice Agent (Pipecat)** - Native integration with the Pipecat framework for ultra-low latency, VAD-driven conversational flows.
- **Obsidian Integration** - Automatic meeting transcription with LLM-based post-processing.
- **Dual-GPU Optimized** - Native support for AMD Radeon (ROCm) and NVIDIA (CUDA) with hardware-specific tuning.
- **Web Interface** - Interactive browser frontend with audio visualization and recording controls.

## Architecture
**Pipeline Flow:**

Microphone → Faster-Whisper (STT) → Pipecat Agent → Qwen3-TTS (vLLM) → Audio Playback

**Core Components**

The system operates as a dual-container stack:
1.  **`vllm-omni`**: Serves the `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` model using vLLM, optimized for GPU inference.
2.  **`api-gateway`**: A FastAPI service that orchestrates STT, proxies TTS requests, manages the Voice Library, triggers Obsidian workflows, and provides the Pipecat WebSocket endpoint.
3.  **Frontend**: A React application offering a "Minimized Modal" and "Full Playground" view.

## Configuration (.env)

The system is configured via a `.env` file generated during setup:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `API_PORT` | `8008` | Gateway API port |
| `VLLM_PORT` | `8009` | vLLM-Omni model server port |
| `GPU_MEM_UTILIZATION` | `0.3` | Fraction of GPU VRAM for vLLM (tune for your card) |
| `VLLM_API_URL` | `http://localhost:8009/v1` | Internal model server URL |
| `VOICE_LIBRARY_DIR` | `./voice_library` | Path to stored voice profiles |
| `LLM_API_BASE` | `http://localhost:11434/v1` | LLM endpoint for Obsidian summaries |
| `LLM_MODEL` | `llama3` | LLM model name for conversational and Obsidian tasks |
| `HSA_OVERRIDE_GFX_VERSION` | `11.0.0` | AMD GFX version (RDNA3 default, ROCm only) |

## Hardware & Platform
Tested on:

- AMD Radeon (ROCm 6.1+) and NVIDIA (CUDA 12.2+)
- Ubuntu 22.04 / 24.04
- Docker and Docker Compose
- Node.js (for frontend build)

Designed specifically for dual-hardware GPU acceleration.

## Advanced Voice Cloning
The agent is configured to support zero-shot voice cloning:
- Create and reuse custom voice profiles using the `clone:ProfileName` convention.
- Upload reference audio via the Voice Studio to create new voice profiles on the fly.
- Select your custom clones directly from the frontend UI.

---

### 1. **System preparation**
Run the setup script to install system dependencies, build the React frontend, and generate your `.env` file:
```bash
./setup.sh
```

### 2. **Build the containers**
Build both GPU stacks (or specify `rocm` or `nvidia`):
```bash
./build.sh all
```

### 3. **Start the backend**
Start the dual-container stack in the background using Docker Compose:
```bash
# NVIDIA CUDA
docker compose -f docker-compose.nvidia.yml up -d

# AMD Radeon (ROCm)
docker compose -f docker-compose.rocm.yml up -d
```
Starting the model for the first time will download the Qwen3-TTS and Faster-Whisper weights. This may take 5–10 minutes depending on your internet connection.

### 4. **Launch the Web Interface**
Once the containers are running and the model has loaded, access the premium Command Center at:

👉 **[http://localhost:8008](http://localhost:8008)**

You can also test the integration pipelines by running:
```bash
./test.sh
```

### Frontend Development (Review Mode)
If you want to review the frontend with hot-reload or without rebuilding the full Docker stack:

1.  **Start the Backend**: Ensure the API gateway is running via Docker.
2.  **Launch Dev Server**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
3.  **Open Browser**: Visit `http://localhost:5173`. 
    *Note: The dev server will proxy API requests to your configured `API_PORT`.*

---

## Additional Documentation

- [**API Reference**](docs/API.md) - Details on OpenAI-compatible endpoints and discovery.
- [**Voice Cloning Guide**](docs/VOICE_CLONING.md) - How to create, save, and use custom voice profiles.
- [**Hardware Optimization**](docs/HARDWARE_OPTIMIZATION.md) - AMD and NVIDIA specific tuning details.
- [**Obsidian Integration**](docs/OBSIDIAN_INTEGRATION.md) - Configuring the meeting transcription pipeline.
- [**Product Requirements (PRD)**](docs/PRD.md) - Project goals and technical constraints.
- [**Test Documentation**](docs/TEST.md) - Testing architecture including unit and E2E validation.
