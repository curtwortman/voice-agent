import React, { useState, useRef, useEffect } from 'react';
import AudioVisualizer from './AudioVisualizer';
import './AudioRecorder.css';

const AudioRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      mediaRecorderRef.current = new MediaRecorder(stream);

      // Connect to WebSocket
      socketRef.current = new WebSocket('ws://localhost:8000/ws/transcribe');

      socketRef.current.onopen = () => {
        console.log('WebSocket Connected');
        mediaRecorderRef.current?.start(1000); // Send chunks every 1 second
        setIsRecording(true);
      };

      socketRef.current.onmessage = (event) => {
        const text = event.data;
        setTranscription((prev) => prev + " " + text);
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data);
        }
      };

    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaStream(null);

      if (socketRef.current) {
        socketRef.current.close();
      }
    }
  };

  return (
    <div className="audio-recorder-container">
      <div className="controls" style={{ textAlign: 'center' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`record-button ${isRecording ? 'stop' : 'start'}`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      <AudioVisualizer stream={mediaStream} isRecording={isRecording} />

      <div className="transcription-box">
        <h3 className="transcription-title">Transcription:</h3>
        <p className="transcription-text">{transcription}</p>
      </div>
    </div>
  );
};

export default AudioRecorder;
