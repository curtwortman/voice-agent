#!/bin/bash

export PROJECT="voice-agent"
VENV=".${PROJECT}-venv"

# Check if Docker containers that might conflict are running
if command -v docker &> /dev/null; then
    RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}' | grep -iE 'vllm-omni' || true)
    if [ ! -z "$RUNNING_CONTAINERS" ]; then
        echo "Error: The following vLLM Docker containers are currently running:"
        echo "$RUNNING_CONTAINERS"
        echo "Please stop them to avoid port/GPU conflicts before running the local server."
        return 1 2>/dev/null || exit 1
    fi
fi

# Preflight check for port
TARGET_PORT=${VLLM_PORT:-8009}
if ss -tuln | grep -q ":${TARGET_PORT} "; then
    echo "Error: Port ${TARGET_PORT} is already in use."
    echo "Please stop any conflicting processes before running start.sh."
    return 1 2>/dev/null || exit 1
fi

# Ensure we are in the virtual environment
if [ -z "${VIRTUAL_ENV:-}" ]; then
    if [ -f "${VENV}/bin/activate" ]; then
        source "${VENV}/bin/activate"
    else
        echo "Virtual environment not found. Please run setup.sh first."
        return 1 2>/dev/null || exit 1
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

if command -v nvidia-smi &> /dev/null; then
    export VLLM_USE_ROCM=${VLLM_USE_ROCM:-0}
else
    # Set Environment Variables for AMD GPUs (with fallbacks if not in .env)
    export VLLM_USE_ROCM=${VLLM_USE_ROCM:-1}
    export MIOPEN_USER_DB_PATH=${MIOPEN_USER_DB_PATH:-"${PROJECT_ROOT}/miopen"}
    export HSA_OVERRIDE_GFX_VERSION=${HSA_OVERRIDE_GFX_VERSION:-11.0.0}
    export HIP_VISIBLE_DEVICES=${HIP_VISIBLE_DEVICES:-0}
    mkdir -p "${MIOPEN_USER_DB_PATH}"
fi

echo "Starting Qwen3-TTS (vLLM-Omni) server..."
export PYTHONPATH="${PROJECT_ROOT}/vllm-omni:${PYTHONPATH:-}"
python -m vllm_omni.entrypoints.openai.api_server \
    --model Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice \
    --pipeline-parallel-size 1 \
    --host 0.0.0.0 \
    --port ${TARGET_PORT} \
    --max-model-len 4096 \
    --gpu-memory-utilization ${GPU_MEM_UTILIZATION:-0.3} \
    --enforce-eager \
    --trust-remote-code
