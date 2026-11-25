import { useEffect, useRef, useState, type RefObject } from 'react';
import { startCameraStream, stopCameraStream } from '../../lib/mediaEngine';
import { DEMO_HEIGHT, DEMO_WIDTH } from './drawEffectDemo';

export function useDemoCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    setReady(false);
    setError('');

    void startCameraStream(undefined, { width: DEMO_WIDTH, height: DEMO_HEIGHT }).then(result => {
      if (!active) {
        stopCameraStream(result);
        return;
      }
      stream = result;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {
          if (active) setError('Kamera belum bisa diputar. Coba lagi.');
        });
      }
    }).catch(() => {
      if (active) setError('Kamera tidak tersedia. Periksa izin kamera di browser, lalu coba lagi.');
    });

    return () => {
      active = false;
      stopCameraStream(stream);
    };
  }, [attempt]);

  return { videoRef, ready, error, setReady, retry: () => setAttempt(value => value + 1), attempt };
}

interface DemoCameraSurfaceProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  onPlaying: () => void;
}

export function DemoCameraSurface({ videoRef, canvasRef, onPlaying }: DemoCameraSurfaceProps) {
  return (
    <div className="effect-demo-camera-surface">
      <video ref={videoRef} autoPlay muted playsInline aria-label="Kamera percobaan"
        onPlaying={onPlaying} />
      <canvas ref={canvasRef} width={DEMO_WIDTH} height={DEMO_HEIGHT} aria-hidden="true" />
    </div>
  );
}
