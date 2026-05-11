import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the Visualizer component
vi.mock('../components/Visualizer', () => ({
  default: () => <div data-testid="visualizer-mock">Visualizer</div>
}));

// Mock useAudioAnalyzer hook
const mockToggleMic = vi.fn();
const mockToggleRecording = vi.fn();
const mockTogglePlayback = vi.fn();
const mockGetAudioData = vi.fn();
const mockGetOutputAudioData = vi.fn();

vi.mock('../hooks/useAudioAnalyzer', () => ({
  useAudioAnalyzer: () => ({
    isMicOn: false,
    isRecording: false,
    isRecordingPlaying: false,
    transcription: '',
    isTranscribing: false,
    toggleMic: mockToggleMic,
    toggleRecording: mockToggleRecording,
    togglePlayback: mockTogglePlayback,
    getAudioData: mockGetAudioData,
    getOutputAudioData: mockGetOutputAudioData,
    isAgentConnected: false,
    toggleAgent: vi.fn(),
    agentMessages: []
  })
}));

describe('Settings Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      })
    ) as unknown as typeof fetch;

    global.URL.createObjectURL = vi.fn();
    global.Audio = vi.fn().mockImplementation(() => ({ play: vi.fn() }));
  });

  it('opens settings modal when settings button is clicked', () => {
    render(<App />);

    const settingsButtons = screen.getAllByTitle('Settings');
    fireEvent.click(settingsButtons[0]);

    expect(screen.getByText('System Configuration')).toBeInTheDocument();
  });

  it('closes settings modal when Apply Changes is clicked', () => {
    render(<App />);

    const settingsButtons = screen.getAllByTitle('Settings');
    fireEvent.click(settingsButtons[0]);
    expect(screen.getByText('System Configuration')).toBeInTheDocument();

    const applyButton = screen.getByText('Apply Changes');
    fireEvent.click(applyButton);

    expect(screen.queryByText('System Configuration')).not.toBeInTheDocument();
  });

  it('changes max duration in settings', () => {
    render(<App />);

    const settingsButtons = screen.getAllByTitle('Settings');
    fireEvent.click(settingsButtons[0]);

    const durationInputs = screen.getAllByRole('spinbutton');
    const durationInput = durationInputs[0] as HTMLInputElement;
    fireEvent.change(durationInput, { target: { value: '30' } });

    expect(durationInput.value).toBe('30');
  });

  it('toggles transcription enabled in settings', () => {
    render(<App />);

    const settingsButtons = screen.getAllByTitle('Settings');
    fireEvent.click(settingsButtons[0]);

    const transcriptionCheckbox = screen.getByLabelText('Enable Real-time Transcription') as HTMLInputElement;
    const initialValue = transcriptionCheckbox.checked;

    fireEvent.click(transcriptionCheckbox);

    expect(transcriptionCheckbox.checked).toBe(!initialValue);
  });
});
