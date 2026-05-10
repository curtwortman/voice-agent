from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from whisper_service import WhisperService
from tts_service import TTSService, FORMAT_MEDIA_TYPES, SUPPORTED_FORMATS
from obsidian_service import ObsidianService

from pipecat.transports.network.fastapi_websocket import FastAPIWebsocketTransport, FastAPIWebsocketParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.vad.silero import SileroVADAnalyzer
from pipecat.services.openai import OpenAILLMService
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.frames.frames import EndFrame, LLMMessagesFrame

from pipecat_services.local_stt import LocalWhisperSTT
from pipecat_services.local_tts import LocalTTS

import os
import tempfile
import asyncio
import time
import shutil
from pathlib import Path
from typing import Optional

import ffmpeg
import numpy as np

# ──────────────────────────────────────────────
# App Setup
# ──────────────────────────────────────────────

app = FastAPI(
    title="Voice Agent API",
    description="OpenAI-compatible TTS + STT service with voice cloning and Obsidian integration",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
whisper_service = WhisperService(model_size="base", device="cpu", compute_type="int8")
obsidian_service = ObsidianService()
tts_service = TTSService()


# ──────────────────────────────────────────────
# Health & Discovery Endpoints
# ──────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "0.2.0",
        "services": {
            "stt": "faster-whisper",
            "tts": tts_service.model_name,
            "obsidian": True,
        },
        "vllm_api_url": tts_service.api_url,
    }


@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": "tts-1",
                "object": "model",
                "owned_by": "voice-agent",
            },
            {
                "id": "tts-1-hd",
                "object": "model",
                "owned_by": "voice-agent",
            },
            {
                "id": tts_service.model_name,
                "object": "model",
                "owned_by": "voice-agent",
            },
        ],
    }


@app.get("/v1/voices")
async def list_voices():
    voices = tts_service.list_voices()
    return {
        "object": "list",
        "data": voices,
    }


# ──────────────────────────────────────────────
# OpenAI-Compatible TTS Endpoint
# ──────────────────────────────────────────────

class SpeechRequest(BaseModel):
    model: str = "tts-1"
    input: str
    voice: str = "default"
    response_format: str = "mp3"
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    stream: bool = False


@app.post("/v1/audio/speech")
async def create_speech(request: SpeechRequest, background_tasks: BackgroundTasks):
    """OpenAI-compatible TTS endpoint."""
    fmt = request.response_format if request.response_format in SUPPORTED_FORMATS else "mp3"
    media_type = FORMAT_MEDIA_TYPES.get(fmt, "audio/mpeg")

    # Streaming mode
    if request.stream:
        return StreamingResponse(
            tts_service.generate_audio_stream(
                text=request.input,
                voice=request.voice,
                response_format=fmt,
                speed=request.speed,
            ),
            media_type=media_type,
        )

    # Non-streaming mode
    suffix = f".{fmt}" if fmt != "pcm" else ".pcm"
    session_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    session_file_path = session_file.name
    session_file.close()

    success = tts_service.generate_audio(
        text=request.input,
        output_file=session_file_path,
        voice=request.voice,
        response_format=fmt,
        speed=request.speed,
    )
    if success:
        background_tasks.add_task(os.remove, session_file_path)
        return FileResponse(session_file_path, media_type=media_type, filename=f"speech.{fmt}")
    else:
        if os.path.exists(session_file_path):
            os.remove(session_file_path)
        return JSONResponse(status_code=500, content={"error": "TTS generation failed"})


# Legacy endpoint (backwards compatible)
class TTSRequest(BaseModel):
    text: str
    voice: str = "default"
    response_format: str = "mp3"


@app.post("/api/tts")
async def generate_speech_legacy(request: TTSRequest, background_tasks: BackgroundTasks):
    """Legacy TTS endpoint — proxies to OpenAI-compatible endpoint."""
    speech_req = SpeechRequest(
        input=request.text,
        voice=request.voice,
        response_format=request.response_format,
    )
    return await create_speech(speech_req, background_tasks)


# ──────────────────────────────────────────────
# Voice Library Management
# ──────────────────────────────────────────────

@app.post("/v1/voices/clone")
async def upload_voice_profile(
    profile_id: str = Form(...),
    name: str = Form(...),
    ref_text: str = Form(""),
    language: str = Form("English"),
    audio: UploadFile = File(...),
):
    """Upload a voice reference audio to create a clonable profile."""
    audio_bytes = await audio.read()
    profile = tts_service.voice_library.save_profile(
        profile_id=profile_id,
        name=name,
        audio_bytes=audio_bytes,
        ref_text=ref_text,
        language=language,
    )
    return {
        "status": "ok",
        "profile": {
            "voice_id": f"clone:{profile.name}",
            "profile_id": profile.profile_id,
            "name": profile.name,
            "language": profile.language,
        },
    }


# ──────────────────────────────────────────────
# STT WebSocket Endpoint
# ──────────────────────────────────────────────

@app.websocket("/ws/transcribe")
async def websocket_endpoint(
    websocket: WebSocket,
    save_folder: str = None,
    filename_prefix: str = "recording",
    format: str = "opus",
):
    await websocket.accept()
    print(f"WebSocket connection accepted. Save Folder: {save_folder}, Prefix: {filename_prefix}, Format: {format}")

    # Accumulate the transcript for Obsidian
    full_transcript = []

    # Create a unique temporary file for this session
    session_file = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
    session_file_path = session_file.name
    session_file.close()

    try:
        while True:
            data = await websocket.receive_bytes()

            with open(session_file_path, "ab") as f:
                f.write(data)

            try:
                out, _ = (
                    ffmpeg.input(session_file_path)
                    .output('-', format='f32le', acodec='pcm_f32le', ac=1, ar='16000')
                    .run(cmd='ffmpeg', capture_stdout=True, capture_stderr=True)
                )

                audio_data = np.frombuffer(out, np.float32)
                text = whisper_service.transcribe(audio_data)

                if text:
                    full_transcript.append(text)
                    await websocket.send_text(text)
            except ffmpeg.Error:
                pass
            except Exception as e:
                print(f"Error during transcription: {e}")

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error in websocket: {e}")
    finally:
        # Generate Obsidian note
        final_text = " ".join(full_transcript).strip()
        if final_text:
            asyncio.create_task(asyncio.to_thread(obsidian_service.generate_note, final_text))

        # Save file if requested
        if save_folder and os.path.exists(session_file_path):
            try:
                target_path = Path(save_folder)
                target_path.mkdir(parents=True, exist_ok=True)
                timestamp_str = time.strftime("%Y-%m-%d_%H-%M-%S")
                filename = f"{filename_prefix}_{timestamp_str}.webm"
                target_file = target_path / filename
                shutil.copy2(session_file_path, target_file)
                print(f"Saved recording to {target_file}")
            except Exception as e:
                print(f"Failed to save recording: {e}")

        if os.path.exists(session_file_path):
            os.remove(session_file_path)


@app.websocket("/ws/agent")
async def agent_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_out_enabled=True,
            audio_in_enabled=True,
            add_wav_header=False,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True
        )
    )

    llm = OpenAILLMService(
        api_key=os.getenv("LLM_API_KEY", "ollama"),
        model=os.getenv("LLM_MODEL", "llama3"),
        base_url=os.getenv("LLM_API_BASE", "http://localhost:11434/v1")
    )

    stt = LocalWhisperSTT(whisper_service=whisper_service)
    tts = LocalTTS(tts_service=tts_service)

    messages = [
        {"role": "system", "content": "You are a helpful AI assistant. Keep responses extremely brief and conversational."}
    ]
    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    pipeline = Pipeline([
        transport.input(),
        stt,
        context_aggregator.user(),
        llm,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    task = PipelineTask(pipeline, PipelineParams(allow_interruptions=True))
    
    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, websocket):
        print("Agent Client connected")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, websocket):
        print("Agent Client disconnected")
        final_text = "\n".join([m['content'] for m in context.messages if m['role'] in ['user', 'assistant']])
        if final_text.strip():
            asyncio.create_task(asyncio.to_thread(obsidian_service.generate_note, final_text))

    runner = PipelineRunner()
    await runner.run(task)


# ──────────────────────────────────────────────
# Static Files (Frontend)
# Must be mounted last so API routes take priority
# ──────────────────────────────────────────────

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    print(f"Warning: Static directory {static_dir} not found. Frontend will not be served.")
