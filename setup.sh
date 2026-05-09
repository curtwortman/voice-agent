#!/bin/bash
set -euo pipefail

export PROJECT="voice-agent"
WITH_OPS_TOOLS=0

usage() {
    cat <<'EOF'
Usage:
  ./setup.sh [--with-ops-tools]
  ./setup.sh -h | --help

Options:
  --with-ops-tools  Also install optional ops packages (sshpass, ipmitool)
EOF
}

for arg in "$@"; do
    case "$arg" in
        -h|--help)
            usage
            exit 0
            ;;
        --with-ops-tools)
            WITH_OPS_TOOLS=1
            ;;
        *)
            echo "Unknown option: $arg" >&2
            usage >&2
            exit 1
            ;;
    esac
done

# Ensure no environment is active
if [ -n "${VIRTUAL_ENV:-}" ] && command -v deactivate >/dev/null 2>&1; then
    deactivate
fi

if [ -n "${CONDA_DEFAULT_ENV:-}" ]; then
    if command -v conda >/dev/null 2>&1; then
        for _ in {1..6}; do
            [ -z "${CONDA_DEFAULT_ENV:-}" ] && break
            conda deactivate || break
        done
    else
        unset CONDA_DEFAULT_ENV
    fi
fi

echo "========================================"
echo "Setup: ${PROJECT}"
echo "========================================"
echo "Optional ops tools: ${WITH_OPS_TOOLS}"

echo "Installing System Dependencies"
sudo apt update
sudo apt install -y \
    python3-venv \
    python3-pip \
    git \
    nodejs \
    npm

if [ "$WITH_OPS_TOOLS" -eq 1 ]; then
    sudo apt install -y sshpass ipmitool
fi

# Install uv if not already installed
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    pip install uv
fi

echo "Setup Python Virtual Environment"
VENV=".${PROJECT}-venv"
if [ ! -d "$VENV" ]; then
    uv venv $VENV --python 3.12
fi
source $VENV/bin/activate

export WORKSPACE=${WORKSPACE:-"$HOME/workspace"}
export WORKDIR="$PWD"

echo "========================================"
echo "Installing Python Dependencies"

# Install vLLM with ROCm Support
echo "Installing vLLM 0.20.0+rocm721..."
uv pip install vllm==0.20.0+rocm721 --extra-index-url https://wheels.vllm.ai/rocm/0.20.0/rocm721

# Install vLLM-Omni from Source
if [ ! -d "vllm-omni" ]; then
    echo "Cloning vllm-omni repository..."
    git clone https://github.com/vllm-project/vllm-omni.git
else
    echo "vllm-omni repository already exists. Skipping clone."
fi

echo "Installing vllm-omni..."
cd vllm-omni
uv pip install -e .
cd ..

uv pip list

# Determine directories
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
DEFAULT_RESULTS_DIR="${PROJECT_ROOT}/results"
DEFAULT_CONFIG_DIR="${PROJECT_ROOT}/config"
VOICE_LIBRARY_DIR="${PROJECT_ROOT}/voice_library"

mkdir -p "${VOICE_LIBRARY_DIR}/profiles"

echo "========================================"
echo "Building Frontend (Vite)"
cd "${PROJECT_ROOT}/frontend"
npm install
npm run build
cd "${PROJECT_ROOT}"

echo "========================================"
echo "Setup Environment Variables"

# Check if .env exists, if not create it
if [ ! -f .env ]; then
    echo "Creating .env file..."
    touch .env
fi

# Function to add variable to .env if not exists
add_env_var() {
    local key=$1
    local value=$2
    if ! grep -q "^${key}=" .env; then
        echo "${key}=${value}" >> .env
        echo "Added ${key} to .env"
    fi
}

add_env_var "PROJECT" "${PROJECT}"
add_env_var "RESULTS_DIR" "${DEFAULT_RESULTS_DIR}"
add_env_var "VLLM_USE_ROCM" "1"
add_env_var "MIOPEN_USER_DB_PATH" "${PROJECT_ROOT}/miopen"
# Consumer Radeon GPUs often need the GFX version overridden (e.g., 11.0.0 for RDNA3, 10.3.0 for RDNA2)
add_env_var "HSA_OVERRIDE_GFX_VERSION" "11.0.0"
add_env_var "HIP_VISIBLE_DEVICES" "0"
add_env_var "API_HOST" "0.0.0.0"
add_env_var "API_PORT" "8000"
add_env_var "LLM_API_BASE" "http://localhost:11434/v1"
add_env_var "LLM_API_KEY" "ollama"
add_env_var "LLM_MODEL" "llama3"
add_env_var "VOICE_LIBRARY_DIR" "${PROJECT_ROOT}/voice_library"

echo ".env file content:"
cat .env
export RESULTS_DIR

echo "========================================"
echo "Checking Installation"
python3 -V
uv --version

echo "Environment setup completed. To run the server, use ./start.sh"
