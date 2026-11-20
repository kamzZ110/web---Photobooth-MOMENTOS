import { useEffect, useRef, useState, type RefObject } from 'react';
import { faceAnchorsFromLandmarks, hasCameraFrame, type FaceAnchors, type Point } from '../../lib/cameraAccessories';

// Pin the JavaScript and WASM to the same release. Load only on the camera step.
const VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

type Landmarker = {
  detectForVideo(image: HTMLCanvasElement, timestamp: number): { faceLandmarks: Point[][] };
  close(): void;
};

type VisionModule = {
  FilesetResolver: { forVisionTasks(url: string): Promise<unknown> };
  FaceLandmarker: { createFromOptions(fileset: unknown, options: {
    baseOptions: { modelAssetPath: string; delegate: 'CPU' };
    runningMode: 'VIDEO';
    numFaces: number;
  }): Promise<Landmarker> };
};

let visionAssets: Promise<{ vision: VisionModule; fileset: unknown }> | undefined;
let previousInitialization: Promise<void> = Promise.resolve();

function createLandmarker(isActive: () => boolean): Promise<Landmarker | null> {
  const initialization = previousInitialization.then(async () => {
    if (!isActive()) return null;
    visionAssets ??= (async () => {
      const moduleUrl = `${VISION_URL}/vision_bundle.mjs`;
      const vision = await import(/* @vite-ignore */ moduleUrl) as VisionModule;
      return { vision, fileset: await vision.FilesetResolver.forVisionTasks(`${VISION_URL}/wasm`) };
    })().catch((error: unknown) => {
      visionAssets = undefined;
      throw error;
    });
    const { vision, fileset } = await visionAssets;
    if (!isActive()) return null;
    return vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
  });
  previousInitialization = initialization.then(() => undefined, () => undefined);
  return initialization;
}

type TrackingStatus = 'idle' | 'loading' | 'searching' | 'tracking' | 'unavailable';
const TRACKING_INTERVAL_MS = 75;
const MAX_LANDMARK_AGE_MS = 300;
const TRACKING_LONG_EDGE = 480;

export function useFaceAccessoryTracking(
  videoRef: RefObject<HTMLVideoElement>, enabled: boolean, source: MediaStream | null = null,
) {
  const face = useRef<FaceAnchors | null>(null);
  const [status, setStatus] = useState<TrackingStatus>('idle');

  useEffect(() => {
    face.current = null;
    if (!enabled) {
      setStatus('idle');
      return;
    }

    let active = true;
    let animationFrame = 0;
    let tracker: Landmarker | null = null;
    let lastVideoTime = -1;
    let lastFrameAt = -Infinity;
    let lastStatus: TrackingStatus = 'loading';
    // Measure on a smaller, uncropped copy of this camera only. Normalized anchors
    // are projected into the actual preview/capture crop at paint time.
    const input = document.createElement('canvas');
    const inputContext = input.getContext('2d');
    if (!inputContext) {
      setStatus('unavailable');
      return;
    }
    setStatus(lastStatus);

    const updateStatus = (next: TrackingStatus) => {
      if (next !== lastStatus) {
        lastStatus = next;
        setStatus(next);
      }
    };
    const loadingTimeout = window.setTimeout(() => updateStatus('unavailable'), 15000);

    const track = (now: number) => {
      const video = videoRef.current;
      try {
        if (hasCameraFrame(video) && !video.paused) {
          if (lastVideoTime !== video.currentTime && now - lastFrameAt >= TRACKING_INTERVAL_MS && tracker) {
            lastVideoTime = video.currentTime;
            lastFrameAt = now;
            const scale = Math.min(1, TRACKING_LONG_EDGE / Math.max(video.videoWidth, video.videoHeight));
            const width = Math.max(1, Math.round(video.videoWidth * scale));
            const height = Math.max(1, Math.round(video.videoHeight * scale));
            if (input.width !== width) input.width = width;
            if (input.height !== height) input.height = height;
            inputContext.drawImage(video, 0, 0, width, height);
            const points = tracker.detectForVideo(input, now).faceLandmarks[0];
            face.current = points ? faceAnchorsFromLandmarks(points) : null;
          } else if (now - lastFrameAt > MAX_LANDMARK_AGE_MS) {
            face.current = null;
          }
        } else {
          face.current = null;
          lastVideoTime = -1;
        }
        updateStatus(face.current ? 'tracking' : 'searching');
        animationFrame = window.requestAnimationFrame(track);
      } catch {
        face.current = null;
        tracker?.close();
        tracker = null;
        updateStatus('unavailable');
      }
    };

    void createLandmarker(() => active).then((result) => {
      if (!active) {
        result?.close();
        return;
      }
      window.clearTimeout(loadingTimeout);
      tracker = result;
      if (tracker) animationFrame = window.requestAnimationFrame(track);
    }).catch(() => {
      if (!active) return;
      window.clearTimeout(loadingTimeout);
      updateStatus('unavailable');
    });

    return () => {
      active = false;
      window.clearTimeout(loadingTimeout);
      window.cancelAnimationFrame(animationFrame);
      tracker?.close();
      face.current = null;
    };
  }, [enabled, source, videoRef]);

  return { face, status };
}
