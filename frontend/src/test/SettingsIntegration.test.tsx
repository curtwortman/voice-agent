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
    getOutputAudioData: mockGetOutputAudioData
  })
}));

describe('Settings Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens settings modal when settings button is clicked', () => {
    render(<App />);

    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Audio Output Format')).toBeInTheDocument();
  });

  it('closes settings modal when X button is clicked', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Close settings
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => btn.querySelector('svg')); // X button has SVG
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('changes audio output format in settings', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Change audio output
    const audioOutputSelect = screen.getByLabelText('Audio Output Format') as HTMLSelectElement;
    fireEvent.change(audioOutputSelect, { target: { value: 'mp3' } });

    expect(audioOutputSelect.value).toBe('mp3');
  });

  it('changes save folder in settings', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Change save folder
    const saveFolderInput = screen.getByLabelText('Save Folder (Server Path)') as HTMLInputElement;
    fireEvent.change(saveFolderInput, { target: { value: '/home/user/recordings' } });

    expect(saveFolderInput.value).toBe('/home/user/recordings');
  });

  it('changes filename prefix in settings', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Change filename prefix
    const prefixInput = screen.getByLabelText('Filename Prefix') as HTMLInputElement;
    fireEvent.change(prefixInput, { target: { value: 'my_recording' } });

    expect(prefixInput.value).toBe('my_recording');
  });

  it('changes max duration in settings', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Change max duration
    const durationInput = screen.getByLabelText('Max Recording Duration (Minutes)') as HTMLInputElement;
    fireEvent.change(durationInput, { target: { value: '30' } });

    expect(durationInput.value).toBe('30');
  });

  it('toggles transcription enabled in settings', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Toggle transcription
    const transcriptionCheckbox = screen.getByLabelText('Enable Transcription') as HTMLInputElement;
    const initialValue = transcriptionCheckbox.checked;

    fireEvent.click(transcriptionCheckbox);

    expect(transcriptionCheckbox.checked).toBe(!initialValue);
  });

  it('shows transcription mode when transcription is enabled', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Ensure transcription is enabled
    const transcriptionCheckbox = screen.getByLabelText('Enable Transcription') as HTMLInputElement;
    if (!transcriptionCheckbox.checked) {
      fireEvent.click(transcriptionCheckbox);
    }

    // Check that transcription mode is visible
    expect(screen.getByLabelText('Transcription Mode')).toBeInTheDocument();
  });

  it('hides transcription mode when transcription is disabled', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Disable transcription
    const transcriptionCheckbox = screen.getByLabelText('Enable Transcription') as HTMLInputElement;
    if (transcriptionCheckbox.checked) {
      fireEvent.click(transcriptionCheckbox);
    }

    // Check that transcription mode is NOT visible
    expect(screen.queryByLabelText('Transcription Mode')).not.toBeInTheDocument();
  });

  it('changes transcription mode in settings', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Ensure transcription is enabled
    const transcriptionCheckbox = screen.getByLabelText('Enable Transcription') as HTMLInputElement;
    if (!transcriptionCheckbox.checked) {
      fireEvent.click(transcriptionCheckbox);
    }

    // Change transcription mode
    const transcriptionModeSelect = screen.getByLabelText('Transcription Mode') as HTMLSelectElement;
    fireEvent.change(transcriptionModeSelect, { target: { value: 'continuous' } });

    expect(transcriptionModeSelect.value).toBe('continuous');
  });

  it('persists settings after closing and reopening modal', () => {
    render(<App />);

    // Open settings
    let settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Change a setting
    const prefixInput = screen.getByLabelText('Filename Prefix') as HTMLInputElement;
    fireEvent.change(prefixInput, { target: { value: 'test_prefix' } });
    expect(prefixInput.value).toBe('test_prefix');

    // Close settings
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => btn.querySelector('svg'));
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    // Reopen settings
    settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Verify setting is persisted
    const prefixInputAgain = screen.getByLabelText('Filename Prefix') as HTMLInputElement;
    expect(prefixInputAgain.value).toBe('test_prefix');
  });
});
