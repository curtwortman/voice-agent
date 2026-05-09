# ⚙️ Hardware Optimization

Voice Agent is tuned for high-performance inference on both AMD and NVIDIA GPUs.

## 🔴 AMD Radeon (ROCm)

Our ROCm stack is specifically optimized for **RDNA3 (gfx1100)** and **Instinct (gfx942/950)** hardware.

### Tuning Flags
We apply the following environment variables in `Dockerfile.vllm.rocm`:

- `FLASH_ATTENTION_TRITON_AMD_ENABLE=1`: Enables Triton-based Flash Attention for AMD GPUs.
- `GPU_MAX_HW_QUEUES=1`: Prevents hardware queue contention.
- `GPU_KEEPALIVE_INTERVAL=15`: Performs a tiny periodic matmul on the GPU to prevent it from dropping into low-power DPM states, which would otherwise cause "latency spikes" for the first request after a period of idleness.
- `MIOPEN_FIND_MODE=FAST`: Optimizes MIOpen kernel selection.

### GFX Override
If your card is not natively supported by the ROCm version in the container, the `setup.sh` generates an `HSA_OVERRIDE_GFX_VERSION` (default `11.0.0` for RX 7000 series) to ensure compatibility.

---

## 🟢 NVIDIA (CUDA)

The NVIDIA stack uses standard `vllm` optimizations and supports:
- **CUDA 12.2+**
- **Flash Attention 2**
- **Paged Attention**

The `api-gateway` image is a lightweight `python:3.12-slim` base, as STT (Faster-Whisper) currently runs on the CPU to ensure broad compatibility across both hardware types.

---

## 📊 Performance Expectation
- **TTS RTF (Real-Time Factor)**: ~0.6-0.8 on high-end consumer GPUs (RTX 4080 / RX 7900).
- **STT Latency**: ~200-400ms for short audio chunks on modern CPUs.
