# Audio Assistant Frontend - Build Documentation

This document provides a comprehensive guide and a set of prompts for an AI agent to recreate the Audio Assistant frontend from scratch.

## 1. Overview

### Objective
The goal is to build a modern, responsive, and visually engaging frontend for the Audio Assistant application. This interface will allow users to record audio, visualize it in real-time, and view live transcriptions streamed from a backend service.

### Background
The Audio Assistant is a full-stack application designed to demonstrate real-time audio processing capabilities. The backend (Python/FastAPI) handles audio decoding and transcription using Whisper. The frontend (React/Vite) acts as the client, capturing microphone input, streaming it via WebSockets, and rendering the results. The design prioritizes a clean, futuristic aesthetic with a focus on visual feedback.

### Success Criteria
1.  **Visual Fidelity**: The application must match the described dark-mode aesthetic with a circular visualizer and minimalist icon controls.
2.  **Responsiveness**: The UI must adapt seamlessly to different screen sizes, ensuring buttons and the visualizer remain usable and proportional.
3.  **Functionality**:
    *   Microphone toggling works reliably.
    *   Recording streams audio to the backend without interruption.
    *   Transcription updates appear in real-time.
    *   Audio replay works as expected.
4.  **Performance**: The visualizer runs smoothly (60fps) without causing UI lag.

### Interfaces & API
The frontend interacts with the backend primarily through a WebSocket connection.

**WebSocket Endpoint**: `ws://localhost:8000/ws/transcribe`

*   **Client (Frontend) -> Server**:
    *   **Data**: Binary audio chunks (WebM format).
    *   **Frequency**: Streamed continuously while recording is active.
*   **Server -> Client (Frontend)**:
    *   **Data**: Text string.
    *   **Format**: The server sends the *full* accumulated transcription text, not just the latest chunk. The frontend should replace its current display with the incoming message.

---

## 2. Project Initialization

**Prompt:**
> Create a new React project using Vite with TypeScript.
> Project Name: `audio-assistant-frontend`
>
> ```bash
> npm create vite@latest audio-assistant-frontend -- --template react-ts
> cd audio-assistant-frontend
> npm install
> ```

## 3. Dependencies

**Prompt:**
> Install the necessary dependencies for the project. We need `lucide-react` for icons.
>
> ```bash
> npm install lucide-react
> ```

## 4. Core Logic: `useAudioAnalyzer` Hook

**Description:**
This hook manages the audio context, microphone input, media recorder, WebSocket connection for transcription, and audio playback.

**Prompt:**
> Create a custom hook named `useAudioAnalyzer` in `src/hooks/useAudioAnalyzer.ts`.
>
> **Requirements:**
> 1.  **State Management**: Manage states for `isMicOn`, `isRecording`, `isDemoPlaying`, `transcription` (string), and `isTranscribing`.
> 2.  **Audio Context**: Initialize `AudioContext` lazily.
> 3.  **Microphone Input**:
>     *   Use `navigator.mediaDevices.getUserMedia({ audio: true })`.
>     *   Connect the stream to an `AnalyserNode` (fftSize: 2048) and store it in a ref.
> 4.  **Recording & Streaming**:
>     *   Use `MediaRecorder` to capture audio chunks.
>     *   **WebSocket**: Connect to `ws://localhost:8000/ws/transcribe`.
>     *   When recording, send `Blob` chunks to the WebSocket.
>     *   Receive transcription text from the WebSocket and update the `transcription` state.
> 5.  **Audio Replay**:
>     *   Store recorded chunks in a `Blob` and create a URL (`URL.createObjectURL`).
>     *   Implement `playDemoAudio` to play this URL.
>     *   Connect the playback audio to a separate `AnalyserNode` (for visualization) and then to `destination`.
> 6.  **Data Access**: Expose `getAudioData()` and `getOutputAudioData()` functions that return frequency and time-domain data from the respective analysers.
> 7.  **Cleanup**: Ensure all contexts, tracks, and sockets are closed properly on unmount or stop.

## 5. Components: `Visualizer`

**Description:**
A canvas-based component that renders a circular audio visualizer.

**Prompt:**
> Create a `Visualizer` component in `src/components/Visualizer.tsx`.
>
> **Props:**
> - `getAudioData`: Function to get mic audio data.
> - `getOutputAudioData`: Function to get playback audio data.
> - `isMicOn`: Boolean.
> - `isDemoPlaying`: Boolean.
>
> **Rendering Logic (Canvas 2D):**
> 1.  **Setup**: Full-screen canvas (`width: 100%`, `height: 100%`). Handle window resize.
> 2.  **Loop**: Use `requestAnimationFrame`.
> 3.  **Outer Circle (Mic Input)**:
>     *   If `isMicOn`, draw frequency bars radiating outwards from a central radius.
>     *   Use `ctx.strokeStyle` with dynamic opacity based on frequency value (Red color).
>     *   If `!isMicOn`, draw a static dark red ring.
> 4.  **Inner Circle (Audio Output)**:
>     *   If `isDemoPlaying`, draw a waveform (time-domain data) inside the outer circle.
>     *   Use Cyan color (`#00ffff`).
>     *   Make the line width dynamic (thicker when playing).
>     *   Add a glow effect (`shadowBlur`) when playing.

## 6. Styling: `index.css`

**Description:**
Global styles and specific classes for the control panel and buttons.

**Prompt:**
> Update `src/index.css` with the following styles:
>
> 1.  **Global**: Dark mode (`background-color: #000000`, `color: white`), `font-family: Inter`.
> 2.  **Layout**: Center content with `display: flex`.
> 3.  **Control Panel**:
>     *   Absolute position: Center of the screen (`top: 50%, left: 50%, transform: translate(-50%, -50%)`).
>     *   Layout: Flex row with minimal gap (`0.5rem`).
>     *   Z-Index: 20 (above visualizer).
> 4.  **Buttons**:
>     *   Shape: Circular (`border-radius: 50%`).
>     *   Size: Responsive using `clamp(30px, 8vmin, 50px)`.
>     *   Style: Transparent background, thin dark charcoal border (`1px solid #333`).
>     *   Icons: Scale SVG to 60%.
> 5.  **Responsiveness**: Ensure buttons maintain their circular shape and layout on smaller screens (max-width: 600px).

## 7. Main Application: `App.tsx`

**Description:**
The main component that assembles the visualizer, controls, and transcription display.

**Prompt:**
> Update `src/App.tsx` to assemble the application.
>
> **Structure:**
> 1.  **Visualizer Container**: Render the `Visualizer` component in the background.
> 2.  **Transcription Overlay**:
>     *   Position: Absolute, bottom (`bottom: 20px`).
>     *   Style: Transparent background, no border, max-height limited to ~3 lines, auto-scrolling.
>     *   Content: Display `transcription` state. Show a "Transcribing..." pulse animation when `isTranscribing` is true.
> 3.  **Control Panel**:
>     *   Render 3 buttons using `lucide-react` icons.
>     *   **Mic Button**: Toggles mic. Icon: `Mic` (Red when on) / `MicOff` (Grey).
>     *   **Record Button**: Toggles recording. Icon: `Disc` (Red when recording) / `Mic` (fallback/idle). *Note: Logic should enable/disable based on mic state.*
>     *   **Play Button**: Toggles demo playback. Icon: `Square` (Cyan outline when playing) / `Play` (White/Grey).
> 4.  **Auto-Scroll**: Use a `useEffect` and a `ref` on the transcription box to scroll to the bottom whenever the text updates.

## 8. Final Polish

**Prompt:**
> Ensure `main.tsx` mounts the `App` component correctly. Run `npm run dev` to verify the application starts and the UI matches the description:
> - Dark theme.
> - Circular visualizer in the center.
> - 3 circular icon buttons in the center of the visualizer.
> - Transcription text appearing at the bottom.
