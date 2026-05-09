# 🎙️ Voice Cloning Guide

Voice Agent allows you to clone any voice from a short audio sample and reuse it indefinitely via the `clone:ProfileName` convention.

## 🛠️ How it Works

1.  **Reference Audio**: Provide a 5-20 second sample of the target voice. The audio should be clean, mono, and at least 16kHz.
2.  **Profile Creation**: The `api-gateway` saves the audio and metadata into the `voice_library`.
3.  **Inference**: When you request a voice starting with `clone:`, the system loads the reference audio and uses the Qwen3-TTS Base model to synthesize speech that matches the reference.

## 📝 Creating a Profile

### Via API
Use the `/v1/voices/clone` endpoint:
```bash
curl -X POST http://localhost:8000/v1/voices/clone \
  -F "profile_id=curt" \
  -F "name=Curt" \
  -F "audio=@my_voice_sample.wav"
```

### Manual Creation
You can also manually create a profile by creating a folder in `./voice_library/profiles/`:
```
voice_library/profiles/curt/
├── meta.json
└── reference.wav
```
**meta.json:**
```json
{
  "profile_id": "curt",
  "name": "Curt",
  "ref_audio_filename": "reference.wav",
  "language": "English"
}
```

## 📣 Using Your Clone

Once a profile is created, use it in any TTS request by prefixing the ID with `clone:`:

```json
{
  "model": "tts-1",
  "input": "This is my cloned voice speaking.",
  "voice": "clone:curt"
}
```

## 💡 Tips for Better Clones
- **Clean Audio**: Avoid background noise or music.
- **Natural Speech**: Use a sample that represents the desired tone and pace.
- **Length**: 10-15 seconds is usually the "sweet spot" for high fidelity.
