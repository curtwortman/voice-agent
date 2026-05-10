import httpx
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.frames.frames import TextFrame, AudioRawFrame, ErrorFrame, TTSStartedFrame, TTSStoppedFrame

class LocalTTS(FrameProcessor):
    def __init__(self, tts_service):
        super().__init__()
        self._tts = tts_service

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)
        
        if isinstance(frame, TextFrame):
            text = frame.text
            if text.strip():
                await self.push_frame(TTSStartedFrame())
                try:
                    url = f"{self._tts.api_url}/audio/speech"
                    payload = {
                        "model": self._tts.model_name,
                        "input": text,
                        "voice": "default",
                        "response_format": "pcm",
                        "speed": 1.0,
                        "stream": True,
                    }
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        async with client.stream("POST", url, json=payload, headers={"Content-Type": "application/json"}) as response:
                            response.raise_for_status()
                            async for chunk in response.aiter_bytes(chunk_size=4096):
                                await self.push_frame(AudioRawFrame(audio=chunk, sample_rate=16000, num_channels=1))
                except Exception as e:
                    await self.push_frame(ErrorFrame(str(e)))
                await self.push_frame(TTSStoppedFrame())
