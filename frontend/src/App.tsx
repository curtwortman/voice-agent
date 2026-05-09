import { useState } from 'react'
import { 
  Mic, Activity, Brain, Bot, 
  X, Copy, Download, Volume2, 
  Zap, 
  Code, Terminal, ChevronDown, Maximize2, PlayCircle, Upload
} from 'lucide-react'
import './index.css'
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer'
import Visualizer from './components/Visualizer'
import SettingsModal, { Settings } from './components/SettingsModal'

type ViewType = 'stt' | 'tts' | 'agent' | 'intelligence';
type SubView = 'flux' | 'nova';

function Toggle({ active, onClick }: { active: boolean, onClick: () => void }) {
  return (
    <div className={`toggle-switch ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="toggle-knob" />
    </div>
  )
}

function App() {
  const [view, setView] = useState<ViewType>('stt');
  const [subView, setSubView] = useState<SubView>('flux');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false); // Default to minimized
  
  const [features, setFeatures] = useState([
    { id: 'smart_format', name: 'Smart Format', enabled: true },
    { id: 'punctuation', name: 'Punctuation', enabled: true },
    { id: 'diarization', name: 'Diarization', enabled: false },
    { id: 'profanity_filter', name: 'Profanity Filter', enabled: false },
    { id: 'summarize', name: 'Summarize', enabled: true },
  ]);

  const [settings, setSettings] = useState<Settings>({
    audioOutput: 'opus',
    saveFolder: '',
    filenamePrefix: 'recording',
    maxDuration: 60,
    transcriptionEnabled: true,
    transcriptionMode: 'recording'
  });

  const { isMicOn, transcription, toggleMic, getAudioData } = useAudioAnalyzer(settings);

  const getRequestJson = () => JSON.stringify({ model: "nova-3", language: "en", smart_format: true }, null, 2);

  return (
    <div className={`app-wrapper ${isMaximized ? 'full-view' : ''}`} style={{ display: 'block' }}>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {!isMaximized ? (
        /* --- MINIMIZED MODAL VIEW (DEFAULT) --- */
        <div className="minimized-modal">
          <div className="modal-header">
            <div className="compact-tabs" style={{ margin: 0, padding: 0 }}>
               <button className={`compact-tab ${view === 'stt' ? 'active' : ''}`} onClick={() => setView('stt')}>
                  <Zap size={16} /> Speech to Text
               </button>
               <button className={`compact-tab ${view === 'tts' ? 'active' : ''}`} onClick={() => setView('tts')}>
                  <Volume2 size={16} /> Text to Speech
               </button>
               <button className={`compact-tab ${view === 'agent' ? 'active' : ''}`} onClick={() => setView('agent')}>
                  <Bot size={16} /> Voice Agent
               </button>
               <button className={`compact-tab ${view === 'intelligence' ? 'active' : ''}`} onClick={() => setView('intelligence')}>
                  <Brain size={16} /> Audio Intelligence
               </button>
            </div>
            <button className="maximize-btn" onClick={() => setIsMaximized(true)}>
               <Maximize2 size={14} /> Full Playground
            </button>
          </div>

          {view === 'stt' && (
            <>
              <div className="sub-tabs">
                <div className={`sub-tab ${subView === 'flux' ? 'active' : ''}`} onClick={() => setSubView('flux')}>Flux: Voice Agents</div>
                <div className={`sub-tab ${subView === 'nova' ? 'active' : ''}`} onClick={() => setSubView('nova')}>Nova: Transcription</div>
              </div>
              
              <div className="compact-layout">
                <div className="speak-container">
                   <button className={`speak-btn-large ${isMicOn ? 'active' : ''}`} onClick={toggleMic}>
                      <Mic size={48} />
                      <span style={{ marginTop: '0.8rem', fontWeight: 600, fontSize: '0.9rem' }}>Speak</span>
                   </button>
                   
                   {subView === 'nova' && (
                     <div style={{ width: '100%', marginTop: '1rem' }}>
                        <div className="select-input" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span>English</span>
                           <ChevronDown size={14} />
                        </div>
                        <div className="divider-or">
                           <div className="divider-line" /> <span>OR</span> <div className="divider-line" />
                        </div>
                        <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}>
                           <Upload size={14} /> Use Your Own File
                        </button>
                     </div>
                   )}

                   <div style={{ width: '100%', height: '60px', marginTop: 'auto' }}>
                      <Visualizer getAudioData={getAudioData} isMicOn={isMicOn} isDemoPlaying={false} />
                   </div>
                </div>

                <div className="text-area-container">
                  <div className="text-area-content">
                    {transcription || (
                      <div style={{ color: 'var(--text-dim)' }}>
                        {subView === 'flux' 
                          ? "Start a conversation. Flux detects the language and knows when you're done speaking."
                          : "Start speaking or upload audio. Select from 50+ languages to change transcription. Your text appears in real time."
                        }
                        <br/><br/>
                        <span style={{ fontSize: '0.85rem' }}>Flux supports: English, Spanish, German, French, Hindi, Russian, Portuguese, Japanese, Italian, Dutch</span>
                      </div>
                    )}
                  </div>
                  <div className="text-area-footer">
                    <div className="footer-action"><Copy size={16} /> Copy</div>
                    <div className="footer-action"><Download size={16} /> Download</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {view === 'tts' && (
              <div className="compact-layout" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                  <div className="text-area-container">
                      <div className="text-area-content" style={{ color: 'var(--text-secondary)' }}>
                        Ready to hear it in action? Type or paste any text here to try it out.
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 'auto' }}>70 / 1,000</div>
                  </div>
                  <div>
                      <div className="chip-group" style={{ marginBottom: '1.5rem' }}>
                          <div className="chip">Healthcare</div><div className="chip">Finance</div>
                          <div className="chip">Support</div><div className="chip">Sales</div>
                      </div>
                      <div className="voice-list" style={{ maxHeight: '200px' }}>
                          <div className="voice-item active"><div className="avatar-mini" /> <PlayCircle size={14} /> Thalia <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>Eng (US)</span></div>
                          <div className="voice-item"><div className="avatar-mini" /> <PlayCircle size={14} /> Odysseus</div>
                          <div className="voice-item"><div className="avatar-mini" /> <PlayCircle size={14} /> Harmonia</div>
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', height: '48px', justifyContent: 'center' }}>
                         <PlayCircle size={18} /> Generate
                      </button>
                  </div>
              </div>
          )}

          {view === 'intelligence' && (
              <div className="compact-layout" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
                  <div className="analysis-menu">
                      <div style={{ marginBottom: '1.5rem' }}>
                         <span className="field-label">Call Center: Customer Support</span>
                         <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                            <PlayCircle size={20} />
                            <div style={{ flex: 1, height: '4px', background: '#333', borderRadius: '2px' }}>
                               <div style={{ width: '30%', height: '100%', background: '#13ef95', borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem' }}>01:44</span>
                         </div>
                      </div>
                      <button className="analysis-btn active">Summarization</button>
                      <button className="analysis-btn">Sentiment Analysis</button>
                      <button className="analysis-btn">Intent Detection</button>
                  </div>
                  <div className="text-area-container">
                      <div style={{ marginBottom: '1.5rem' }}>
                        <span style={{ color: '#13ef95', fontWeight: 600 }}>Summary:</span> The customer calls to change their payment info before renewal.
                      </div>
                      <div style={{ flex: 1, borderTop: '1px solid #222', paddingTop: '1rem' }}>
                        <span className="field-label">Transcript</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>Hi. Thank you for calling... My name is Ali...</p>
                      </div>
                  </div>
              </div>
          )}

          {view === 'agent' && (
              <div className="compact-layout" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
                  <div className="speak-container">
                      <div style={{ width: '220px', height: '220px', borderRadius: '50%', border: '2px solid #13ef95', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'pointer' }}>
                         <span style={{ color: '#13ef95', fontWeight: 600 }}>Click here to<br/>talk to me</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Built with Deepgram APIs</span>
                  </div>
                  <div>
                      <div className="chip-group" style={{ marginBottom: '1.5rem' }}>
                         <div className="avatar-mini" /><div className="avatar-mini" /><div className="avatar-mini" />
                      </div>
                      <div className="text-area-container" style={{ minHeight: '180px' }}>
                         <p style={{ color: '#fff' }}>Hey there! Ready to see the Voice Agent in action? Just click the orb to get started.</p>
                      </div>
                  </div>
              </div>
          )}
        </div>
      ) : (
        /* --- MAXIMIZED PLAYGROUND VIEW --- */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
          <nav style={{ height: '60px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 1.5rem', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Activity size={24} color="#ff33cc" onClick={() => setIsMaximized(false)} style={{ cursor: 'pointer' }} />
              <div className="compact-tabs" style={{ margin: 0, padding: 0 }}>
                <button className={`compact-tab ${view === 'stt' ? 'active' : ''}`} onClick={() => setView('stt')}>Listen</button>
                <button className={`compact-tab ${view === 'tts' ? 'active' : ''}`} onClick={() => setView('tts')}>Speak</button>
                <button className={`compact-tab ${view === 'intelligence' ? 'active' : ''}`} onClick={() => setView('intelligence')}>Analyze</button>
              </div>
            </div>
            <X size={20} color="var(--text-dim)" onClick={() => setIsMaximized(false)} style={{ cursor: 'pointer' }} />
          </nav>
          <div className="playground-grid">
            <aside className="playground-sidebar">
              <div className="sidebar-section">
                <h4>Features</h4>
                {features.map(f => (
                  <div key={f.id} className="feature-toggle" onClick={() => setFeatures(features.map(x => x.id === f.id ? {...x, enabled: !x.enabled} : x))}>
                    <span>{f.name}</span>
                    <Toggle active={f.enabled} onClick={() => {}} />
                  </div>
                ))}
              </div>
            </aside>
            <div className="panel">
              <div className="panel-header"><span><Terminal size={14} /> REQUEST</span></div>
              <div className="panel-content">
                <div className="speak-container" style={{ minHeight: '250px', marginBottom: '2rem' }}>
                   <button className={`speak-btn-large ${isMicOn ? 'active' : ''}`} onClick={toggleMic} style={{ width: '140px', height: '140px' }}>
                      <Mic size={32} />
                   </button>
                   <div style={{ width: '100%', height: '50px' }}><Visualizer getAudioData={getAudioData} isMicOn={isMicOn} isDemoPlaying={false} /></div>
                </div>
                <div className="code-block" style={{ background: '#000' }}><pre>{getRequestJson()}</pre></div>
              </div>
            </div>
            <div className="panel" style={{ borderRight: 'none' }}>
              <div className="panel-header"><span><Code size={14} /> RESPONSE</span></div>
              <div className="panel-content">
                <p style={{ fontSize: '1rem', color: transcription ? '#fff' : 'var(--text-dim)', marginBottom: '2rem' }}>{transcription || "Transcription..."}</p>
                <div className="code-block" style={{ background: '#000' }}><pre>{JSON.stringify({ status: "200 OK", data: { transcript: transcription } }, null, 2)}</pre></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
