import React from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';

export interface Settings {
  audioOutput: 'opus' | 'mp3';
  saveFolder: string;
  filenamePrefix: string;
  maxDuration: number;
  transcriptionEnabled: boolean;
  transcriptionMode: 'recording' | 'continuous';
  backendIp: string;
  backendPort: string;
  backendToken: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof Settings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1100,
      backdropFilter: 'blur(10px)'
    }}>
      <div className="glass-card" style={{
        padding: '2rem', width: '90%', maxWidth: '500px', position: 'relative',
        background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)'
          }}
        >
          <X size={24} />
        </button>

        <h2 className="section-title" style={{ color: 'var(--accent-primary)' }}>
          <SettingsIcon size={20} /> System Configuration
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
          <div>
            <label htmlFor="audio-output" className="field-label">Audio Engine Output</label>
            <select
              id="audio-output"
              value={settings.audioOutput}
              onChange={(e) => handleChange('audioOutput', e.target.value)}
              className="select-input"
            >
              <option value="opus">Opus (Optimized for Web)</option>
              <option value="mp3">MP3 (Universal Compatibility)</option>
            </select>
          </div>

          <div>
            <label htmlFor="save-folder" className="field-label">Local Vault Path</label>
            <input
              id="save-folder"
              type="text"
              value={settings.saveFolder}
              onChange={(e) => handleChange('saveFolder', e.target.value)}
              placeholder="/home/curt/recordings"
              className="select-input"
            />
          </div>

          <div>
            <label htmlFor="max-duration" className="field-label">Recording Timeout (Min)</label>
            <input
              id="max-duration"
              type="number"
              min="1"
              value={settings.maxDuration}
              onChange={(e) => handleChange('maxDuration', parseInt(e.target.value) || 60)}
              className="select-input"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input
              type="checkbox"
              id="enable-trans"
              checked={settings.transcriptionEnabled}
              onChange={(e) => handleChange('transcriptionEnabled', e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)', width: '20px', height: '20px' }}
            />
            <label htmlFor="enable-trans" className="field-label" style={{ margin: 0, textTransform: 'none' }}>
              Enable Real-time Transcription
            </label>
          </div>

          <div>
            <label htmlFor="backend-ip" className="field-label">Backend IP</label>
            <input
              id="backend-ip"
              type="text"
              value={settings.backendIp}
              onChange={(e) => handleChange('backendIp', e.target.value)}
              placeholder="127.0.0.1"
              className="select-input"
            />
          </div>

          <div>
            <label htmlFor="backend-port" className="field-label">Backend Port</label>
            <input
              id="backend-port"
              type="text"
              value={settings.backendPort}
              onChange={(e) => handleChange('backendPort', e.target.value)}
              placeholder="8008"
              className="select-input"
            />
          </div>

          <div>
            <label htmlFor="backend-token" className="field-label">Backend Token</label>
            <input
              id="backend-token"
              type="password"
              value={settings.backendToken}
              onChange={(e) => handleChange('backendToken', e.target.value)}
              placeholder="Optional Bearer Token"
              className="select-input"
            />
          </div>
        </div>
        
        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>Apply Changes</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
