import asyncio
import numpy as np
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.frames.frames import AudioRawFrame, TranscriptionFrame, UserStoppedSpeakingFrame

class LocalWhisperSTT(FrameProcessor):
    def __init__(self, whisper_service):
        super().__init__()
        self._whisper = whisper_service
        self._audio_buffer = bytearray()
        self._sample_rate = 16000

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)
        
        if isinstance(frame, AudioRawFrame):
            self._audio_buffer.extend(frame.audio)
            
        elif isinstance(frame, UserStoppedSpeakingFrame):
            if len(self._audio_buffer) > 0:
                audio_bytes = bytes(self._audio_buffer)
                self._audio_buffer.clear()
                
                # Convert PCM 16-bit to float32 for faster-whisper
                audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                text = await asyncio.to_thread(self._whisper.transcribe, audio_np)
                
                if text:
                    await self.push_frame(TranscriptionFrame(text=text, user_id="", timestamp=""))
