import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    getOutputAudioData: vi.fn(),
    isAgentConnected: false,
    toggleAgent: vi.fn(),
    agentMessages: []
  })
}));

describe('App Connection Settings', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      })
    ) as any;

    global.URL.createObjectURL = vi.fn();
    global.Audio = class {
      play = vi.fn();
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens settings modal and updates backend connection', async () => {
    render(<App />);

    // Open settings (there are two, one in minimized, one in maximized, we can select the first)
    const settingsButtons = screen.getAllByTitle('Settings');
    fireEvent.click(settingsButtons[0]);

    expect(screen.getByText('System Configuration')).toBeInTheDocument();
    
    // Check for IP, Port, Token fields
    const ipInput = screen.getByPlaceholderText('127.0.0.1');
    const portInput = screen.getByPlaceholderText('8000');
    const tokenInput = screen.getByPlaceholderText('Optional Bearer Token');

    expect(ipInput).toHaveValue('127.0.0.1');
    expect(portInput).toHaveValue('8000');
    expect(tokenInput).toHaveValue('');

    // Update IP and Port
    fireEvent.change(ipInput, { target: { value: '192.168.1.100' } });
    fireEvent.change(portInput, { target: { value: '9000' } });
    fireEvent.change(tokenInput, { target: { value: 'secret-token' } });

    // Close settings
    fireEvent.click(screen.getByText('Apply Changes'));

    // Now test that fetch uses the new settings.
    // Switch to TTS view to trigger generate
    const ttsTab = screen.getByText('Text to Speech');
    fireEvent.click(ttsTab);

    // Enter text
    const textarea = screen.getByPlaceholderText('Ready to hear it in action? Type or paste any text here to try it out.');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    // Click Generate
    const generateBtn = screen.getByText('Generate');
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:9000/v1/audio/speech',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer secret-token'
          })
        })
      );
    });
  });
});
