import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from './SettingsModal';
import { vi } from 'vitest';

describe('SettingsModal', () => {
  const mockSettings = {
    audioOutput: 'opus' as const,
    saveFolder: '',
    filenamePrefix: 'recording',
    maxDuration: 60,
    transcriptionEnabled: true,
    transcriptionMode: 'recording' as const,
    backendIp: '127.0.0.1',
    backendPort: '8000',
    backendToken: ''
  };

  const mockOnClose = vi.fn();
  const mockOnSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <SettingsModal
        isOpen={false}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );
    expect(screen.queryByText('System Configuration')).not.toBeInTheDocument();
  });

  it('renders correctly when isOpen is true', () => {
    render(
      <SettingsModal
        isOpen={true}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );
    expect(screen.getByText('System Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText('Audio Engine Output')).toBeInTheDocument();
    expect(screen.getByLabelText('Local Vault Path')).toBeInTheDocument();
    expect(screen.getByLabelText('Backend IP')).toBeInTheDocument();
  });

  it('calls onSettingsChange when inputs change', () => {
    render(
      <SettingsModal
        isOpen={true}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Change Audio Output
    const audioSelect = screen.getByLabelText('Audio Engine Output');
    fireEvent.change(audioSelect, { target: { value: 'mp3' } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith({ ...mockSettings, audioOutput: 'mp3' });

    // Change Save Folder
    const folderInput = screen.getByLabelText('Local Vault Path');
    fireEvent.change(folderInput, { target: { value: '/tmp/test' } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith({ ...mockSettings, saveFolder: '/tmp/test' });

    // Change Backend IP
    const ipInput = screen.getByLabelText('Backend IP');
    fireEvent.change(ipInput, { target: { value: '192.168.1.1' } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith({ ...mockSettings, backendIp: '192.168.1.1' });
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <SettingsModal
        isOpen={true}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // Find the X button (first button usually)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[0];
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    
    // Also test the Apply Changes button
    const applyButton = screen.getByText('Apply Changes');
    fireEvent.click(applyButton);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
