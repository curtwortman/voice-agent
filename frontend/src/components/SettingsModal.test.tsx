import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal, { Settings } from './SettingsModal';
import { vi } from 'vitest';

describe('SettingsModal', () => {
  const mockSettings: Settings = {
    audioOutput: 'opus',
    saveFolder: '',
    filenamePrefix: 'recording',
    maxDuration: 60,
    transcriptionEnabled: true,
    transcriptionMode: 'recording'
  };

  const mockOnClose = vi.fn();
  const mockOnSettingsChange = vi.fn();

  it('does not render when isOpen is false', () => {
    render(
      <SettingsModal
        isOpen={false}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
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
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Audio Output Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Save Folder (Server Path)')).toBeInTheDocument();
    expect(screen.getByLabelText('Filename Prefix')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Recording Duration (Minutes)')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Transcription')).toBeChecked();
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

    // Change Save Folder
    const folderInput = screen.getByLabelText('Save Folder (Server Path)');
    fireEvent.change(folderInput, { target: { value: '/tmp/test' } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith({ ...mockSettings, saveFolder: '/tmp/test' });

    // Change Filename Prefix
    const prefixInput = screen.getByLabelText('Filename Prefix');
    fireEvent.change(prefixInput, { target: { value: 'my_rec' } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith({ ...mockSettings, filenamePrefix: 'my_rec' });

    // Change Duration
    const durationInput = screen.getByLabelText('Max Recording Duration (Minutes)');
    fireEvent.change(durationInput, { target: { value: '30' } });
    expect(mockOnSettingsChange).toHaveBeenCalledWith({ ...mockSettings, maxDuration: 30 });
  });

  it('calls onClose when X button is clicked', () => {
    render(
      <SettingsModal
        isOpen={true}
        onClose={mockOnClose}
        settings={mockSettings}
        onSettingsChange={mockOnSettingsChange}
      />
    );

    // X button is an icon, but it's inside a button.
    // We can find it by role 'button' and picking the first one (since it's top-right)
    // Or better, add an aria-label to the close button in the component.
    // For now, let's assume it's the first button.
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
