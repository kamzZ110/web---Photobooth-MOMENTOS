import { FLIPBOOK_CAPTURE_DURATION_MS, FLIPBOOK_CAPTURE_FRAME_COUNT, FLIPBOOK_CAPTURE_FPS } from '@momentos/shared';

interface TimedCaptureOptions {
  capture: (index: number, now: number) => string;
  cameraReady: () => boolean;
  onProgress: (count: number) => void;
  onComplete: (frames: string[]) => void;
  onError: (message: string) => void;
}

const FRAME_INTERVAL = 1000 / FLIPBOOK_CAPTURE_FPS;

export function recordTimedFlipbook({ capture, cameraReady, onProgress, onComplete, onError }: TimedCaptureOptions) {
  const frames: string[] = [];
  const start = performance.now();
  let lastSample = start;
  let timer = 0;
  let active = true;

  function fail(message: string) {
    active = false;
    onError(message);
  }

  function tick() {
    if (!active) return;
    const now = performance.now();
    if (document.hidden || !cameraReady()) {
      fail('Kamera atau tab terputus selama rekaman. Silakan coba lagi.');
      return;
    }
    if (now - lastSample > 500) {
      fail('Rekaman terhenti terlalu lama. Silakan tutup aplikasi berat dan coba lagi.');
      return;
    }

    const elapsed = now - start;
    if (elapsed >= FLIPBOOK_CAPTURE_DURATION_MS) {
      const last = frames.at(-1);
      if (!last) {
        fail('Tidak ada frame yang berhasil direkam.');
        return;
      }
      while (frames.length < FLIPBOOK_CAPTURE_FRAME_COUNT) frames.push(last);
      active = false;
      onProgress(frames.length);
      onComplete(frames);
      return;
    }

    const slot = Math.min(FLIPBOOK_CAPTURE_FRAME_COUNT - 1, Math.floor(elapsed / FRAME_INTERVAL));
    if (slot >= frames.length) {
      try {
        const frame = capture(slot, now);
        if (!frame) throw new Error('Empty frame');
        // Late camera callbacks use the nearest available image to keep the five-second timeline intact.
        const preceding = frames.at(-1) ?? frame;
        while (frames.length < slot) frames.push(preceding);
        frames.push(frame);
        lastSample = now;
        onProgress(frames.length);
      } catch {
        fail('Frame gagal diproses. Silakan rekam ulang.');
        return;
      }
    }
    const next = start + Math.min(FLIPBOOK_CAPTURE_DURATION_MS, frames.length * FRAME_INTERVAL);
    timer = window.setTimeout(tick, Math.max(0, next - performance.now()));
  }

  tick();
  return () => {
    active = false;
    window.clearTimeout(timer);
  };
}
