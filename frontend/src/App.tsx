import { useState, useEffect } from 'react'
import { 
  Mic, Activity, Brain, Bot, 
  X, Copy, Download, Volume2, 
  Zap, Settings as SettingsIcon,
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
  const [activeAnalysis, setActiveAnalysis] = useState('summarization');
  const [activeChip, setActiveChip] = useState('Healthcare');
  const [activeVoice, setActiveVoice] = useState('Thalia');
  const [isMaximized, setIsMaximized] = useState(false); // Default to minimized
  
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTranscript, setActiveTranscript] = useState("Hi. Thank you for calling... My name is Ali... I'm calling because I want to change my payment information before the renewal date next month.");
  
  const [botPrompt, setBotPrompt] = useState("");
  const [latency] = useState<number | null>(null);
  const [isPromptSaving, setIsPromptSaving] = useState(false);
  const [features, setFeatures] = useState([
    { id: 'smart_format', name: 'Smart Format', enabled: true },
    { id: 'punctuation', name: 'Punctuation', enabled: true },
    { id: 'low_latency', name: 'Ultra Low Latency', enabled: true },
    { id: 'interrupt', name: 'Allow Interruptions', enabled: true },
  ]);

  const [settings, setSettings] = useState<Settings>({
    audioOutput: 'opus',
    saveFolder: '',
    filenamePrefix: 'recording',
    maxDuration: 60,
    transcriptionEnabled: true,
    transcriptionMode: 'continuous',
    backendIp: '127.0.0.1',
    backendPort: '8008',
    backendToken: ''
  });

  const { isMicOn, transcription, toggleMic, getAudioData, isAgentConnected, toggleAgent, agentMessages } = useAudioAnalyzer(settings);
  useEffect(() => {
    fetchBotPrompt();
  }, [settings.backendIp, settings.backendPort]);

  const fetchBotPrompt = async () => {
    try {
      const apiBase = `${settings.backendIp}:${settings.backendPort}`;
      const response = await fetch(`${window.location.protocol}//${apiBase}/v1/agent/prompt`);
      if (response.ok) {
        const data = await response.json();
        setBotPrompt(data.prompt);
      }
    } catch (e) {
      console.error("Failed to fetch bot prompt:", e);
    }
  };

  const handleSavePrompt = async (newPrompt: string) => {
    setBotPrompt(newPrompt);
    setIsPromptSaving(true);
    try {
      const apiBase = `${settings.backendIp}:${settings.backendPort}`;
      const response = await fetch(`${window.location.protocol}//${apiBase}/v1/agent/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: newPrompt })
      });
      if (response.ok) {
        console.log("Prompt saved to server.");
      }
    } catch (e) {
      console.error("Failed to save bot prompt:", e);
    } finally {
      setIsPromptSaving(false);
    }
  };

  const [ttsText, setTtsText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTTS = async () => {
    if (!ttsText) return;
    setIsGenerating(true);
    try {
      const apiBase = `${settings.backendIp}:${settings.backendPort}`;
      const tokenHeader: Record<string, string> = settings.backendToken ? { "Authorization": `Bearer ${settings.backendToken}` } : {};
      const response = await fetch(`${window.location.protocol}//${apiBase}/v1/audio/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader },
        body: JSON.stringify({
          input: ttsText,
          model: "tts-1",
          voice: activeVoice,
          response_format: "mp3"
        })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunAnalysis = async (task: string) => {
    setActiveAnalysis(task);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const apiBase = `${settings.backendIp}:${settings.backendPort}`;
      const tokenHeader: Record<string, string> = settings.backendToken ? { "Authorization": `Bearer ${settings.backendToken}` } : {};
      const response = await fetch(`${window.location.protocol}//${apiBase}/v1/audio/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader },
        body: JSON.stringify({
          transcript: activeTranscript,
          task: task
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data.analysis);
      }
    } catch(e) {
      console.error(e);
      setAnalysisResult("Analysis failed. Please check backend connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
        /* --- SLIDEBOX VIEW (DEFAULT) --- */
        <div className="mx-auto max-w-5xl px-4 w-full mt-12 mb-12">
          <div className="relative rounded-xl border border-gray-800 p-6 bg-[#0d0d0d] shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
            <div className="pointer-events-none absolute inset-0 z-0 rounded-xl p-px bg-gradient-to-br from-white/10 to-transparent" style={{ WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div className="-mx-0.5 -my-1 w-full overflow-x-auto px-0.5 py-1 hide-scrollbar">
                  <div className="flex min-w-max gap-6" role="tablist">
                    <button role="tab" className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${view === 'stt' ? 'border-[#13ef95] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`} onClick={() => setView('stt')}>
                      <Zap size={18} className={view === 'stt' ? 'text-[#13ef95]' : ''} /> Speech to Text
                    </button>
                    <button role="tab" className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${view === 'tts' ? 'border-[#13ef95] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`} onClick={() => setView('tts')}>
                      <Volume2 size={18} className={view === 'tts' ? 'text-[#13ef95]' : ''} /> Text to Speech
                    </button>
                    <button role="tab" className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${view === 'agent' ? 'border-[#13ef95] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`} onClick={() => setView('agent')}>
                      <Bot size={18} className={view === 'agent' ? 'text-[#13ef95]' : ''} /> Voice Agent
                    </button>
                    <button role="tab" className={`flex items-center gap-2 pb-2 border-b-2 transition-colors ${view === 'intelligence' ? 'border-[#13ef95] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`} onClick={() => setView('intelligence')}>
                      <Brain size={18} className={view === 'intelligence' ? 'text-[#13ef95]' : ''} /> Audio Intelligence
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <button className="flex items-center justify-center bg-[#1a1a1a] border border-white/10 w-9 h-9 rounded-lg text-gray-500 hover:text-white hover:border-white transition-colors" onClick={() => setIsSettingsOpen(true)} title="Settings">
                    <SettingsIcon size={16} />
                  </button>
                  <button className="flex items-center justify-center bg-[#1a1a1a] border border-white/10 w-9 h-9 rounded-lg text-gray-500 hover:text-white hover:border-white transition-colors" onClick={() => setIsMaximized(true)} title="Full Playground">
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>

          {view === 'stt' && (
            <>
              <div className="sub-tabs">
                <div className={`sub-tab ${subView === 'flux' ? 'active' : ''}`} onClick={() => setSubView('flux')}>Flux: Voice Agents</div>
                <div className={`sub-tab ${subView === 'nova' ? 'active' : ''}`} onClick={() => setSubView('nova')}>Nova: Transcription</div>
              </div>
              
              <div className="compact-layout">
                <div className="speak-container">
                   <button className={`speak-btn-large ${isMicOn ? 'active' : ''}`} onClick={toggleMic} title={isMicOn ? "Turn Mic Off" : "Turn Mic On"}>
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
                    <div className="footer-action" onClick={() => { navigator.clipboard.writeText(transcription || ''); }}><Copy size={16} /> Copy</div>
                    <div className="footer-action" onClick={() => { const blob = new Blob([transcription || ''], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'transcription.txt'; a.click(); URL.revokeObjectURL(url); }}><Download size={16} /> Download</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {view === 'tts' && (
              <div className="compact-layout" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                  <div className="text-area-container flex flex-col">
                      <textarea 
                        className="w-full h-full bg-transparent border-none outline-none text-white resize-none" 
                        placeholder="Ready to hear it in action? Type or paste any text here to try it out."
                        value={ttsText}
                        onChange={(e) => setTtsText(e.target.value)}
                      />
                      <div className="text-xs text-gray-500 mt-auto">{ttsText.length} / 1,000</div>
                  </div>
                  <div>
                      <div className="chip-group" style={{ marginBottom: '1.5rem' }}>
                          <div className={`chip ${activeChip === 'Healthcare' ? 'active' : ''}`} onClick={() => setActiveChip('Healthcare')}>Healthcare</div>
                          <div className={`chip ${activeChip === 'Finance' ? 'active' : ''}`} onClick={() => setActiveChip('Finance')}>Finance</div>
                          <div className={`chip ${activeChip === 'Support' ? 'active' : ''}`} onClick={() => setActiveChip('Support')}>Support</div>
                          <div className={`chip ${activeChip === 'Sales' ? 'active' : ''}`} onClick={() => setActiveChip('Sales')}>Sales</div>
                      </div>
                      <div className="voice-list" style={{ maxHeight: '200px' }}>
                          <div className={`voice-item ${activeVoice === 'Thalia' ? 'active' : ''}`} onClick={() => setActiveVoice('Thalia')}><div className="avatar-mini" /> <PlayCircle size={14} /> Thalia <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>Eng (US)</span></div>
                          <div className={`voice-item ${activeVoice === 'Odysseus' ? 'active' : ''}`} onClick={() => setActiveVoice('Odysseus')}><div className="avatar-mini" /> <PlayCircle size={14} /> Odysseus</div>
                          <div className={`voice-item ${activeVoice === 'Harmonia' ? 'active' : ''}`} onClick={() => setActiveVoice('Harmonia')}><div className="avatar-mini" /> <PlayCircle size={14} /> Harmonia</div>
                      </div>
                      <button 
                        className={`btn btn-primary w-full mt-8 h-12 justify-center transition-all duration-300 hover:scale-[1.02] ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handleGenerateTTS}
                        disabled={isGenerating}
                      >
                         <PlayCircle size={18} /> {isGenerating ? 'Generating...' : 'Generate'}
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
                      <button className={`analysis-btn ${activeAnalysis === 'summarization' ? 'active' : ''} ${isAnalyzing && activeAnalysis === 'summarization' ? 'opacity-50' : ''}`} onClick={() => handleRunAnalysis('summarization')} disabled={isAnalyzing}>Summarization</button>
                      <button className={`analysis-btn ${activeAnalysis === 'sentiment' ? 'active' : ''} ${isAnalyzing && activeAnalysis === 'sentiment' ? 'opacity-50' : ''}`} onClick={() => handleRunAnalysis('sentiment')} disabled={isAnalyzing}>Sentiment Analysis</button>
                      <button className={`analysis-btn ${activeAnalysis === 'intent' ? 'active' : ''} ${isAnalyzing && activeAnalysis === 'intent' ? 'opacity-50' : ''}`} onClick={() => handleRunAnalysis('intent')} disabled={isAnalyzing}>Intent Detection</button>
                  </div>
                  <div className="text-area-container">
                      <div style={{ marginBottom: '1.5rem', minHeight: '100px' }}>
                        <span style={{ color: '#13ef95', fontWeight: 600 }}>{activeAnalysis.charAt(0).toUpperCase() + activeAnalysis.slice(1)}:</span>
                        <p style={{ marginTop: '0.5rem' }}>
                          {isAnalyzing ? "Analyzing..." : (analysisResult || "Click an analysis task to begin.")}
                        </p>
                      </div>
                      <div style={{ flex: 1, borderTop: '1px solid #222', paddingTop: '1rem' }}>
                        <span className="field-label">Transcript</span>
                        <textarea 
                          className="w-full bg-transparent border-none outline-none text-white text-xs mt-2 resize-none" 
                          rows={4}
                          value={activeTranscript}
                          onChange={(e) => setActiveTranscript(e.target.value)}
                        />
                      </div>
                  </div>
              </div>
          )}

          {view === 'agent' && (
              <div className="compact-layout" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
                  <div className="speak-container">
                      <div 
                        onClick={toggleAgent}
                        className={`w-[220px] h-[220px] rounded-full border-2 flex items-center justify-center text-center cursor-pointer transition-all duration-300 hover:scale-105 ${isAgentConnected ? 'border-[#ff33cc] shadow-[0_0_30px_#ff33cc]' : 'border-[#13ef95] shadow-[0_0_15px_#13ef95]'}`}
                      >
                         <span className={`font-semibold ${isAgentConnected ? 'text-[#ff33cc]' : 'text-[#13ef95]'}`}>
                           {isAgentConnected ? 'Agent Listening...' : 'Click here to\ntalk to me'}
                         </span>
                      </div>
                      <span className="text-xs text-gray-500 mt-4">Built with Pipecat & vLLM</span>
                  </div>
                  <div>
                      <div className="chip-group" style={{ marginBottom: '1.5rem' }}>
                         <div className="avatar-mini" /><div className="avatar-mini" /><div className="avatar-mini" />
                      </div>
                      <div className="text-area-container flex-1 overflow-y-auto" style={{ minHeight: '180px' }}>
                         {agentMessages.length === 0 ? (
                           <p className="text-gray-400">Hey there! Ready to see the Voice Agent in action? Just click the orb to get started.</p>
                         ) : (
                           <div className="space-y-2">
                             {agentMessages.map((m, idx) => (
                               <div key={idx} className={`p-2 rounded-md ${m.role === 'user' ? 'bg-[#1a1a1a] text-[#13ef95] ml-4' : 'bg-[#222] text-white mr-4'}`}>
                                 <span className="font-semibold text-xs opacity-50 block mb-1">{m.role.toUpperCase()}</span>
                                 <span>{m.content}</span>
                               </div>
                             ))}
                           </div>
                         )}
                      </div>
                  </div>
              </div>
          )}
          </div>
        </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button title="Settings" onClick={() => setIsSettingsOpen(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <SettingsIcon size={20} color="var(--text-dim)" />
              </button>
              <X size={20} color="var(--text-dim)" onClick={() => setIsMaximized(false)} style={{ cursor: 'pointer' }} />
            </div>
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
              <div className="panel-header"><span><Terminal size={14} /> REQUEST CONFIGURATION</span></div>
              <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="sidebar-section" style={{ border: 'none', padding: 0 }}>
                  <span className="field-label" style={{ marginBottom: '0.5rem', display: 'block' }}>System Prompt (Personality)</span>
                  <textarea 
                    className="code-block" 
                    style={{ background: '#000', width: '100%', height: '120px', resize: 'none', padding: '1rem', fontSize: '0.8rem', border: '1px solid #333' }}
                    value={botPrompt}
                    onChange={(e) => setBotPrompt(e.target.value)}
                    onBlur={(e) => handleSavePrompt(e.target.value)}
                  />
                  {isPromptSaving && <span className="text-[10px] text-[#13ef95] mt-1 block">Saving prompt...</span>}
                </div>

                <div className="speak-container" style={{ minHeight: '150px', borderTop: '1px solid #222', paddingTop: '1.5rem' }}>
                   <button className={`speak-btn-large ${isMicOn ? 'active' : ''}`} onClick={toggleMic} style={{ width: '100px', height: '100px' }} title={isMicOn ? "Turn Mic Off" : "Turn Mic On"}>
                      <Mic size={24} />
                   </button>
                   <div style={{ width: '100%', height: '40px' }}><Visualizer getAudioData={getAudioData} isMicOn={isMicOn} isDemoPlaying={false} /></div>
                </div>

                <div className="code-block" style={{ background: '#000', marginTop: 'auto' }}><pre>{getRequestJson()}</pre></div>
              </div>
            </div>
            <div className="panel" style={{ borderRight: 'none' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><Code size={14} /> PIPECAT RUNTIME LOGS</span>
                <span style={{ fontSize: '0.7rem', color: '#13ef95' }}>LATENCY: {latency || '--'}ms</span>
              </div>
              <div className="panel-content">
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="field-label">Real-time Transcript</span>
                  <p style={{ fontSize: '1.1rem', color: transcription ? '#fff' : 'var(--text-dim)', marginTop: '0.5rem', fontWeight: 500 }}>{transcription || "Listening for speech..."}</p>
                </div>
                
                <div className="sidebar-section" style={{ border: 'none', padding: 0 }}>
                  <span className="field-label">Pipeline Events</span>
                  <div className="code-block" style={{ background: '#000', height: '150px', overflowY: 'auto' }}>
                    <pre style={{ color: '#13ef95', fontSize: '0.7rem' }}>
                      {`[INFO] Transport: connected\n[INFO] VAD: speech_detected\n[INFO] STT: "${transcription || '...'}"\n[INFO] LLM: generating_response\n[INFO] TTS: streaming_audio`}
                    </pre>
                  </div>
                </div>

                <div className="code-block" style={{ background: '#000', marginTop: '1.5rem' }}><pre>{JSON.stringify({ status: "200 OK", data: { transcript: transcription, mode: "pipecat_orchestrator" } }, null, 2)}</pre></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
