import { useEffect, useRef, useState, type RefObject } from 'react';
import { faceAnchorsFromLandmarks, hasCameraFrame, type FaceAnchors, type Point } from '../../lib/cameraAccessories';

const VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

interface Category { categoryName: string; score: number }
interface FaceResult { faceLandmarks: Point[][]; faceBlendshapes?: { categories: Category[] }[] }
interface HandResult { landmarks: Point[][] }
interface Landmarker<T> {
  detectForVideo(image: HTMLCanvasElement, timestamp: number): T;
  close(): void;
}
interface TaskOptions {
  baseOptions: { modelAssetPath: string; delegate: 'CPU' };
  runningMode: 'VIDEO';
}
type VisionModule = {
  FilesetResolver: { forVisionTasks(url: string): Promise<unknown> };
  FaceLandmarker: {
    createFromOptions(fileset: unknown, options: TaskOptions & {
      numFaces: number; outputFaceBlendshapes: boolean;
    }): Promise<Landmarker<FaceResult>>;
  };
  HandLandmarker: {
    createFromOptions(fileset: unknown, options: TaskOptions & { numHands: number }): Promise<Landmarker<HandResult>>;
  };
};

let visionAssets: Promise<{ vision: VisionModule; fileset: unknown }> | undefined;
let previousInitialization: Promise<void> = Promise.resolve();

function createTask<T>(isActive: () => boolean, create: (vision: VisionModule, fileset: unknown) => Promise<Landmarker<T>>) {
  const initialization = previousInitialization.then(async () => {
    if (!isActive()) return null;
    visionAssets ??= (async () => {
      const moduleUrl = VISION_URL + '/vision_bundle.mjs';
      const vision = await import(/* @vite-ignore */ moduleUrl) as VisionModule;
      return { vision, fileset: await vision.FilesetResolver.forVisionTasks(VISION_URL + '/wasm') };
    })().catch((error: unknown) => {
      visionAssets = undefined;
      throw error;
    });
    const { vision, fileset } = await visionAssets;
    return isActive() ? create(vision, fileset) : null;
  });
  previousInitialization = initialization.then(() => undefined, () => undefined);
  return initialization;
}

export type TrackingStatus = 'idle' | 'loading' | 'searching' | 'tracking' | 'unavailable';

export interface LandmarkSample<T> {
  result: T;
  aspect: number;
  time: number;
}

const TRACKING_INTERVAL_MS = 85;
const MAX_LANDMARK_AGE_MS = 350;
const TRACKING_LONG_EDGE = 480;

function useVideoLandmarks<T>(
  videoRef: RefObject<HTMLVideoElement>, enabled: boolean, source: MediaStream | null,
  create: (vision: VisionModule, fileset: unknown) => Promise<Landmarker<T>>,
  onResult: (result: T | null) => boolean,
  retry: number,
) {
  const sample = useRef<LandmarkSample<T> | null>(null);
  const [status, setStatus] = useState<TrackingStatus>('idle');
  // The result callback updates references only, without rebuilding a loaded model.
  const processResult = useRef(onResult);
  processResult.current = onResult;

  useEffect(() => {
    sample.current = null;
    processResult.current(null);
    if (!enabled) {
      setStatus('idle');
      return;
    }

    let active = true;
    let animationFrame = 0;
    let tracker: Landmarker<T> | null = null;
    let lastVideoTime = -1;
    let lastFrameAt = -Infinity;
    let present = false;
    let lastStatus: TrackingStatus = 'loading';
    const input = document.createElement('canvas');
    const inputContext = input.getContext('2d');
    if (!inputContext) {
      setStatus('unavailable');
      return;
    }
    setStatus(lastStatus);

    const updateStatus = (next: TrackingStatus) => {
      if (lastStatus !== next) {
        lastStatus = next;
        setStatus(next);
      }
    };
    const clearSample = () => {
      sample.current = null;
      processResult.current(null);
      present = false;
    };
    const loadingTimeout = window.setTimeout(() => updateStatus('unavailable'), 20000);

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
            const result = tracker.detectForVideo(input, now);
            sample.current = { result, aspect: width / height, time: now };
            present = processResult.current(result);
          } else if (now - lastFrameAt > MAX_LANDMARK_AGE_MS) {
            clearSample();
          }
        } else {
          clearSample();
          lastVideoTime = -1;
        }
        updateStatus(present ? 'tracking' : 'searching');
        animationFrame = window.requestAnimationFrame(track);
      } catch {
        clearSample();
        tracker?.close();
        tracker = null;
        updateStatus('unavailable');
      }
    };

    void createTask(() => active, create).then(result => {
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
      clearSample();
    };
  }, [enabled, source, videoRef, create, retry]);

  return { sample, status };
}

const createFace = (vision: VisionModule, fileset: unknown) => vision.FaceLandmarker.createFromOptions(fileset, {
  baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' },
  runningMode: 'VIDEO',
  numFaces: 1,
  outputFaceBlendshapes: true,
});
const createHand = (vision: VisionModule, fileset: unknown) => vision.HandLandmarker.createFromOptions(fileset, {
  baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'CPU' },
  runningMode: 'VIDEO',
  numHands: 2,
});

export function useFaceAccessoryTracking(
  videoRef: RefObject<HTMLVideoElement>, enabled: boolean, source: MediaStream | null = null, retry = 0,
) {
  const face = useRef<FaceAnchors | null>(null);
  const tracking = useVideoLandmarks(videoRef, enabled, source, createFace, result => {
    const landmarks = result?.faceLandmarks[0];
    face.current = landmarks ? faceAnchorsFromLandmarks(landmarks) : null;
    return !!landmarks;
  }, retry);
  return { face, ...tracking };
}

export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement>, enabled: boolean, source: MediaStream | null = null, retry = 0,
) {
  return useVideoLandmarks(videoRef, enabled, source, createHand, result => Boolean(result?.landmarks.length), retry);
}
