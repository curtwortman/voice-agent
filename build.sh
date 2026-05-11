#!/bin/bash
set -euo pipefail

export PROJECT="voice-agent"
TARGET="nvidia"
NO_CACHE=0

usage() {
    cat <<'EOF'
Usage:
  ./build.sh <target> [--no-cache]
  ./build.sh -h | --help

Targets:
  rocm      Build containers for AMD Radeon (ROCm)
  nvidia    Build containers for NVIDIA (CUDA)
  all       Build both stacks

Options:
  --no-cache  Force a clean rebuild without Docker layer cache
EOF
}

for arg in "$@"; do
    case "$arg" in
        -h|--help)
            usage
            exit 0
            ;;
        --no-cache)
            NO_CACHE=1
            ;;
        rocm|nvidia|all)
            TARGET="$arg"
            ;;
        *)
            echo "Unknown option: $arg" >&2
            usage >&2
            exit 1
            ;;
    esac
done

# Source .env if it exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

CACHE_FLAG=""
if [ "$NO_CACHE" -eq 1 ]; then
    CACHE_FLAG="--no-cache"
fi

# ──────────────────────────────────────────────
# Build Frontend
# ──────────────────────────────────────────────

echo "========================================"
echo "Building Frontend"
echo "========================================"
if [ -d "frontend" ]; then
    cd frontend
    npm install
    npm run build
    cd ..
    echo "Frontend built to frontend/dist/"
else
    echo "Warning: frontend/ directory not found. Skipping frontend build."
fi

# ──────────────────────────────────────────────
# Build Docker Images
# ──────────────────────────────────────────────

build_rocm() {
    echo "========================================"
    echo "Building ROCm Stack (AMD Radeon)"
    echo "========================================"
    docker compose -f docker-compose.rocm.yml build $CACHE_FLAG
    echo "ROCm images built successfully."
    docker compose -f docker-compose.rocm.yml images
}

build_nvidia() {
    echo "========================================"
    echo "Building NVIDIA Stack (CUDA)"
    echo "========================================"
    docker compose -f docker-compose.nvidia.yml build $CACHE_FLAG
    echo "NVIDIA images built successfully."
    docker compose -f docker-compose.nvidia.yml images
}

case "$TARGET" in
    rocm)
        build_rocm
        ;;
    nvidia)
        build_nvidia
        ;;
    all)
        build_rocm
        build_nvidia
        ;;
esac

echo "========================================"
echo "Build complete for target: ${TARGET}"
echo "========================================"
echo ""
echo "To start the service:"
echo "  Default (NVIDIA): docker compose up -d"
echo "  ROCm:             docker compose -f docker-compose.rocm.yml up -d"
