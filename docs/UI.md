# UI Capabilities & Design System

This document outlines the features and layout of the Voice Agent web interface, which features a dual-mode design: a **Minimized Slidebox** for focused interaction and a **Full-Screen Playground** for technical debugging and persona optimization.

## 1. Minimized Slidebox View
The default view designed for casual usage and standard workflows.

### Speech to Text (STT)
- **Nova: Transcription**: High-accuracy real-time transcription from microphone or file upload.
- **Action Footer**: Quick-access "Copy" and "Download" buttons for transcript management.
- **Auto-Sync**: Automatically saves transcripts to the configured Obsidian vault.

### Text to Speech (TTS)
- **Narration**: Generate high-quality voice audio from text.
- **Industry Filters**: Contextual chips (Finance, Healthcare, etc.) to organize voice profiles.
- **Voice Selection**: Choose from a library of cloned voices (Thalia, Odysseus, etc.).

### Voice Agent
- **Orb Interaction**: Central animated orb for initiating Pipecat sessions.
- **Natural Turn-taking**: Integrated Silero VAD for handling interruptions and pauses.

### Audio Intelligence
- **Analysis Tasks**: Trigger Summarization, Sentiment Analysis, and Intent Detection on current transcripts.
- **Live Progress**: Visual progress bars and "Analyzing..." state indicators.

---

## 2. Full-Screen Playground (Pipecat Superset)
An advanced environment inspired by the Pipecat Playground, designed for developer-level control and session analysis.

### Triple-Column Layout
1. **Pipeline Controls (Left)**:
   - **Feature Toggles**: Enable/Disable Smart Format, Punctuation, Ultra Low Latency, and Interruptions.
   - **Persona Gallery**: One-click buttons to instantly swap the agent's system prompt (e.g., "Socratic Tutor", "Tech Architect").

2. **Active Session (Center)**:
   - **Bot Avatar / Video Feed**: High-fidelity animated orb that pulses during active transport. If "Enable Video" is toggled, a split-screen view provides placeholders for local (user) and remote (bot) video streams.
   - **System Instruction Editor**: A live monospace editor for the `bot_prompt.txt` file.
   - **Visualizer**: Real-time waveform display for microphone and agent output.

3. **Runtime Inspector (Right)**:
   - **Context Inspector**: Real-time feed of the LLM message history (USER/ASSISTANT).
   - **Performance Metrics**: Live tracking of Latency (ms) and GPU VRAM usage.

---

## 3. Technical Integration
- **WebSockets**: Bi-directional streaming for both STT and Voice Agent modes.
- **Protobuf**: Binary serialization for efficient data transport in the Pipecat pipeline.
- **Vite/React**: Ultra-fast frontend rendering with Tailwind CSS styling.
