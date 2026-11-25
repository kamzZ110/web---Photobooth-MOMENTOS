import { useEffect, useRef, useState, type RefObject } from 'react';
import { cameraCoverCrop, flipbookCameraBoxes, hasCameraFrame } from '../../lib/cameraAccessories';
import { DEMO_ANIMATION_MS, DEMO_HEIGHT, DEMO_WIDTH, type GestureVisual } from './drawEffectDemo';
import { gesturePlan, GestureDetector, needsHands, type GestureEvidence } from './gestureRecognition';
import { type EffectDemo } from './effectDemos';
import { useFaceAccessoryTracking, useHandTracking } from './useFaceAccessoryTracking';

interface GestureTrackingOptions {
  videoRef: RefObject<HTMLVideoElement>;
  remoteVideoRef?: RefObject<HTMLVideoElement>;
  remoteStream?: MediaStream | null;
  enabled: boolean;
  effect: EffectDemo | null;
  duo?: boolean;
  localIsGuest?: boolean;
  mirror?: boolean;
  localAccessory?: boolean;
  remoteAccessory?: boolean;
  retry?: number;
}

const PAIR_WINDOW_MS = 4000;

export function useLiveGestureEffect({
  videoRef, remoteVideoRef = videoRef, remoteStream = null, enabled, effect, duo = false,
  localIsGuest = false, mirror = true, localAccessory = false, remoteAccessory = false, retry = 0,
}: GestureTrackingOptions) {
  const plan = effect ? gesturePlan(effect.id, duo) : null;
  const firstKind = plan?.first;
  const secondKind = plan?.second ?? (plan?.combine === 'either' ? firstKind : undefined);
  const localKind = localIsGuest ? secondKind : firstKind;
  const remoteKind = localIsGuest ? firstKind : secondKind;
  const needsFace = (kind: typeof localKind) => !!kind && (!needsHands(kind) || kind === 'peace');
  const localFaceEnabled = enabled && (localAccessory || needsFace(localKind));
  const remoteFaceEnabled = enabled && duo && !!remoteStream && (remoteAccessory || needsFace(remoteKind));
  const local = useFaceAccessoryTracking(videoRef, localFaceEnabled, null, retry);
  const remote = useFaceAccessoryTracking(remoteVideoRef, remoteFaceEnabled, remoteStream, retry);
  const localHand = useHandTracking(videoRef, enabled && needsHands(localKind), null, retry);
  const remoteHand = useHandTracking(remoteVideoRef, enabled && duo && !!remoteStream && needsHands(remoteKind), remoteStream, retry);

  const active = useRef<{ startedAt: number; participant: 0 | 1 } | null>(null);
  const [phase, setPhase] = useState<'waiting' | 'partner' | 'playing'>('waiting');

  useEffect(() => {
    active.current = null;
    setPhase('waiting');
    if (!enabled || !effect) return;

    const currentPlan = gesturePlan(effect.id, duo);
    const kinds = [currentPlan.first, currentPlan.second ?? (currentPlan.combine === 'either' ? currentPlan.first : undefined)] as const;
    const detectors = [new GestureDetector(), new GestureDetector()];
    const sensors = localIsGuest ? [[remote, remoteHand], [local, localHand]] as const :
      [[local, localHand], [remote, remoteHand]] as const;
    const matchedAt = [-Infinity, -Infinity];
    const latched = [false, false];
    let raf = 0;
    let previousPhase: typeof phase = 'waiting';

    const tick = (now: number) => {
      const inputs = sensors.map(([face, hand]): GestureEvidence => {
        const faceSample = face.sample.current;
        const handSample = hand.sample.current;
        return {
          face: faceSample?.result.faceLandmarks[0] && now - faceSample.time < 400 ? {
            points: faceSample.result.faceLandmarks[0],
            scores: faceSample.result.faceBlendshapes?.[0]?.categories,
            aspect: faceSample.aspect,
          } : undefined,
          hands: handSample && now - handSample.time < 400 ? {
            points: handSample.result.landmarks, aspect: handSample.aspect,
          } : undefined,
        };
      });
      const matches = kinds.map((kind, index) => !!kind && detectors[index].matches(kind, inputs[index], now));
      matches.forEach((match, index) => {
        if (match && !latched[index]) {
          if (currentPlan.combine !== 'sequence' || index === 0 || now - matchedAt[0] < PAIR_WINDOW_MS) {
            matchedAt[index] = now;
          }
        }
        latched[index] = match;
      });
      const playing = active.current && now - active.current.startedAt < DEMO_ANIMATION_MS;
      if (!playing) {
        active.current = null;
        const recent = matchedAt.map(time => now - time < PAIR_WINDOW_MS);
        const completed = currentPlan.combine === 'single' ? recent[0] :
          currentPlan.combine === 'either' ? recent.some(Boolean) : recent.every(Boolean);
        if (completed) {
          const participant = currentPlan.combine === 'either' && matchedAt[1] > matchedAt[0] ? 1 : 0;
          active.current = { startedAt: now, participant };
          matchedAt.fill(-Infinity);
        }
      }
      const next = active.current ? 'playing' :
        matchedAt.some(time => now - time < PAIR_WINDOW_MS) ? 'partner' : 'waiting';
      if (next !== previousPhase) {
        previousPhase = next;
        setPhase(next);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      active.current = null;
    };
  }, [enabled, effect, duo, localIsGuest, local.sample, remote.sample, localHand.sample, remoteHand.sample, retry]);

  const getVisual = (now: number): GestureVisual | null => {
    if (!effect || !active.current) return null;
    const elapsed = now - active.current.startedAt;
    if (elapsed < 0 || elapsed > DEMO_ANIMATION_MS) return null;
    const participantIsLocal = active.current.participant === (localIsGuest ? 1 : 0);
    const video = participantIsLocal ? videoRef.current : remoteVideoRef.current;
    const face = participantIsLocal ? local.face.current : remote.face.current;
    const boxes = flipbookCameraBoxes(DEMO_WIDTH, DEMO_HEIGHT, duo ? 'duo' : 'solo', localIsGuest);
    const box = participantIsLocal ? boxes.local : boxes.remote;
    let anchor: GestureVisual['anchor'];
    if (box && effect.mode === 'solo') {
      anchor = { x: (box.x + box.width / 2) / DEMO_WIDTH, y: 0.57, scale: duo ? 0.75 : 1 };
      if (face && hasCameraFrame(video)) {
        const crop = cameraCoverCrop(video.videoWidth, video.videoHeight, box);
        const relativeX = (face.nose.x * video.videoWidth - crop.x) / crop.width;
        const relativeY = (face.nose.y * video.videoHeight - crop.y) / crop.height;
        const width = Math.hypot(
          (face.temples[1].x - face.temples[0].x) * video.videoWidth / crop.width * box.width,
          (face.temples[1].y - face.temples[0].y) * video.videoHeight / crop.height * box.height,
        );
        anchor = {
          x: Math.min(0.9, Math.max(0.1, (box.x + (participantIsLocal && mirror ? 1 - relativeX : relativeX) * box.width) / DEMO_WIDTH)),
          y: Math.min(0.87, Math.max(0.40, relativeY)),
          scale: Math.min(1.3, Math.max(0.65, width / 106)),
        };
      }
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return { effect, progress: reducedMotion ? 0.75 : elapsed / DEMO_ANIMATION_MS, anchor };
  };

  const statuses = [];
  // Hand gestures can work independently of face anchoring.
  if (localKind) statuses.push(needsHands(localKind) ? localHand.status : local.status);
  if (duo && remoteKind) statuses.push(needsHands(remoteKind) ? remoteHand.status : remote.status);
  const loading = statuses.some(status => status === 'loading' || status === 'idle');
  const unavailable = statuses.includes('unavailable');
  const searching = statuses.includes('searching');
  const status = !enabled ? 'idle' : unavailable ? 'unavailable' : loading ? 'loading' : searching ? 'searching' : 'tracking';

  return { local, remote, phase, status, getVisual };
}

export function gestureInstructions(effect: EffectDemo, duo: boolean) {
  if (effect.mode === 'duo' && !duo && effect.id === 'magic-wipe') return 'Dekatkan telapak ke kamera, lalu sibakkan ke samping.';
  if (effect.mode === 'duo' && duo) return 'Host: ' + effect.gestures[0] + ' · Guest: ' + effect.gestures[1];
  return effect.gestures[0];
}

export function gestureStatusText(status: string, phase: string) {
  if (status === 'unavailable') return 'Pelacakan gestur gagal dimuat. Periksa internet, lalu coba lagi.';
  if (status === 'loading') return 'Menyiapkan pelacakan gestur…';
  if (phase === 'playing') return 'Gestur terdeteksi. Efek aktif!';
  if (phase === 'partner') return 'Gestur pertama terdeteksi. Menunggu pasangan.';
  if (status === 'searching') return 'Arahkan wajah atau tangan sesuai petunjuk ke kamera.';
  return 'Siap mendeteksi gestur.';
}
