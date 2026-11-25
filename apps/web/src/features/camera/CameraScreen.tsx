import React, { useEffect, useRef, useState } from 'react';
import {
  PHOTO_FILTER_PRESETS,
  DEFAULT_CLASSIC_CAMERA_EFFECTS,
  updateClassicCameraEffects,
  type BoothMode,
  type CameraAccessoryId,
  type CameraPermissionState,
  type CapturedFrame,
  type ClassicCameraEffectChange,
  type PhotoFilterId,
  type ScreenId,
  type TemplateLayoutId,
} from '@momentos/shared';
import {
  captureVideoFrameToDataUrl,
  CLASSIC_FRAME_HEIGHT,
  CLASSIC_FRAME_WIDTH,
  createSimulatedPoseDataUrl,
  drawClassicPhotoEffects,
  getCssFilterById,
  listVideoInputDevices,
  startCameraStream,
  stopCameraStream,
} from '../../lib/mediaEngine';
import {
  realtimeClient,
  type RealtimeClientState,
} from '../../lib/realtimeClient';
import { flipbookCameraBoxes, hasCameraFrame } from '../../lib/cameraAccessories';
import { CameraChoice } from '../flipbook/CameraChoice';
import { CameraAccessoryRail } from '../flipbook/CameraAccessoryPanel';
import { useFaceAccessoryTracking } from '../flipbook/useFaceAccessoryTracking';

interface CameraScreenProps {
  mode: BoothMode;
  isNight?: boolean;
  takeCount: number;
  onChangeTakeCount: (count: number) => void;
  selectedFilter: PhotoFilterId;
  onChangeFilter: (filter: PhotoFilterId) => void;
  layout?: TemplateLayoutId;
  onChangeLayout?: (layout: TemplateLayoutId) => void;
  frames: CapturedFrame[];
  initialPose?: number;
  onCaptureFrame: (
    frameIndex: number,
    dataUrl: string,
    targetRole?: 'host' | 'guest'
  ) => void;
  realtimeState?: RealtimeClientState;
  onNavigate: (screen: ScreenId) => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  mode,
  takeCount,
  onChangeTakeCount,
  selectedFilter,
  onChangeFilter,
  frames,
  initialPose = 0,
  onCaptureFrame,
  realtimeState,
  onNavigate,
}) => {
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>('granted');
  const [useSimulation, setUseSimulation] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [mirror, setMirror] = useState<boolean>(true);
  const [countdownSec, setCountdownSec] = useState<3 | 5>(3);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [currentShot, setCurrentShot] = useState(initialPose);
  const [isAutoBursting, setIsAutoBursting] = useState(false);
  const [soloAccessory, setSoloAccessory] = useState<CameraAccessoryId>('none');
  const [localDuoEffects, setLocalDuoEffects] = useState(DEFAULT_CLASSIC_CAMERA_EFFECTS);
  const [copiedType, setCopiedType] = useState<'none' | 'code' | 'link'>('none');
  const [customPoseInput, setCustomPoseInput] = useState<string>(
    takeCount > 4 || takeCount === 1 ? String(takeCount) : '6'
  );
  const [isCustomPoseActive, setIsCustomPoseActive] = useState<boolean>(
    takeCount > 4 || takeCount === 1
  );

  useEffect(() => {
    setCurrentShot((prev) => (prev >= takeCount ? 0 : prev));
    if (takeCount > 4 || takeCount === 1) {
      setCustomPoseInput(String(takeCount));
      setIsCustomPoseActive(true);
    }
  }, [takeCount]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastHandledAttemptRef = useRef<string | null>(null);

  const activeFilterCss = getCssFilterById(selectedFilter);
  const isDuo = mode === 'duo';
  const activeRole = isDuo ? realtimeState?.role ?? 'host' : 'host';
  const remoteRole = activeRole === 'guest' ? 'host' : 'guest';
  const liveSnapshot = realtimeState?.snapshot;
  const canSetDuoEffects = activeRole === 'host';
  const activeDuoEffects = liveSnapshot?.mode === 'duo'
    ? liveSnapshot.classicCameraEffects ?? DEFAULT_CLASSIC_CAMERA_EFFECTS
    : localDuoEffects;
  const localAccessory = isDuo ? activeDuoEffects.accessories[activeRole] : soloAccessory;
  const remoteAccessory = isDuo ? activeDuoEffects.accessories[remoteRole] : 'none';
  const busy = countdown !== null || isAutoBursting;
  const remoteStream = realtimeState?.remoteStream ?? null;
  const canTrack = permissionState === 'granted' && !useSimulation;
  const localTracking = useFaceAccessoryTracking(videoRef, canTrack && localAccessory !== 'none');
  const remoteTracking = useFaceAccessoryTracking(remoteVideoRef, Boolean(remoteStream) && remoteAccessory !== 'none', remoteStream);
  const waitingForAccessory = canTrack && localAccessory !== 'none' && localTracking.status === 'loading';
  const showCameraEffects = (canTrack && localAccessory !== 'none') ||
    (Boolean(remoteStream) && remoteAccessory !== 'none');
  const syncedRemotePhoto = activeRole === 'guest' ? frames[currentShot]?.imageDataUrl : frames[currentShot]?.guestImageDataUrl;
  const roomCode = liveSnapshot?.code ?? '';
  const hostReady = Boolean(liveSnapshot?.participants.find(p => p.role === 'host')?.ready);
  const guestReady = Boolean(liveSnapshot?.participants.find(p => p.role === 'guest')?.ready);
  const myReady = activeRole === 'host' ? hostReady : guestReady;
  const prompt = liveSnapshot?.retakePrompt;
  const photo = frames[currentShot];
  const myPhoto = isDuo && activeRole === 'guest' ? photo?.guestImageDataUrl : photo?.imageDataUrl;
  const retakesLeft = Math.max(0, 3 - (photo?.retakeCount ?? 0));
  const approved = isDuo && prompt?.status === 'approved' && prompt.frameId === currentShot + 1;
  useEffect(() => {
    if (isDuo && prompt && prompt.status !== 'rejected') setCurrentShot(prompt.frameId - 1);
  }, [isDuo, prompt?.requestId, prompt?.status]);

  const applyDuoEffect = (change: ClassicCameraEffectChange) => {
    if (!canSetDuoEffects) return;
    if (liveSnapshot?.mode === 'duo') realtimeClient.syncConfig({ classicCameraEffect: change });
    else setLocalDuoEffects((current) => updateClassicCameraEffects(current, change));
  };

  const shareInviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?room=${roomCode}`
      : `?room=${roomCode}`;

  useEffect(() => {
    let active = true;

    const initCamera = async () => {
      if (permissionState === 'denied' || useSimulation) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
        realtimeClient.attachLocalStream(null);
        return;
      }

      try {
        setCameraError(null);
        stopCameraStream(streamRef.current);
        const stream = await startCameraStream(selectedDeviceId || undefined, { width: 1280, height: 720 });
        if (!active) {
          stopCameraStream(stream);
          return;
        }
        streamRef.current = stream;
        if (isDuo) realtimeClient.attachLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        const list = await listVideoInputDevices();
        if (active) setDevices(list);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Kamera tidak tersedia — memakai preview simulasi.';
        setCameraError(msg);
        setUseSimulation(true);
      }
    };

    initCamera();

    return () => {
      active = false;
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      realtimeClient.attachLocalStream(null);
    };
  }, [permissionState, useSimulation, selectedDeviceId]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isDuo, permissionState]);

  useEffect(() => {
    if (!showCameraEffects) return;
    const ctx = effectsCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const boxes = flipbookCameraBoxes(CLASSIC_FRAME_WIDTH, CLASSIC_FRAME_HEIGHT, mode, isDuo && activeRole === 'guest');
    let frame = 0;
    const draw = (timeMs: number) => {
      ctx.clearRect(0, 0, CLASSIC_FRAME_WIDTH, CLASSIC_FRAME_HEIGHT);
      const local = videoRef.current;
      const remote = remoteVideoRef.current;
      drawClassicPhotoEffects(ctx, boxes.local, {
        accessory: { id: localAccessory, face: localTracking.face.current, timeMs } }, hasCameraFrame(local) ? local : undefined, mirror);
      if (boxes.remote && (remoteStream || !syncedRemotePhoto)) {
        drawClassicPhotoEffects(ctx, boxes.remote, {
          accessory: { id: remoteAccessory, face: remoteTracking.face.current, timeMs } }, hasCameraFrame(remote) ? remote : undefined);
      }
      if ((canTrack && localAccessory !== 'none') || (remoteStream && remoteAccessory !== 'none')) {
        frame = window.requestAnimationFrame(draw);
      }
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [showCameraEffects, canTrack, mode, isDuo, activeRole, currentShot, localAccessory, remoteAccessory,
    localTracking.face, remoteTracking.face, mirror, remoteStream, syncedRemotePhoto]);

  const performSnapAtIndex = (slotIdx: number) => {
    const targetFrame = frames[slotIdx];
    const width = isDuo ? CLASSIC_FRAME_WIDTH / 2 : CLASSIC_FRAME_WIDTH;
    const height = CLASSIC_FRAME_HEIGHT;
    let dataUrl = '';

    if (!useSimulation && hasCameraFrame(videoRef.current)) {
      dataUrl = captureVideoFrameToDataUrl(videoRef.current, {
        mirror,
        cssFilter: activeFilterCss,
        width,
        height,
        effects: { accessory: { id: localAccessory, face: localTracking.face.current, timeMs: performance.now() } },
      });
    } else if (useSimulation && targetFrame) {
      dataUrl = createSimulatedPoseDataUrl(
        activeRole === 'guest' ? targetFrame.guestPose : targetFrame.hostPose,
        `${targetFrame.label} (${activeRole.toUpperCase()})`,
        activeRole === 'guest' ? '#EBF4FD' : targetFrame.accentBg,
        activeFilterCss,
        width,
        height,
      );
    }

    if (dataUrl) {
      setFlashActive(true);
      onCaptureFrame(slotIdx, dataUrl, activeRole);

      window.setTimeout(() => setFlashActive(false), 240);
    }
  };

  useEffect(() => {
    const sched = realtimeState?.lastScheduledCountdown;
    if (!isDuo || !sched || (realtimeState?.transport === 'websocket' && liveSnapshot?.countdown?.attemptId !== sched.attemptId) || (sched.retakeRole && sched.retakeRole !== activeRole) || sched.attemptId === lastHandledAttemptRef.current) return;
    lastHandledAttemptRef.current = sched.attemptId;

    const targetIdx = Math.max(0, Math.min(takeCount - 1, sched.takeNumber - 1));
    setCurrentShot(targetIdx);

    const estimatedNowServer = Date.now() + (realtimeState?.clockOffsetMs ?? 0);
    const totalWaitMs = Math.max(
      900,
      Math.min(4000, sched.targetCaptureAtServer - estimatedNowServer)
    );
    const stepMs = Math.round(totalWaitMs / 3);

    setCountdown(3);
    const t2 = window.setTimeout(() => setCountdown(2), stepMs);
    const t1 = window.setTimeout(() => setCountdown(1), stepMs * 2);
    const t0 = window.setTimeout(() => {
      setCountdown(null);
      performSnapAtIndex(targetIdx);
    }, totalWaitMs);

    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t1);
      window.clearTimeout(t0);
      setCountdown(null);
    };
  }, [realtimeState?.lastScheduledCountdown, liveSnapshot?.countdown?.attemptId]);

  const localTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(localTimer.current), []);
  const triggerSingleShot = (slotOverride?: number) => {
    if (busy || waitingForAccessory) return;
    const targetIndex = slotOverride ?? currentShot;

    if (mode === 'duo' && liveSnapshot) {
      realtimeClient.requestCountdown(targetIndex + 1);
      return;
    }

    const totalMs = countdownSec * 1000;
    const stepMs = Math.round(totalMs / countdownSec);
    let remaining: number = countdownSec;
    setCountdown(remaining);

    const tick = localTimer.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        window.clearInterval(tick);
        setCountdown(null);
        performSnapAtIndex(targetIndex);
      }
    }, stepMs);
  };

  const burstTimers = useRef<number[]>([]);
  useEffect(() => () => burstTimers.current.forEach(timer => window.clearTimeout(timer)), []);
  const after = (callback: () => void, delay: number) => {
    burstTimers.current.push(window.setTimeout(callback, delay));
  };
  const triggerAutoCaptureSequence = () => {
    if (busy || waitingForAccessory) return;
    setIsAutoBursting(true);
    let idx = 0;

    const runStep = () => {
      setCurrentShot(idx);
      const stepWaitMs = countdownSec === 5 ? 850 : 520;
      setCountdown(3);
      after(() => setCountdown(2), stepWaitMs);
      after(() => setCountdown(1), stepWaitMs * 2);
      after(() => {
        setCountdown(null);
        performSnapAtIndex(idx);
        idx += 1;
        if (idx < takeCount) {
          after(runStep, 520);
        } else {
          setIsAutoBursting(false);
          setCurrentShot(0);
          after(() => {
            onNavigate('editor');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 550);
        }
      }, stepWaitMs * 3);
    };

    runStep();
  };

  const handleCopy = (type: 'code' | 'link') => {
    const value = type === 'code' ? roomCode : shareInviteUrl;
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedType(type);
    window.setTimeout(() => setCopiedType('none'), 2000);
  };

  const capturedCount = frames
    .slice(0, takeCount)
    .filter((f) => Boolean(f.imageDataUrl)).length;

  return (
    <div className="page-stack" style={{ maxWidth: 1440, margin: '0 auto' }}>
      <section>
        {/* Clean 4-Step Progress Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          {[
            { id: 'room' as ScreenId, label: '01. Pilih Mode' },
            { id: 'frame-select' as ScreenId, label: '02. Pilih Frame' },
            { id: 'camera' as ScreenId, label: '03. Kamera' },
            { id: 'editor' as ScreenId, label: '04. Hasil & Edit' },
          ].map((st, idx) => (
            <React.Fragment key={st.id}>
              <button
                type="button"
                className={`btn ${st.id === 'camera' ? 'active-pill' : ''}`}
                style={{
                  minHeight: 32,
                  padding: '4px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                }}
                onClick={() => onNavigate(st.id)}
              >
                {st.label}
              </button>
              {idx < 3 && (
                <span style={{ alignSelf: 'center', opacity: 0.35, fontWeight: 700 }}>
                  —
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Minimal Header Bar above Viewfinder (No Webcam/Simulasi toggle!) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            className="btn btn-lift"
            style={{ minHeight: 36, padding: '6px 14px', fontSize: '0.8rem' }}
            onClick={() => onNavigate('room')}
          >
            ← Ganti Mode
          </button>

          <div
            className="pill-tag"
            style={{ fontSize: '0.78rem', fontWeight: 800 }}
          >
            {mode === 'duo' ? '👥 Mode Duo' : '👤 Mode Solo'} · Pose{' '}
            {currentShot + 1}/{takeCount} ({capturedCount} tersimpan)
          </div>

          {devices.length > 1 && !useSimulation && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              style={{
                height: 34,
                borderRadius: 999,
                border: '1.5px solid #18181B',
                padding: '0 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: '#FFFFFF',
                color: '#18181B',
              }}
              aria-label="Pilih Kamera"
            >
              {devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Kamera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {cameraError && (
          <div
            className="clean-card surface-light"
            style={{
              background: '#FEF3C7',
              borderColor: '#D97706',
              padding: '10px 16px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              fontSize: '0.82rem',
            }}
          >
            <span>
              <strong>Info Kamera:</strong> {cameraError}
            </span>
            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ minHeight: 30, padding: '4px 12px', fontSize: '0.74rem' }}
              onClick={() => {
                setCameraError(null);
                setUseSimulation(false);
              }}
            >
              Coba Aktifkan Webcam
            </button>
          </div>
        )}

        {/* Main Focused Studio Stage */}
        {permissionState === 'denied' ? (
          <div
            className="clean-card surface-light"
            style={{
              background: '#FCEEF3',
              textAlign: 'center',
              maxWidth: 560,
              margin: '24px auto',
            }}
          >
            <h2 className="heading-h2" style={{ marginBottom: 8 }}>
              Izin Kamera Diperlukan
            </h2>
            <p className="text-muted" style={{ marginBottom: 18 }}>
              Klik ikon kamera di address bar browser lalu izinkan akses kamera.
            </p>
            <button
              type="button"
              className="btn btn-primary-pop"
              onClick={() => setPermissionState('granted')}
            >
              Coba Minta Izin Lagi
            </button>
          </div>
        ) : (
          <div className="flipbook-camera-layout classic-camera-layout">
            <div className="flipbook-camera-stage">
              {/* Centered Rounded Viewfinder */}
              <div
                className="classic-camera-viewfinder" data-duo={isDuo}
                style={{ aspectRatio: CLASSIC_FRAME_WIDTH + ' / ' + CLASSIC_FRAME_HEIGHT }}
              >
                {flashActive && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 30,
                      background: '#FFFFFF',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {countdown !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 25,
                      background: 'rgba(24, 24, 27, 0.42)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--primitive-font-heading)',
                        fontSize: '5rem',
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {countdown}
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 8, fontSize: '0.95rem' }}>
                      Pose #{currentShot + 1} — Senyum!
                    </div>
                  </div>
                )}

                {/* Primary Host / Solo Camera Feed */}
                <div
                  className={useSimulation ? 'surface-light' : undefined}
                  style={{
                    position: 'relative',
                    order: isDuo && activeRole === 'guest' ? 1 : 0,
                    background: useSimulation ? '#FCEEF3' : '#09090B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {mode === 'duo' && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        zIndex: 5,
                        background: 'rgba(24,24,27,0.75)',
                        color: '#FFFFFF',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: 999,
                      }}
                    >
                      {activeRole.toUpperCase()}
                    </span>
                  )}

                  {!useSimulation ? (
                    <video
                      ref={videoRef}
                      aria-label={isDuo ? "Kamera " + activeRole : "Kamera kamu"}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: mirror ? 'scaleX(-1)' : 'none',
                        filter: activeFilterCss,
                        transition: 'filter 0.2s ease',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        textAlign: 'center',
                        filter: activeFilterCss,
                        padding: 20,
                      }}
                    >
                      <div style={{ fontSize: '4.6rem', marginBottom: 8 }}>
                        {(activeRole === 'guest' ? frames[currentShot]?.guestPose : frames[currentShot]?.hostPose) ?? '😊✌️'}
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#18181B' }}>
                        {mode === 'duo' ? 'Kamera ' + activeRole + ' (Simulasi)' : 'Kamera Simulasi'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Partner Split Feed in Duo Mode */}
                {mode === 'duo' && (
                  <div
                    className={!remoteStream ? 'surface-light' : undefined}
                    style={{
                      position: 'relative',
                      order: activeRole === 'guest' ? 0 : 1,
                      background: remoteStream ? '#09090B' : '#EBF4FD',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 5,
                        background: 'rgba(24,24,27,0.75)',
                        color: '#FFFFFF',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: 999,
                      }}
                    >
                      {remoteRole.toUpperCase() + (remoteStream ? ' LIVE' : syncedRemotePhoto ? ' TERSINKRON' : '')}
                    </span>

                    {remoteStream ? (
                      <video
                        ref={remoteVideoRef}
                        aria-label={"Kamera " + remoteRole}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: activeFilterCss,
                        }}
                      />
                    ) : syncedRemotePhoto ? (
                      <img
                        src={syncedRemotePhoto}
                        alt={"Foto " + remoteRole}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: 20,
                          filter: activeFilterCss,
                        }}
                      >
                        <div style={{ fontSize: '4.4rem', marginBottom: 8 }}>
                          {(remoteRole === 'host' ? frames[currentShot]?.hostPose : frames[currentShot]?.guestPose) ?? '😄🫶'}
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#18181B' }}>
                          Menunggu kamera {remoteRole}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isDuo && <span className="camera-duo-divider" aria-hidden="true" />}
                {showCameraEffects && (
                  <canvas ref={effectsCanvasRef} className="flipbook-preview-effects"
                    width={CLASSIC_FRAME_WIDTH} height={CLASSIC_FRAME_HEIGHT} aria-hidden="true" />
                )}

              </div>

              <fieldset className="classic-camera-take-options" aria-label="Timer dan jumlah pose" disabled={busy}>
                {([3, 5] as const).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setCountdownSec(sec)}
                    style={{
                      background: countdownSec === sec ? '#FFFFFF' : 'transparent',
                      color: countdownSec === sec ? '#18181B' : '#FFFFFF',
                      border: 'none',
                      borderRadius: 999,
                      padding: '3px 9px',
                      fontSize: '0.73rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {sec}s
                  </button>
                ))}
                <span style={{ opacity: 0.35 }}>|</span>
                {([2, 3, 4] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setIsCustomPoseActive(false);
                      onChangeTakeCount(cnt);
                    }}
                    style={{
                      background:
                        !isCustomPoseActive && takeCount === cnt
                          ? '#BC4374'
                          : 'transparent',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 999,
                      padding: '3px 9px',
                      fontSize: '0.73rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {cnt} Pose
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomPoseActive(true);
                    const parsed = Number.parseInt(customPoseInput, 10);
                    const clamped = Number.isFinite(parsed)
                      ? Math.max(1, Math.min(8, parsed))
                      : 6;
                    setCustomPoseInput(String(clamped));
                    onChangeTakeCount(clamped);
                  }}
                  style={{
                    background:
                      isCustomPoseActive || takeCount > 4 || takeCount === 1
                        ? '#BC4374'
                        : 'transparent',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 999,
                    padding: '3px 9px',
                    fontSize: '0.73rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  title="Atur jumlah pose kustom manual (maksimal 8)"
                >
                  Kustom
                </button>
                {(isCustomPoseActive || takeCount > 4 || takeCount === 1) && (
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginLeft: 2,
                    }}
                  >
                    <input
                      type="number"
                      min={1}
                      max={8}
                      aria-label="Input manual jumlah pose (maks 8)"
                      value={customPoseInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setCustomPoseInput(raw);
                        const num = Number.parseInt(raw, 10);
                        if (Number.isFinite(num)) {
                          onChangeTakeCount(Math.max(1, Math.min(8, num)));
                        }
                      }}
                      onBlur={() => {
                        const num = Number.parseInt(customPoseInput, 10);
                        const clamped = Number.isFinite(num)
                          ? Math.max(1, Math.min(8, num))
                          : takeCount;
                        setCustomPoseInput(String(clamped));
                        onChangeTakeCount(clamped);
                      }}
                      style={{
                        width: 42,
                        height: 24,
                        borderRadius: 999,
                        border: '1.5px solid #FFFFFF',
                        background: '#FFFFFF',
                        color: '#18181B',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        padding: '0 2px',
                      }}
                    />
                    <span style={{ opacity: 0.85 }}>/8</span>
                  </label>
                )}
              </fieldset>

              {localAccessory !== 'none' && (
                <p className="text-muted classic-camera-status" role="status">
                  {!canTrack ? 'Aksesori wajah tersedia saat kamera aktif.'
                    : waitingForAccessory ? 'Menyiapkan pelacakan wajah.'
                    : localTracking.status === 'unavailable' ? 'Pelacakan wajah belum tersedia.'
                    : localTracking.status === 'searching' ? 'Arahkan wajah ke kamera untuk melihat aksesori.'
                    : 'Aksesori wajah aktif.'}
                </p>
              )}
              <fieldset className="flipbook-camera-accessories" aria-label="Aksesori Kamera" disabled={busy}>
                <h2>Aksesori</h2>
                {isDuo ? (
                  <div className="flipbook-duo-accessories">
                    {(['host', 'guest'] as const).map((role) => (
                      <div key={role}>
                        <h3>{role === 'host' ? 'Host' : 'Guest'}</h3>
                        <CameraAccessoryRail label={'Aksesori ' + role} selected={activeDuoEffects.accessories[role]}
                          disabled={!canSetDuoEffects} onSelect={(id) => applyDuoEffect({ accessory: { role, id } })} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <CameraAccessoryRail label="Aksesori kamu" selected={soloAccessory} onSelect={setSoloAccessory} />
                )}
              </fieldset>
              <div className="classic-pose-thumbs" role="group" aria-label="Slot pose">
                {frames.slice(0, takeCount).map((fr, idx) => (
                  <button
                    key={fr.id}
                    type="button"
                    onClick={() => setCurrentShot(idx)}
                    aria-label={`Pose ${idx + 1}, ${fr.imageDataUrl ? "sudah difoto" : "kosong"}`}
                    aria-pressed={currentShot === idx}
                    disabled={busy}
                    className="surface-light"
                    style={{
                      width: takeCount > 4 ? 54 : 66,
                      height: takeCount > 4 ? 38 : 46,
                      padding: 0,
                      borderRadius: 12,
                      overflow: 'hidden',
                      border:
                        currentShot === idx
                          ? '3px solid #BC4374'
                          : '1.5px solid #18181B',
                      background: fr.accentBg,
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={`Pilih slot Pose #${idx + 1}`}
                  >
                    {mode === 'duo' && fr.imageDataUrl && fr.guestImageDataUrl ? (
                      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                        <img
                          src={fr.imageDataUrl}
                          alt={`${fr.label} Host`}
                          style={{ width: '50%', height: '100%', objectFit: 'cover' }}
                        />
                        <img
                          src={fr.guestImageDataUrl}
                          alt={`${fr.label} Guest`}
                          style={{ width: '50%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : fr.imageDataUrl ? (
                      <img
                        src={fr.imageDataUrl}
                        alt={fr.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#18181B',
                        }}
                      >
                        {idx + 1}/{takeCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {myPhoto && !busy && <figure className="pose-review"><img src={myPhoto} alt={'Hasil pose ' + (currentShot + 1)} /><figcaption>Hasil pose {currentShot + 1}</figcaption></figure>}
              <div className="classic-camera-actions">
                <button
                  type="button"
                  className="btn btn-lift"
                  style={{ minHeight: 46, padding: '8px 16px', fontSize: '0.84rem' }}
                  disabled={busy}
                  onClick={() => setMirror((m) => !m)}
                  title="Balik cermin kamera"
                >
                  🪞 {mirror ? 'Mirror ON' : 'Mirror OFF'}
                </button>

                {!myPhoto && !isDuo && <button type="button" className="btn btn-lift"
                  disabled={busy || waitingForAccessory || capturedCount > 0} onClick={triggerAutoCaptureSequence}>
                  Ambil semua otomatis
                </button>}
                {(!myPhoto || approved || !isDuo) && (!isDuo || activeRole === 'host') && (
                  <button type="button" className="btn btn-primary-pop" disabled={busy || waitingForAccessory ||
                    (isDuo && !(hostReady && guestReady)) || (!isDuo && Boolean(myPhoto) && retakesLeft === 0)}
                    onClick={() => triggerSingleShot()}>
                    {approved || myPhoto ? 'Ulang Foto' : 'Jepret Pose ' + (currentShot + 1)}
                  </button>
                )}
                {isDuo && myPhoto && !approved && <button type="button" className="btn btn-lift"
                  disabled={busy || retakesLeft === 0 || prompt?.status === 'pending'}
                  onClick={() => realtimeClient.requestRetake(currentShot + 1)}>
                  {activeRole === 'guest' ? 'Minta ulang ke Host' : 'Ulang Foto'}
                </button>}
                {myPhoto && <button type="button" className="btn btn-secondary-pop" disabled={busy || (isDuo && !(photo.imageDataUrl && photo.guestImageDataUrl))}
                  onClick={() => {
                    const next = frames.slice(0, takeCount).findIndex(f => !f.imageDataUrl || (isDuo && !f.guestImageDataUrl));
                    if (next < 0) onNavigate('editor');
                    else setCurrentShot(next);
                  }}>
                  Pakai Foto Ini
                </button>}
                {myPhoto && <small role="status">Pose {currentShot + 1} · {retakesLeft} dari 3 pengulangan tersisa</small>}
                {isDuo && prompt?.status === 'pending' && (activeRole === 'guest'
                  ? <p role="status">Menunggu persetujuan Host untuk pose {prompt.frameId}.</p>
                  : <><button className="btn btn-primary-pop" onClick={() => realtimeClient.decideRetake(prompt.requestId, true)}>Setujui ulang Guest</button>
                      <button className="btn btn-lift" onClick={() => realtimeClient.decideRetake(prompt.requestId, false)}>Pakai foto sebelumnya</button></>)}
                {isDuo && <p role="status">{approved ? 'Foto ulang disetujui. Tekan Ready di kedua perangkat.' :
                  activeRole === 'guest' ? 'Setelah Ready, tunggu Host memulai hitung mundur.' : 'Kedua peserta perlu Ready sebelum memotret.'}</p>}
              </div>
            </div>
            <fieldset className="flipbook-choice-panel flipbook-filter-panel" aria-label="Filter warna kamera"
              disabled={busy || (isDuo && !canSetDuoEffects)}>
              <h2>Filter</h2>
              <div className="flipbook-side-choices">
                {PHOTO_FILTER_PRESETS.map((filter) => (
                  <CameraChoice key={filter.id} label={filter.name} cssFilter={filter.cssFilter}
                    selected={selectedFilter === filter.id} onSelect={() => onChangeFilter(filter.id)} />
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {/* Inline Duo Invite Bar (Share Code + Share Link right under camera!) */}
        {mode === 'duo' && (
          <div
            className="clean-card card-tone-neutral"
            style={{
              marginTop: 14,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                className="pill-tag"
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  background: '#FFFFFF',
                  color: '#18181B',
                }}
              >
                🔒 Kode: {roomCode || "Menunggu room"} · {activeRole === "host" ? "Host" : "Guest"}
              </span>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {realtimeState?.webrtcState === 'connected'
                  ? '🟢 WebRTC Video Aktif'
                  : realtimeState?.webrtcState === 'relay'
                  ? '🟣 WebRTC TURN Relay Aktif'
                  : (liveSnapshot?.participants.length ?? 0) >= 2
                  ? '🟢 Partner Terhubung (2/2)'
                  : '⏳ Bagikan kode atau link ke 1 teman untuk masuk'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-lift"
                style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.76rem' }}
                disabled={!roomCode} onClick={() => handleCopy('code')}
              >
                {copiedType === 'code' ? '✓ Kode Disalin' : '📋 Salin Kode'}
              </button>
              <button
                type="button"
                className="btn btn-primary-pop"
                style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.76rem' }}
                disabled={!roomCode} onClick={() => handleCopy('link')}
              >
                {copiedType === 'link' ? '✓ Link Disalin!' : '🔗 Salin Link Undangan'}
              </button>
              <button
                type="button"
                className="btn btn-lift"
                style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.76rem' }}
                onClick={() => void realtimeClient.startWebRtcNegotiation()}
              >
                📡 Video P2P
              </button>
              <button
                type="button"
                className={`btn btn-lift ${
                  realtimeState?.forceTurnRelay ? 'active-pill' : ''
                }`}
                style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.76rem' }}
                onClick={() =>
                  realtimeClient.setForceTurnRelay(!realtimeState?.forceTurnRelay)
                }
              >
                🛡️ TURN: {realtimeState?.forceTurnRelay ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className="btn btn-lift surface-light"
                style={{
                  minHeight: 34,
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  background: hostReady && guestReady ? '#ECF3ED' : '#FFFFFF',
                  color: '#18181B',
                }}
                onClick={() => {
                  realtimeClient.setReady(!myReady);
                }}
              >
                {myReady ? 'Batalkan Ready' : 'Saya Ready'}
              </button>
            </div>
          </div>
        )}

      </section>
    </div>
  );
};
