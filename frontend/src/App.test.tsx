import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { vi } from 'vitest';

// Mock the Visualizer since it uses Canvas and AudioContext which are hard to test in jsdom
vi.mock('./components/Visualizer', () => ({
  default: () => <div data-testid="visualizer-mock">Visualizer</div>
}));

// Mock useAudioAnalyzer hook to avoid real audio/websocket logic
vi.mock('./hooks/useAudioAnalyzer', () => ({
  useAudioAnalyzer: () => ({
    isMicOn: false,
    isRecording: false,
    isRecordingPlaying: false,
    transcription: '',
    isTranscribing: false,
    toggleMic: vi.fn(),
    toggleRecording: vi.fn(),
    togglePlayback: vi.fn(),
    getAudioData: vi.fn(),
    getOutputAudioData: vi.fn()
  })
}));

describe('App', () => {
  it('renders main controls', () => {
    render(<App />);

    // Check for buttons by title
    expect(screen.getByTitle('Turn Mic On')).toBeInTheDocument();
    expect(screen.getByTitle('Start Recording')).toBeInTheDocument();
    expect(screen.getByTitle('Play Recording')).toBeInTheDocument();
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
  });

  it('opens settings modal when settings button is clicked', () => {
    render(<App />);

    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Save Folder (Server Path)')).toBeInTheDocument();
  });
});
