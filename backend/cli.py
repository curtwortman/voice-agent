import argparse
import os
import sys
from tts_service import TTSService
from whisper_service import WhisperService

def main():
    parser = argparse.ArgumentParser(description="Voice Agent CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # TTS Command
    tts_parser = subparsers.add_parser("tts", help="Text to Speech")
    tts_parser.add_argument("text", type=str, help="Text to convert to speech")
    tts_parser.add_argument("--output", "-o", type=str, default="output.mp3", help="Output audio file path")
    tts_parser.add_argument("--api-url", type=str, default=None, help="vLLM API URL (default: from VLLM_API_URL env var)")

    # STT Command
    stt_parser = subparsers.add_parser("stt", help="Speech to Text")
    stt_parser.add_argument("audio_file", type=str, help="Path to input audio file")
    stt_parser.add_argument("--model", "-m", type=str, default="base", help="Whisper model size (default: base)")
    stt_parser.add_argument("--device", "-d", type=str, default="cpu", help="Device to use (default: cpu)")

    args = parser.parse_args()

    if args.command == "tts":
        print(f"Running TTS: '{args.text}' -> {args.output}")
        tts = TTSService(api_url=args.api_url)
        if tts.generate_audio(args.text, args.output):
            print("TTS completed successfully.")
        else:
            print("TTS failed.")
            sys.exit(1)

    elif args.command == "stt":
        if not os.path.exists(args.audio_file):
            print(f"Error: Audio file '{args.audio_file}' not found.")
            sys.exit(1)

        print(f"Running STT on '{args.audio_file}' using model '{args.model}'")
        stt = WhisperService(model_size=args.model, device=args.device)
        text = stt.transcribe(args.audio_file)

        if text:
            print("\n--- Transcription ---")
            print(text)
            print("---------------------")
        else:
            print("Transcription returned empty or failed.")
            sys.exit(1)

    else:
        parser.print_help()

if __name__ == "__main__":
    main()
