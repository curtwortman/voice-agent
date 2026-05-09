# 🎙️ Voice Agent

A high-performance, containerized voice service providing **OpenAI-compatible Text-to-Speech (TTS)** with custom voice cloning and **Real-time Speech-to-Text (STT)** with Obsidian integration. Optimized for both **AMD ROCm (RDNA3)** and **NVIDIA CUDA** hardware.

---

## 🚀 Features

- **🎯 OpenAI API Compatible** - Drop-in replacement for `POST /v1/audio/speech`. Works with any standard OpenAI client.
- **🎙️ Advanced Voice Cloning** - Create and reuse custom voice profiles using the `clone:ProfileName` convention.
- **⚡ Real-Time Streaming** - Low-latency token-by-token PCM streaming for conversational AI.
- **📝 Obsidian Integration** - Automatic meeting transcription with LLM-based post-processing (summaries, action items, and knowledge graph links).
- **🔴 Dual-GPU Optimized** - Native support for AMD Radeon (ROCm) and NVIDIA (CUDA) with hardware-specific tuning.
- **📊 Multi-Format Support** - Export to MP3, Opus, AAC, FLAC, WAV, or raw PCM.
- **🖥️ Web Interface** - Interactive frontend with audio visualization and recording controls.

---

## 🏗️ Architecture

The system operates as a dual-container stack:

1.  **`vllm-omni`**: Serves the `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` model using vLLM, optimized for GPU inference.
2.  **`api-gateway`**: A FastAPI service that orchestrates STT (Faster-Whisper), proxies TTS requests, manages the Voice Library, and triggers Obsidian workflows.

---

## 🛠️ Quickstart

### 1. Prerequisites
- **OS**: Ubuntu 22.04 / 24.04
- **Drivers**: ROCm 6.1+ (AMD) or CUDA 12.2+ (NVIDIA)
- **Tools**: Docker, Node.js (for frontend build)

### 2. Setup
Run the setup script to install dependencies, build the frontend, and generate your `.env` file:
```bash
./setup.sh
```

### 3. Build & Launch
Build both GPU stacks (or specify `rocm`/`nvidia`):
```bash
./build.sh all
```

Start your preferred stack:
```bash
# For AMD Radeon
docker compose -f docker-compose.rocm.yml up -d

# For NVIDIA
docker compose -f docker-compose.nvidia.yml up -d
```

---

## 🖥️ Web Interface

Once the containers are running, access the premium Command Center at:
👉 **[http://localhost:8000](http://localhost:8000)**

### ✨ Interface Features
- **Real-time Visualizer**: Circular waveform (output) and frequency bars (mic input).
- **TTS Playground**: Type text, select voices (including your clones), and generate speech instantly.
- **Voice Studio**: Upload reference audio to create new voice profiles on the fly.
- **Meeting Log**: Monospace transcription panel with auto-scroll and Obsidian hooks.

### 🛠️ Frontend Development (Review Mode)
If you want to review the frontend with hot-reload or without rebuilding the full Docker stack:

1.  **Start the Backend**: Ensure the API gateway is running (native or docker).
2.  **Launch Dev Server**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
3.  **Open Browser**: Visit `http://localhost:5173`. 
    *Note: The dev server will proxy API requests to `http://localhost:8000` based on your `.env` configuration.*

---

## 📖 Documentation

- [**API Reference**](docs/API.md) - Details on OpenAI-compatible endpoints and discovery.
- [**Voice Cloning Guide**](docs/VOICE_CLONING.md) - How to create, save, and use custom voice profiles.
- [**Hardware Optimization**](docs/HARDWARE_OPTIMIZATION.md) - AMD and NVIDIA specific tuning details.
- [**Obsidian Integration**](docs/OBSIDIAN_INTEGRATION.md) - Configuring the meeting transcription pipeline.
- [**Product Requirements (PRD)**](docs/PRD.md) - Project goals and technical constraints.

---

## ⚙️ Configuration (.env)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `API_PORT` | `8000` | Gateway API port |
| `VLLM_API_URL` | `http://localhost:8001/v1` | Internal model server URL |
| `VOICE_LIBRARY_DIR` | `./voice_library` | Path to stored voice profiles |
| `LLM_API_BASE` | `http://localhost:11434/v1` | LLM endpoint for Obsidian summaries |
| `HSA_OVERRIDE_GFX_VERSION` | `11.0.0` | AMD GFX version (RDNA3 default) |

---

## 🤝 Acknowledgments

Inspired by the [Qwen3-TTS-Openai-Fastapi](https://github.com/groxaxo/Qwen3-TTS-Openai-Fastapi) project for production-grade TTS patterns.
