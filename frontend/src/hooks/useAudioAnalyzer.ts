
import { useState, useRef, useCallback, useEffect } from 'react';
import { Settings } from '../components/SettingsModal';

export interface AudioData {
  frequency: Uint8Array;
  timeDomain: Uint8Array;
}

export const useAudioAnalyzer = (settings: Settings) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPlaying, setIsRecordingPlaying] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [agentMessages, setAgentMessages] = useState<{role: string, content: string}[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Mic refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const agentSocketRef = useRef<WebSocket | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Output refs
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // WebSocket Connection
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!settings.transcriptionEnabled) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const params = new URLSearchParams();
    if (settings.saveFolder) params.append('save_folder', settings.saveFolder);
    if (settings.filenamePrefix) params.append('filename_prefix', settings.filenamePrefix);
    if (settings.audioOutput) params.append('format', settings.audioOutput);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiBase = import.meta.env.VITE_API_BASE || `${window.location.host}`;
    const wsUrl = `${wsProtocol}//${apiBase}/ws/transcribe?${params.toString()}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsTranscribing(true);
    };

    socketRef.current.onmessage = (event) => {
      const text = event.data;
      setTranscription(text);
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setIsTranscribing(false);
    };

    socketRef.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsTranscribing(false);
    };
  }, [settings.transcriptionEnabled, settings.saveFolder, settings.filenamePrefix, settings.audioOutput]);

  const connectAgentWebSocket = useCallback(() => {
    if (agentSocketRef.current?.readyState === WebSocket.OPEN) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiBase = import.meta.env.VITE_API_BASE || `${window.location.host}`;
    const wsUrl = `${wsProtocol}//${apiBase}/ws/agent`;
    
    const socket = new WebSocket(wsUrl);
    agentSocketRef.current = socket;

    socket.onopen = () => {
      console.log('Agent WebSocket Connected');
      setIsAgentConnected(true);
      setAgentMessages([]);
    };

    socket.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.role && msg.content) {
             setAgentMessages(prev => [...prev, { role: msg.role, content: msg.content }]);
          }
        } catch (e) {
           console.log("Received string message from agent:", event.data);
        }
      } else if (event.data instanceof Blob) {
        // Handle incoming audio from agent
        try {
          const ctx = initAudioContext();
          const arrayBuffer = await event.data.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          
          if (!outputAnalyserRef.current) {
            outputAnalyserRef.current = ctx.createAnalyser();
            outputAnalyserRef.current.fftSize = 2048;
          }
          
          source.connect(outputAnalyserRef.current);
          outputAnalyserRef.current.connect(ctx.destination);
          source.start();
        } catch (e) {
          console.error("Error playing agent audio", e);
        }
      }
    };

    socket.onerror = (error) => {
      console.error('Agent WebSocket Error:', error);
      setIsAgentConnected(false);
    };

    socket.onclose = () => {
      console.log('Agent WebSocket Disconnected');
      setIsAgentConnected(false);
      stopAudio(); // Stop mic when agent disconnects
    };
  }, []);

  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = initAudioContext();

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // Only save to chunks if explicitly recording
          if (isRecordingRef.current) {
             chunksRef.current.push(e.data);
          }

          // Send to transcription socket
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(e.data);
          }
          // Send to agent socket
          if (agentSocketRef.current?.readyState === WebSocket.OPEN) {
            agentSocketRef.current.send(e.data);
          }
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            chunksRef.current = [];
            const url = URL.createObjectURL(blob);
            setRecordedAudioUrl(url);
            console.log("Recording saved:", url);
        }
      };

      mediaRecorderRef.current = mediaRecorder;

      // If continuous mode, start recorder immediately to stream
      if (settings.transcriptionEnabled && settings.transcriptionMode === 'continuous') {
          connectWebSocket();
          mediaRecorder.start(1000);
      }

      setIsMicOn(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsMicOn(false);
    }
  }, [settings.transcriptionEnabled, settings.transcriptionMode, connectWebSocket, isRecording]);

  // Handle isRecording change for MediaRecorder
  // We need a way to start/stop MediaRecorder if mode is NOT continuous
  // Or just use a flag?
  // Problem: startAudio is called once. isRecording changes later.
  // We need a ref for isRecording to be used inside ondataavailable?
  // Actually, state inside callback might be stale if not careful.
  // Let's use a ref for isRecording state to be safe in callbacks.
  const isRecordingRef = useRef(isRecording);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Re-bind ondataavailable if needed? No, just use ref inside.
  useEffect(() => {
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
              if (isRecordingRef.current) {
                 chunksRef.current.push(e.data);
              }
              if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(e.data);
              }
              if (agentSocketRef.current?.readyState === WebSocket.OPEN) {
                agentSocketRef.current.send(e.data);
              }
            }
          };
      }
  }, []); // Run once? Or when mediaRecorder changes?
  // Actually, mediaRecorder is created in startAudio. We should set it there.
  // But startAudio closes over the initial state.
  // Better to use the ref approach inside startAudio's definition.

  const stopAudio = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (agentSocketRef.current) {
      agentSocketRef.current.close();
      agentSocketRef.current = null;
    }

    setIsMicOn(false);
    setIsRecording(false);
    setIsTranscribing(false);
  }, [isRecordingPlaying]);

  const toggleMic = useCallback(() => {
    if (isMicOn) {
      stopAudio();
    } else {
      startAudio();
    }
  }, [isMicOn, startAudio, stopAudio]);

  const toggleRecording = useCallback(() => {
    if (!isMicOn) return;

    if (isRecording) {
      // Stop Recording
      if (settings.transcriptionMode === 'recording') {
          mediaRecorderRef.current?.stop(); // This stops the stream too
          if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
          }
      } else {
          // Continuous: Just stop saving chunks.
          // But we need to trigger 'onstop' to save the file?
          // MediaRecorder.stop() fires onstop. But then it stops capturing.
          // If we want to keep streaming, we have to restart it?
          // Or we can manually slice the chunks?
          // Simplest: Stop and Restart if continuous.
          mediaRecorderRef.current?.stop();
          // We need to restart it for continuous streaming after a brief pause?
          // This might interrupt transcription.
          // Alternative: Don't use onstop for saving. Use a manual save function.

          // Let's stick to: Stop recorder to save file.
          // If continuous, we immediately restart it.
          setTimeout(() => {
              if (isMicOn && mediaRecorderRef.current?.state === 'inactive') {
                  mediaRecorderRef.current.start(1000);
              }
          }, 100);
      }
      setIsRecording(false);
      recordingStartTimeRef.current = null;
    } else {
      // Start Recording
      chunksRef.current = []; // Clear previous

      if (settings.transcriptionEnabled && settings.transcriptionMode === 'recording') {
          connectWebSocket();
          if (mediaRecorderRef.current?.state === 'inactive') {
              mediaRecorderRef.current.start(1000);
          }
      } else if (settings.transcriptionMode === 'continuous') {
          // Already running?
          if (mediaRecorderRef.current?.state === 'inactive') {
              mediaRecorderRef.current.start(1000);
          }
      } else {
          // Transcription disabled
           if (mediaRecorderRef.current?.state === 'inactive') {
              mediaRecorderRef.current.start(1000);
          }
      }

      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
    }
  }, [isMicOn, isRecording, connectWebSocket, settings.transcriptionMode, settings.transcriptionEnabled]);

  const toggleAgent = useCallback(() => {
    if (isAgentConnected) {
      // Disconnect
      if (agentSocketRef.current) {
        agentSocketRef.current.close();
      }
    } else {
      // Connect and start mic
      connectAgentWebSocket();
      if (!isMicOn) {
        startAudio();
      }
    }
  }, [isAgentConnected, connectAgentWebSocket, isMicOn, startAudio]);

  // Max Duration Check
  useEffect(() => {
      let interval: number;
      if (isRecording && settings.maxDuration > 0) {
          interval = window.setInterval(() => {
              if (recordingStartTimeRef.current) {
                  const elapsedMinutes = (Date.now() - recordingStartTimeRef.current) / 60000;
                  if (elapsedMinutes >= settings.maxDuration) {
                      console.log("Max duration reached. Stopping recording.");
                      toggleRecording(); // Toggle off
                  }
              }
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isRecording, settings.maxDuration, toggleRecording]);


  // Recording Playback Functions
  const playRecording = useCallback(() => {
    if (!recordedAudioUrl) {
      console.warn("No recorded audio to play");
      return;
    }

    const ctx = initAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create Output Analyser if not exists
    if (!outputAnalyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        outputAnalyserRef.current = analyser;
    }

    const audio = new Audio(recordedAudioUrl);
    audioElementRef.current = audio;

    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();

    gain.gain.value = 1.0;

    source.connect(gain);
    gain.connect(outputAnalyserRef.current!);
    outputAnalyserRef.current!.connect(ctx.destination);

    audio.onended = () => {
      setIsRecordingPlaying(false);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsRecordingPlaying(true);
        })
        .catch((error) => {
          console.error("Playback failed:", error);
          setIsRecordingPlaying(false);
        });
    } else {
        // Fallback for older browsers or if play() doesn't return a promise
        setIsRecordingPlaying(true);
    }
  }, [recordedAudioUrl]);

  const stopPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsRecordingPlaying(false);
  }, []);

  const togglePlayback = useCallback(() => {
      if (isRecordingPlaying) {
          stopPlayback();
      } else {
          playRecording();
      }
  }, [isRecordingPlaying, playRecording, stopPlayback]);

  const getAudioData = useCallback((): AudioData | null => {
    if (!analyserRef.current) return null;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);

    analyserRef.current.getByteFrequencyData(frequencyData);
    analyserRef.current.getByteTimeDomainData(timeDomainData);

    return {
      frequency: frequencyData,
      timeDomain: timeDomainData
    };
  }, []);

  const getOutputAudioData = useCallback((): AudioData | null => {
    if (!outputAnalyserRef.current) return null;

    const bufferLength = outputAnalyserRef.current.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);

    outputAnalyserRef.current.getByteFrequencyData(frequencyData);
    outputAnalyserRef.current.getByteTimeDomainData(timeDomainData);

    return {
      frequency: frequencyData,
      timeDomain: timeDomainData
    };
  }, []);

  return {
    isMicOn,
    isRecording,
    isRecordingPlaying,
    transcription,
    isTranscribing,
    toggleMic,
    toggleRecording,
    togglePlayback,
    getAudioData,
    getOutputAudioData,
    isAgentConnected,
    toggleAgent,
    agentMessages
  };
};
