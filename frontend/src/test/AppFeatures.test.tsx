import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the Visualizer component
vi.mock('../components/Visualizer', () => ({
  default: () => <div data-testid="visualizer-mock">Visualizer</div>
}));

// Mock useAudioAnalyzer hook with controllable state
let mockState = {
  isMicOn: false,
  isRecording: false,
  isRecordingPlaying: false,
  transcription: '',
  isTranscribing: false
};

const mockToggleMic = vi.fn(() => {
  mockState.isMicOn = !mockState.isMicOn;
});

const mockToggleRecording = vi.fn(() => {
  mockState.isRecording = !mockState.isRecording;
});

const mockTogglePlayback = vi.fn(() => {
  mockState.isRecordingPlaying = !mockState.isRecordingPlaying;
});

const mockGetAudioData = vi.fn();
const mockGetOutputAudioData = vi.fn();

vi.mock('../hooks/useAudioAnalyzer', () => ({
  useAudioAnalyzer: () => ({
    isMicOn: mockState.isMicOn,
    isRecording: mockState.isRecording,
    isRecordingPlaying: mockState.isRecordingPlaying,
    transcription: mockState.transcription,
    isTranscribing: mockState.isTranscribing,
    toggleMic: mockToggleMic,
    toggleRecording: mockToggleRecording,
    togglePlayback: mockTogglePlayback,
    getAudioData: mockGetAudioData,
    getOutputAudioData: mockGetOutputAudioData
  })
}));

describe('App Features Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      isMicOn: false,
      isRecording: false,
      isRecordingPlaying: false,
      transcription: '',
      isTranscribing: false
    };
  });

  describe('Mic Control', () => {
    it('renders mic button with correct title', () => {
      render(<App />);
      expect(screen.getByTitle('Turn Mic On')).toBeInTheDocument();
    });

    it('calls toggleMic when mic button is clicked', () => {
      render(<App />);
      const micButton = screen.getByTitle('Turn Mic On');
      fireEvent.click(micButton);
      expect(mockToggleMic).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recording Control', () => {
    it('renders recording button with correct title', () => {
      render(<App />);
      expect(screen.getByTitle('Start Recording')).toBeInTheDocument();
    });

    it('calls toggleRecording when recording button is clicked', () => {
      mockState.isMicOn = true; // Enable mic first
      render(<App />);
      const recordButton = screen.getByTitle('Start Recording');
      fireEvent.click(recordButton);
      expect(mockToggleRecording).toHaveBeenCalledTimes(1);
    });

    it('disables recording button when mic is off', () => {
      mockState.isMicOn = false;
      render(<App />);
      const recordButton = screen.getByTitle('Start Recording') as HTMLButtonElement;
      expect(recordButton.disabled).toBe(true);
    });
  });

  describe('Playback Control', () => {
    it('renders playback button with correct title', () => {
      render(<App />);
      expect(screen.getByTitle('Play Recording')).toBeInTheDocument();
    });

    it('calls togglePlayback when playback button is clicked', () => {
      render(<App />);
      const playButton = screen.getByTitle('Play Recording');
      fireEvent.click(playButton);
      expect(mockTogglePlayback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Settings Button', () => {
    it('renders settings button', () => {
      render(<App />);
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });
  });

  describe('Visualizer', () => {
    it('renders visualizer component', () => {
      render(<App />);
      expect(screen.getByTestId('visualizer-mock')).toBeInTheDocument();
    });
  });

  describe('Transcription Display', () => {
    it('shows placeholder when no transcription', () => {
      mockState.transcription = '';
      render(<App />);
      expect(screen.getByText('Transcription will appear here...')).toBeInTheDocument();
    });

    it('shows transcription text when available', () => {
      mockState.transcription = 'This is a test transcription';
      render(<App />);
      expect(screen.getByText('This is a test transcription')).toBeInTheDocument();
    });

    it('shows transcribing indicator when transcribing', () => {
      mockState.isTranscribing = true;
      render(<App />);
      expect(screen.getByText('Transcribing...')).toBeInTheDocument();
    });

    it('hides transcribing indicator when not transcribing', () => {
      mockState.isTranscribing = false;
      render(<App />);
      expect(screen.queryByText('Transcribing...')).not.toBeInTheDocument();
    });
  });

  describe('Control Panel', () => {
    it('renders all control buttons', () => {
      render(<App />);

      expect(screen.getByTitle('Turn Mic On')).toBeInTheDocument();
      expect(screen.getByTitle('Start Recording')).toBeInTheDocument();
      expect(screen.getByTitle('Play Recording')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('has 4 control buttons', () => {
      const { container } = render(<App />);
      const controlPanel = container.querySelector('.control-panel');
      const buttons = controlPanel?.querySelectorAll('button');
      expect(buttons?.length).toBe(4);
    });
  });
});
