from faster_whisper import WhisperModel
import os

class WhisperService:
    def __init__(self, model_size="large-v3-turbo", device="cpu", compute_type="int8"):
        print(f"Loading Whisper model: {model_size} on {device} with {compute_type}")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("Model loaded successfully")

    def transcribe(self, audio, language="en"):
        """
        Transcribe audio.
        :param audio: Path to audio file or numpy array of audio samples.
        :param language: Language code.
        """
        try:
            segments, info = self.model.transcribe(
                audio,
                language=language,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            text = ""
            for segment in segments:
                text += segment.text

            return text.strip()
        except Exception as e:
            print(f"Error during transcription: {e}")
            return ""
