import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAudioAnalyzer } from '../../../frontend/src/hooks/useAudioAnalyzer';

describe('useAudioAnalyzer Hook', () => {
  const mockSettings = {
    audioOutput: 'opus',
    saveFolder: '',
    filenamePrefix: 'recording',
    maxDuration: 60,
    transcriptionEnabled: true,
    transcriptionMode: 'recording' as const
  };

  it('should initialize with microphone off', () => {
    // Mock the window/navigator APIs
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
    });

    const { result } = renderHook(() => useAudioAnalyzer(mockSettings));
    
    expect(result.current.isMicOn).toBe(false);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isAgentConnected).toBe(false);
  });
});
