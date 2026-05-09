import { useEffect, useRef } from 'react';
import { AudioData } from '../hooks/useAudioAnalyzer';

interface VisualizerProps {
  getAudioData: () => AudioData | null;
  getOutputAudioData?: () => AudioData | null;
  isMicOn: boolean;
  isDemoPlaying: boolean;
}

const Visualizer = ({ getAudioData, getOutputAudioData, isMicOn, isDemoPlaying }: VisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const micData = getAudioData();
    const outputData = getOutputAudioData ? getOutputAudioData() : null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.35;

    // --- 1. Draw Circular Frequencies (Mic Input) ---
    if (isMicOn && micData) {
        const { frequency } = micData;
        const barCount = 120;
        const step = Math.floor(frequency.length / barCount);

        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            const value = frequency[i * step];
            const percent = value / 255;
            const barLength = percent * baseRadius * 0.5;

            const x1 = centerX + Math.cos(angle) * baseRadius;
            const y1 = centerY + Math.sin(angle) * baseRadius;
            const x2 = centerX + Math.cos(angle) * (baseRadius + barLength);
            const y2 = centerY + Math.sin(angle) * (baseRadius + barLength);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = `hsla(${280 + percent * 60}, 100%, 70%, ${percent + 0.2})`;
            ctx.stroke();
        }
    }

    // --- 2. Draw Pulsing Core (Output/Activity) ---
    const pulseScale = (outputData && isDemoPlaying) ? 1 + (outputData.timeDomain[0] / 255) * 0.2 : 1;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * pulseScale, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * pulseScale);
    gradient.addColorStop(0, 'rgba(153, 51, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 51, 204, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Subtle glow outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 1.1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    requestRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(draw);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isMicOn, getAudioData, getOutputAudioData]);

  useEffect(() => {
      const handleResize = () => {
          if (canvasRef.current && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              canvasRef.current.width = rect.width;
              canvasRef.current.height = rect.height;
          }
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default Visualizer;
