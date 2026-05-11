#!/bin/bash

# Configuration
if [ -f .env ]; then
    source .env
fi

export PROJECT="voice-agent"
VENV=".${PROJECT}-venv"
TARGET_PORT=${VLLM_PORT:-8009}
MAX_RETRIES=20
RETRY_DELAY=15
BACKEND_PORT=${API_PORT:-8008}
export GPU_MEM_UTILIZATION=${GPU_MEM_UTILIZATION:-0.3}

# Preflight check for ports
check_port() {
    local port=$1
    if ss -tuln | grep -q ":${port} "; then
        echo "Error: Port ${port} is already in use."
        echo "Please stop any conflicting processes (like existing backend/vLLM or other agents) before running this script."
        exit 1
    fi
}

echo "Running preflight checks..."
check_port $TARGET_PORT
check_port $BACKEND_PORT

# Check for internal port collisions
if [ "$TARGET_PORT" = "$BACKEND_PORT" ]; then
    echo "Error: VLLM_PORT and API_PORT cannot be the same ($TARGET_PORT). Please fix your .env file."
    exit 1
fi

echo "Preflight checks passed. Ports are available."

# Detect GPU Type to set COMPOSE_FILE
COMPOSE_FILE=""
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU detected. Using docker-compose.nvidia.yml"
    COMPOSE_FILE="docker-compose.nvidia.yml"
elif command -v rocm-smi &> /dev/null || lsmod | grep -q amdgpu; then
    echo "AMD GPU detected. Using docker-compose.rocm.yml"
    COMPOSE_FILE="docker-compose.rocm.yml"
else
    echo "No supported GPU detected. Cannot proceed."
    exit 1
fi

# Cleanup Function (Trap)
cleanup() {
    echo ""
    echo "========================================"
    echo "Tearing down Docker containers..."
    echo "========================================"
    docker compose -f "$COMPOSE_FILE" down
}
trap cleanup EXIT

echo "========================================"
echo "Phase 1: Environment Validation"
echo "========================================"
if [ -z "${VIRTUAL_ENV:-}" ]; then
    if [ -f "${VENV}/bin/activate" ]; then
        source "${VENV}/bin/activate"
    else
        echo "Virtual environment not found. Please run setup.sh first."
        exit 1
    fi
fi
echo "Environment validated."

echo ""
echo "========================================"
echo "Phase 2: Unit Tests"
echo "========================================"
echo "Executing unit tests..."
if ! pytest tests/unit/; then
    echo "Unit tests failed! Aborting before heavy container startup."
    exit 1
fi

echo ""
echo "========================================"
echo "Phase 3: Container Startup"
echo "========================================"
echo "Starting backend and vLLM Omni containers via $COMPOSE_FILE..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "========================================"
echo "Phase 4: Waiting for Model Readiness"
echo "========================================"
echo "Polling http://localhost:${TARGET_PORT}/v1/models (timeout: $((MAX_RETRIES * RETRY_DELAY)) seconds)"

READY=false
for i in $(seq 1 $MAX_RETRIES); do
    if curl -s "http://localhost:${TARGET_PORT}/v1/models" | grep -q "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"; then
        READY=true
        echo "Model is ready and responding!"
        break
    fi
    echo "INFO: $(date '+%m-%d %H:%M:%S') - Waiting for model to load. Allow for upto 5 min before timeout. Check every 15s"
    sleep $RETRY_DELAY
done

if [ "$READY" = false ]; then
    echo "Timed out waiting for the model container to become ready."
    echo "Fetching container logs for debugging:"
    docker logs vllm-omni-nvidia 2>/dev/null || docker logs vllm-omni-rocm 2>/dev/null || true
    exit 1
fi

echo ""
echo "========================================"
echo "Phase 4.5: Waiting for Backend API Readiness"
echo "========================================"
echo "Polling http://localhost:${BACKEND_PORT}/ (timeout: $((MAX_RETRIES * RETRY_DELAY)) seconds)"

BACKEND_READY=false
for i in $(seq 1 $MAX_RETRIES); do
    if curl -s "http://localhost:${BACKEND_PORT}/" > /dev/null; then
        # Wait for the backend to be fully responsive
        BACKEND_READY=true
        echo "Backend is ready and responding!"
        break
    fi
    echo "Waiting for backend to load... ($i/$MAX_RETRIES)"
    sleep $RETRY_DELAY
done

if [ "$BACKEND_READY" = false ]; then
    echo "Timed out waiting for the backend container to become ready."
    echo "Fetching container logs for debugging:"
    docker logs voice-api-rocm 2>/dev/null || docker logs voice-api-nvidia 2>/dev/null || true
    exit 1
fi

echo ""
echo "========================================"
echo "Phase 5: Integration Tests"
echo "========================================"
echo "Executing integration tests..."
if ! pytest tests/integration/; then
    echo "Integration tests failed!"
    exit 1
fi

echo ""
echo "========================================"
echo "All tests passed successfully!"
echo "========================================"
