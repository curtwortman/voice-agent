# Audio Assistant Frontend

## Objective
The frontend serves as the user interface for the Audio Assistant. It provides a modern, interactive experience with a circular audio visualizer, intuitive controls for recording, and a real-time display for transcribed text.

## Technologies
- **React**: UI library.
- **Vite**: Build tool and development server.
- **TypeScript**: Type safety.
- **WebSocket**: Real-time communication with the backend.
- **Canvas API**: For the custom circular audio visualizer.

## Features
- **Real-time Audio Visualization**: Reacts to both microphone input and audio playback.
- **Streaming Audio**: Captures microphone input and streams it to the backend via WebSockets.
- **Live Transcription**: Displays transcription text updates in real-time.
- **Audio Replay**: Allows users to listen back to their recorded session.

## Setup and Running

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

## Usage
1.  **Mic Control**: Click the **Microphone** icon to toggle the microphone on/off.
2.  **Recording**: Click the **Disc** icon to Start/Stop recording. Audio is sent to the backend only while recording.
3.  **Demo**: Click the **Play** icon to play back the last recorded audio clip.
4.  **Settings**: Click the **Gear** icon to configure:
    *   **Audio Output**: Choose between Opus (WebM) or MP3 (requires backend support).
    *   **Max Duration**: Set a limit for recording length (default: 60 mins).
    *   **Transcription**: Toggle on/off and choose mode (Recording vs Continuous).

## UI Overview
- **Visualizer**: A circular audio visualizer that reacts to microphone input (red outer ring) and audio playback (cyan inner ring).
- **Controls**: Minimalist, circular icon buttons (Mic, Record, Play) arranged horizontally in the center.
- **Transcription**: A transparent, auto-scrolling text overlay at the bottom of the screen displaying real-time transcription.

## Configuration
- The WebSocket URL is configured in `src/hooks/useAudioAnalyzer.ts` (default: `ws://localhost:8000/ws/transcribe`).

## Independent Execution
This frontend application runs independently of the backend. However, for transcription features to work, the backend server must be running and accessible at the configured WebSocket URL.
