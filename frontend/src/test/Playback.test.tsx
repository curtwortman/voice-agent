import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock browser APIs
const mockAudioContext = {
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    connect: vi.fn(),
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
  })),
  resume: vi.fn(),
  destination: {},
  state: 'suspended',
};

const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: vi.fn(),
  onstop: vi.fn(),
  state: 'inactive',
};

// Mock Audio element
const mockAudio = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  currentTime: 0,
  src: '',
  onended: null as (() => void) | null,
};

globalThis.AudioContext = class {
  constructor() {
    return mockAudioContext;
  }
} as any;

globalThis.MediaRecorder = class {
  constructor() {
    return mockMediaRecorder;
  }
} as any;

globalThis.Audio = class {
  constructor() {
    return mockAudio;
  }
} as any;
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

describe('useAudioAnalyzer Playback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks state if needed
    mockAudioContext.state = 'suspended';
    mockMediaRecorder.state = 'inactive';
  });

  it('should handle playback flow correctly', async () => {
    const { result } = renderHook(() => useAudioAnalyzer({
      audioOutput: 'opus',
      saveFolder: '',
      filenamePrefix: 'test',
      maxDuration: 60,
      transcriptionEnabled: false,
      transcriptionMode: 'recording'
    }));

    // 1. Start Recording
    await act(async () => {
      // Mock getUserMedia
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockResolvedValue({}),
        },
        writable: true,
      });

      result.current.toggleMic();
    });

    // Wait for state update
    await act(async () => {
        // Wait for async startAudio
    });

    expect(result.current.isMicOn).toBe(true);

    act(() => {
      result.current.toggleRecording();
    });
    expect(result.current.isRecording).toBe(true);

    // Simulate data available
    act(() => {
      // We need to access the mediaRecorder instance created inside the hook
      // But we mocked the constructor, so we can access the mock instance methods if we captured them?
      // The mockMediaRecorder is a singleton object in this setup, which simplifies things but might be risky if multiple instances were created.
      // In this hook, only one is created per startAudio call.

      // Simulate recording some data
      // @ts-ignore
      mockMediaRecorder.ondataavailable({ data: { size: 100 } });
    });

    // 2. Stop Recording
    act(() => {
      result.current.toggleRecording();
    });
    expect(result.current.isRecording).toBe(false);

    // Simulate onstop event to save blob
    act(() => {
        if (mockMediaRecorder.onstop) {
            // @ts-ignore
            mockMediaRecorder.onstop();
        }
    });

    // 3. Play Recording
    await act(async () => {
      result.current.togglePlayback();
    });

    await waitFor(() => {
        expect(result.current.isRecordingPlaying).toBe(true);
    });
    expect(mockAudio.play).toHaveBeenCalled();

    // 4. End Playback
    act(() => {
      if (mockAudio.onended) {
        mockAudio.onended();
      }
    });

    expect(result.current.isRecordingPlaying).toBe(false);
  });

  it('should handle playback errors', async () => {
     const { result } = renderHook(() => useAudioAnalyzer({
      audioOutput: 'opus',
      saveFolder: '',
      filenamePrefix: 'test',
      maxDuration: 60,
      transcriptionEnabled: false,
      transcriptionMode: 'recording'
    }));

    // Setup recorded audio url manually or simulate recording flow
    // Let's simulate recording flow quickly
    await act(async () => {
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue({}) },
        writable: true,
      });
      result.current.toggleMic();
    });
    act(() => { result.current.toggleRecording(); });
    act(() => {
        if (mockMediaRecorder.ondataavailable) {
            // @ts-ignore
            mockMediaRecorder.ondataavailable({ data: { size: 100 } });
        }
    });
    act(() => { result.current.toggleRecording(); });
    act(() => {
        if (mockMediaRecorder.onstop) {
            // @ts-ignore
            mockMediaRecorder.onstop();
        }
    });

    // Mock play failure
    mockAudio.play.mockRejectedValueOnce(new Error('Autoplay failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      result.current.togglePlayback();
    });

    await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalled();
        expect(result.current.isRecordingPlaying).toBe(false);
    });

    consoleSpy.mockRestore();
  });
});
