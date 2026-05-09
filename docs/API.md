# 📚 API Reference

The Voice Agent API is designed to be a drop-in replacement for the OpenAI TTS API, while also providing discovery and management endpoints.

## 🎙️ Text-to-Speech (TTS)

### Generate Speech (OpenAI Compatible)
`POST /v1/audio/speech`

**Request Body:**
```json
{
  "model": "tts-1",
  "input": "Hello, this is a test.",
  "voice": "Vivian",
  "response_format": "mp3",
  "speed": 1.0,
  "stream": false
}
```

- **model**: `tts-1`, `tts-1-hd`, or the full model name.
- **input**: The text to synthesize (max 4096 characters).
- **voice**: Built-in voice (`Vivian`, `Ryan`, `Serena`, `Dylan`, `Eric`, `Aiden`) or a custom profile (`clone:ProfileName`).
- **response_format**: `mp3` (default), `opus`, `aac`, `flac`, `wav`, `pcm`.
- **stream**: If `true`, returns a chunked audio stream (recommended for PCM).

---

## 🔍 Discovery

### List Voices
`GET /v1/voices`
Returns a list of all available voices, including built-in presets and your saved cloned profiles.

### List Models
`GET /v1/models`
Returns available TTS models.

### Health Check
`GET /health`
Returns the status of the gateway and underlying services.

---

## 🎙️ Voice Management

### Create Voice Clone
`POST /v1/voices/clone` (Multipart Form)

- **profile_id**: Short slug for the profile (e.g., `curt`).
- **name**: Display name for the voice.
- **audio**: Reference audio file (5-20 seconds of clean speech).
- **ref_text**: (Optional) Transcript of the reference audio.
- **language**: (Optional) Default language for the profile.

---

## 📝 Speech-to-Text (STT)

### Live Transcription
`WS /ws/transcribe`

Binary WebSocket endpoint for streaming audio data.
- **Query Params**:
  - `save_folder`: (Optional) Path to save the recording.
  - `filename_prefix`: (Optional) Prefix for the saved file.

Returns live text transcripts as they are processed. On disconnect, an Obsidian meeting note is automatically generated if the session contained speech.
