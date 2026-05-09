#!/bin/bash
set -euo pipefail

export PROJECT="voice-agent"
VENV=".${PROJECT}-venv"

# Ensure we are in the virtual environment
if [ -z "${VIRTUAL_ENV:-}" ]; then
    if [ -f "${VENV}/bin/activate" ]; then
        source "${VENV}/bin/activate"
    else
        echo "Virtual environment not found. Please run setup.sh first."
        exit 1
    fi
fi

# Determine root directory
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"

# Source .env if it exists
if [ -f "${PROJECT_ROOT}/.env" ]; then
    set -a
    source "${PROJECT_ROOT}/.env"
    set +a
fi

# Set Environment Variables for AMD GPUs (with fallbacks if not in .env)
export VLLM_USE_ROCM=${VLLM_USE_ROCM:-1}
export MIOPEN_USER_DB_PATH=${MIOPEN_USER_DB_PATH:-"${PROJECT_ROOT}/miopen"}
export HSA_OVERRIDE_GFX_VERSION=${HSA_OVERRIDE_GFX_VERSION:-11.0.0}
export HIP_VISIBLE_DEVICES=${HIP_VISIBLE_DEVICES:-0}
mkdir -p "${MIOPEN_USER_DB_PATH}"

echo "Starting Qwen3-TTS (vLLM-Omni) server..."
export PYTHONPATH="${PROJECT_ROOT}/vllm-omni:${PYTHONPATH:-}"
python -m vllm_omni.entrypoints.openai.api_server \
    --model Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice \
    --pipeline-parallel-size 1
