import os
import json
import httpx
import hashlib
from pathlib import Path
from typing import Optional, List

# ──────────────────────────────────────────────
# Voice Library
# ──────────────────────────────────────────────

VOICE_LIBRARY_DIR = os.getenv("VOICE_LIBRARY_DIR", "/app/voice_library")

# Built-in voices provided by Qwen3-TTS CustomVoice model
BUILTIN_VOICES = {
    "Vivian": {"gender": "female", "language": "English", "description": "Clear, professional female"},
    "Ryan":   {"gender": "male",   "language": "English", "description": "Warm, confident male"},
    "Serena": {"gender": "female", "language": "English", "description": "Calm, soothing female"},
    "Dylan":  {"gender": "male",   "language": "English", "description": "Friendly, casual male"},
    "Eric":   {"gender": "male",   "language": "English", "description": "Authoritative male"},
    "Aiden":  {"gender": "male",   "language": "English", "description": "Young, energetic male"},
}


class VoiceProfile:
    """Represents a saved voice clone profile."""
    def __init__(self, profile_id: str, name: str, ref_audio_path: str,
                 ref_text: str = "", language: str = "English"):
        self.profile_id = profile_id
        self.name = name
        self.ref_audio_path = ref_audio_path
        self.ref_text = ref_text
        self.language = language


class VoiceLibrary:
    """Manages saved voice profiles for clone:ProfileName usage."""

    def __init__(self, library_dir: str = None):
        self.library_dir = Path(library_dir or VOICE_LIBRARY_DIR) / "profiles"
        self.library_dir.mkdir(parents=True, exist_ok=True)
        self._cache = {}  # profile_id -> VoiceProfile
        self._load_profiles()

    def _load_profiles(self):
        """Scan profiles directory and load metadata."""
        self._cache = {}
        if not self.library_dir.exists():
            return
        for profile_dir in self.library_dir.iterdir():
            if not profile_dir.is_dir():
                continue
            meta_path = profile_dir / "meta.json"
            if meta_path.exists():
                try:
                    with open(meta_path) as f:
                        meta = json.load(f)
                    ref_audio = profile_dir / meta.get("ref_audio_filename", "reference.wav")
                    if ref_audio.exists():
                        self._cache[meta["profile_id"]] = VoiceProfile(
                            profile_id=meta["profile_id"],
                            name=meta.get("name", meta["profile_id"]),
                            ref_audio_path=str(ref_audio),
                            ref_text=meta.get("ref_text", ""),
                            language=meta.get("language", "English"),
                        )
                except Exception as e:
                    print(f"Warning: Failed to load voice profile {profile_dir}: {e}")

    def get_profile(self, profile_id: str) -> Optional[VoiceProfile]:
        return self._cache.get(profile_id.lower())

    def list_profiles(self) -> List[dict]:
        return [
            {
                "voice_id": f"clone:{p.name}",
                "name": p.name,
                "type": "clone",
                "language": p.language,
            }
            for p in self._cache.values()
        ]

    def save_profile(self, profile_id: str, name: str, audio_bytes: bytes,
                     ref_text: str = "", language: str = "English") -> VoiceProfile:
        """Save a new voice profile from uploaded audio."""
        profile_dir = self.library_dir / profile_id.lower()
        profile_dir.mkdir(parents=True, exist_ok=True)

        ref_audio_path = profile_dir / "reference.wav"
        with open(ref_audio_path, "wb") as f:
            f.write(audio_bytes)

        meta = {
            "profile_id": profile_id.lower(),
            "name": name,
            "ref_audio_filename": "reference.wav",
            "ref_text": ref_text,
            "language": language,
        }
        with open(profile_dir / "meta.json", "w") as f:
            json.dump(meta, f, indent=2)

        profile = VoiceProfile(
            profile_id=profile_id.lower(),
            name=name,
            ref_audio_path=str(ref_audio_path),
            ref_text=ref_text,
            language=language,
        )
        self._cache[profile_id.lower()] = profile
        print(f"Saved voice profile: {name} ({profile_id})")
        return profile


# ──────────────────────────────────────────────
# TTS Service
# ──────────────────────────────────────────────

SUPPORTED_FORMATS = {"mp3", "opus", "aac", "flac", "wav", "pcm"}
FORMAT_MEDIA_TYPES = {
    "mp3": "audio/mpeg",
    "opus": "audio/opus",
    "aac": "audio/aac",
    "flac": "audio/flac",
    "wav": "audio/wav",
    "pcm": "audio/pcm",
}


class TTSService:
    def __init__(self, api_url=None):
        self.api_url = api_url or os.getenv("VLLM_API_URL", "http://localhost:8001/v1")
        self.model_name = os.getenv("TTS_MODEL_NAME", "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice")
        self.voice_library = VoiceLibrary()

    def resolve_voice(self, voice: str) -> str:
        """Resolve clone:ProfileName to the actual profile, or return builtin name."""
        if voice.startswith("clone:"):
            profile_id = voice[len("clone:"):]
            profile = self.voice_library.get_profile(profile_id.lower())
            if profile:
                return voice  # Pass through; vLLM handles the clone prefix
            else:
                print(f"Warning: Voice profile '{profile_id}' not found. Falling back to default.")
                return "default"
        return voice

    def list_voices(self) -> list:
        """List all available voices (builtin + cloned profiles)."""
        voices = []
        for name, meta in BUILTIN_VOICES.items():
            voices.append({
                "voice_id": name,
                "name": name,
                "type": "builtin",
                **meta,
            })
        voices.extend(self.voice_library.list_profiles())
        return voices

    def generate_audio(self, text: str, output_file: str,
                       voice: str = "default",
                       response_format: str = "mp3",
                       speed: float = 1.0) -> bool:
        """
        Generate audio from text by calling the vLLM API and save to file.
        :param text: Text to convert to speech.
        :param output_file: Path to save the audio file.
        :param voice: Voice name or clone:ProfileName.
        :param response_format: Output format (mp3, opus, aac, flac, wav, pcm).
        :param speed: Playback speed multiplier (0.25 to 4.0).
        """
        if response_format not in SUPPORTED_FORMATS:
            response_format = "mp3"

        resolved_voice = self.resolve_voice(voice)

        try:
            print(f"Generating audio for: '{text[:80]}...' voice={resolved_voice} format={response_format}")
            url = f"{self.api_url}/audio/speech"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": self.model_name,
                "input": text,
                "voice": resolved_voice,
                "response_format": response_format,
                "speed": speed,
            }
            with httpx.Client(timeout=120.0) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()

                with open(output_file, "wb") as f:
                    f.write(response.content)

            print(f"Audio saved to {output_file}")
            return True
        except Exception as e:
            print(f"Error generating audio via vLLM: {e}")
            return False

    def generate_audio_stream(self, text: str, voice: str = "default",
                              response_format: str = "pcm", speed: float = 1.0):
        """
        Stream audio generation for real-time playback.
        Yields chunks of audio bytes as they are generated.
        """
        resolved_voice = self.resolve_voice(voice)

        url = f"{self.api_url}/audio/speech"
        payload = {
            "model": self.model_name,
            "input": text,
            "voice": resolved_voice,
            "response_format": response_format,
            "speed": speed,
            "stream": True,
        }
        try:
            with httpx.Client(timeout=120.0) as client:
                with client.stream("POST", url, json=payload,
                                   headers={"Content-Type": "application/json"}) as response:
                    response.raise_for_status()
                    for chunk in response.iter_bytes(chunk_size=4096):
                        yield chunk
        except Exception as e:
            print(f"Error streaming audio via vLLM: {e}")
