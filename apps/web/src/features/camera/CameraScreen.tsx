import React, { useEffect, useRef, useState } from 'react';
import {
  PHOTO_FILTER_PRESETS,
  type BoothMode,
  type CameraPermissionState,
  type CapturedFrame,
  type PhotoFilterId,
  type ScreenId,
  type TemplateLayoutId,
} from '@momentos/shared';
import {
  captureVideoFrameToDataUrl,
  createSimulatedPoseDataUrl,
  getCssFilterById,
  listVideoInputDevices,
  startCameraStream,
  stopCameraStream,
} from '../../lib/mediaEngine';
import {
  realtimeClient,
  type RealtimeClientState,
} from '../../lib/realtimeClient';

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
  const [hostReady, setHostReady] = useState(true);
  const [guestReady, setGuestReady] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [currentShot, setCurrentShot] = useState(0);
  const [isAutoBursting, setIsAutoBursting] = useState(false);
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
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
  const streamRef = useRef<MediaStream | null>(null);
  const lastHandledAttemptRef = useRef<string | null>(null);

  const activeFilterCss = getCssFilterById(selectedFilter);
  const activeFilterObj =
    PHOTO_FILTER_PRESETS.find((f) => f.id === selectedFilter) ??
    PHOTO_FILTER_PRESETS[0];

  const activeRole = realtimeState?.role ?? 'host';
  const liveSnapshot = realtimeState?.snapshot;
  const roomCode = liveSnapshot?.code ?? 'MMT-4829';

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
        const stream = await startCameraStream(selectedDeviceId || undefined);
        if (!active) {
          stopCameraStream(stream);
          return;
        }
        streamRef.current = stream;
        realtimeClient.attachLocalStream(stream);
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
    if (remoteVideoRef.current && realtimeState?.remoteStream) {
      remoteVideoRef.current.srcObject = realtimeState.remoteStream;
    }
  }, [realtimeState?.remoteStream]);

  const performSnapAtIndex = (slotIdx: number) => {
    const targetFrame = frames[slotIdx];
    let dataUrl = '';

    if (!useSimulation && videoRef.current && videoRef.current.readyState >= 2) {
      dataUrl = captureVideoFrameToDataUrl(videoRef.current, {
        mirror,
        cssFilter: activeFilterCss,
      });
    } else if (targetFrame) {
      dataUrl = createSimulatedPoseDataUrl(
        activeRole === 'guest' ? targetFrame.guestPose : targetFrame.hostPose,
        `${targetFrame.label} (${activeRole.toUpperCase()})`,
        activeRole === 'guest' ? '#EBF4FD' : targetFrame.accentBg,
        activeFilterCss
      );
    }

    if (dataUrl) {
      setFlashActive(true);
      onCaptureFrame(slotIdx, dataUrl, activeRole);

      const hasLiveGuest =
        (realtimeState?.snapshot?.participants.length ?? 0) >= 2;
      if (mode === 'duo' && !hasLiveGuest && targetFrame) {
        const guestSimUrl = createSimulatedPoseDataUrl(
          targetFrame.guestPose,
          `${targetFrame.label} (GUEST)`,
          '#EBF4FD',
          activeFilterCss
        );
        onCaptureFrame(slotIdx, guestSimUrl, 'guest');
      }

      window.setTimeout(() => setFlashActive(false), 240);
    }
  };

  useEffect(() => {
    const sched = realtimeState?.lastScheduledCountdown;
    if (!sched || sched.attemptId === lastHandledAttemptRef.current) return;
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
      setCurrentShot((prev) => (prev + 1 < takeCount ? prev + 1 : 0));
    }, totalWaitMs);

    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t1);
      window.clearTimeout(t0);
    };
  }, [realtimeState?.lastScheduledCountdown]);

  const triggerSingleShot = (slotOverride?: number) => {
    if (countdown !== null || isAutoBursting) return;
    setShowFiltersPopover(false);
    const targetIndex = slotOverride ?? currentShot;

    if (mode === 'duo' && liveSnapshot) {
      realtimeClient.requestCountdown(targetIndex + 1);
      return;
    }

    const totalMs = countdownSec * 1000;
    const stepMs = Math.round(totalMs / countdownSec);
    let remaining: number = countdownSec;
    setCountdown(remaining);

    const tick = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        window.clearInterval(tick);
        setCountdown(null);
        performSnapAtIndex(targetIndex);
        setCurrentShot((prev) => (prev + 1 < takeCount ? prev + 1 : 0));
      }
    }, stepMs);
  };

  const triggerAutoCaptureSequence = () => {
    if (countdown !== null || isAutoBursting) return;
    setShowFiltersPopover(false);
    setIsAutoBursting(true);
    let idx = 0;

    const runStep = () => {
      setCurrentShot(idx);
      const stepWaitMs = countdownSec === 5 ? 850 : 520;
      setCountdown(3);
      window.setTimeout(() => setCountdown(2), stepWaitMs);
      window.setTimeout(() => setCountdown(1), stepWaitMs * 2);
      window.setTimeout(() => {
        setCountdown(null);
        performSnapAtIndex(idx);
        idx += 1;
        if (idx < takeCount) {
          window.setTimeout(runStep, 520);
        } else {
          setIsAutoBursting(false);
          setCurrentShot(0);
          window.setTimeout(() => {
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
    <div className="page-stack" style={{ maxWidth: 880, margin: '0 auto' }}>
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
          <div className="camera-stage-row">
            {/* Centered Rounded Viewfinder */}
            <div
              className={`camera-viewfinder-grid ${mode === 'duo' ? 'is-duo' : ''}`}
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
                  background: useSimulation ? '#FCEEF3' : '#09090B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  minHeight: 410,
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
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      maxHeight: 460,
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
                      {frames[currentShot]?.hostPose ?? '😊✌️'}
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#18181B' }}>
                      {mode === 'duo' ? 'Kamera Host (Simulasi)' : 'Kamera Simulasi'}
                    </div>
                  </div>
                )}
              </div>

              {/* Partner Split Feed in Duo Mode */}
              {mode === 'duo' && (
                <div
                  className={!realtimeState?.remoteStream ? 'surface-light' : undefined}
                  style={{
                    position: 'relative',
                    background: realtimeState?.remoteStream ? '#09090B' : '#EBF4FD',
                    borderLeft: '2px solid rgba(255,255,255,0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    minHeight: 410,
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
                    {realtimeState?.remoteStream
                      ? 'PARTNER LIVE WEBRTC'
                      : frames[currentShot]?.guestImageDataUrl
                      ? 'GUEST SYNCED ✓'
                      : 'GUEST FEED'}
                  </span>

                  {realtimeState?.remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        maxHeight: 460,
                        objectFit: 'cover',
                        filter: activeFilterCss,
                      }}
                    />
                  ) : frames[currentShot]?.guestImageDataUrl ? (
                    <img
                      src={frames[currentShot].guestImageDataUrl}
                      alt="Guest Synced"
                      style={{
                        width: '100%',
                        height: '100%',
                        maxHeight: 460,
                        objectFit: 'cover',
                        filter: activeFilterCss,
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
                        {frames[currentShot]?.guestPose ?? '😄🫶'}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#18181B' }}>
                        Menunggu kamera Guest
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom-Center Inside-Viewfinder Pill: Timer (3s / 5s) + 2/3/4/Custom Poses (Max 8) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                  background: 'rgba(24, 24, 27, 0.82)',
                  backdropFilter: 'blur(8px)',
                  padding: '5px 12px',
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 5,
                  color: '#FFFFFF',
                  maxWidth: '94%',
                }}
              >
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
              </div>
            </div>

            {/* Right-Side Vertical Captured Thumbnails (clean, no label inside!) */}
            <div
              className="camera-side-thumbs"
              style={
                takeCount > 4
                  ? {
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      width: 156,
                    }
                  : undefined
              }
            >
              {frames.slice(0, takeCount).map((fr, idx) => (
                <button
                  key={fr.id}
                  type="button"
                  onClick={() => setCurrentShot(idx)}
                  className="surface-light"
                  style={{
                    width: '100%',
                    height: takeCount > 4 ? 62 : 82,
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
                🔒 Kode: {roomCode}
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
                onClick={() => handleCopy('code')}
              >
                {copiedType === 'code' ? '✓ Kode Disalin' : '📋 Salin Kode'}
              </button>
              <button
                type="button"
                className="btn btn-primary-pop"
                style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.76rem' }}
                onClick={() => handleCopy('link')}
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
                  const next = !(hostReady && guestReady);
                  setHostReady(next);
                  setGuestReady(next);
                  realtimeClient.setReady(next);
                }}
              >
                {hostReady && guestReady ? '✓ Ready (2/2)' : 'Belum Ready'}
              </button>
            </div>
          </div>
        )}

        {/* Filter-Only Popover + Minimal Bottom Camera Controls */}
        <div
          style={{
            position: 'relative',
            marginTop: 18,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {showFiltersPopover && (
            <div
              className="clean-card surface-light"
              style={{
                width: '100%',
                maxWidth: 620,
                padding: '14px 16px',
                background: '#FFFFFF',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <strong style={{ fontSize: '0.84rem', color: '#18181B' }}>
                  ✨ Pilih Filter Kamera ({activeFilterObj.name})
                </strong>
                <button
                  type="button"
                  className="btn"
                  style={{ minHeight: 28, padding: '2px 10px', fontSize: '0.76rem' }}
                  onClick={() => setShowFiltersPopover(false)}
                >
                  ✕ Tutup
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {PHOTO_FILTER_PRESETS.map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    className={`btn btn-lift ${
                      selectedFilter === flt.id ? 'active-pill' : ''
                    }`}
                    style={{
                      minHeight: 36,
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onClick={() => onChangeFilter(flt.id)}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: flt.previewBg,
                        border: '1px solid #18181B',
                      }}
                    />
                    {flt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Primary Compact Shutter Row (Only Mirror, Filter Popover, Capture, & Finish) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn btn-lift"
              style={{ minHeight: 46, padding: '8px 16px', fontSize: '0.84rem' }}
              onClick={() => setMirror((m) => !m)}
              title="Balik cermin kamera"
            >
              🪞 {mirror ? 'Mirror ON' : 'Mirror OFF'}
            </button>

            <button
              type="button"
              className={`btn btn-lift ${showFiltersPopover ? 'active-pill' : ''}`}
              style={{ minHeight: 46, padding: '8px 16px', fontSize: '0.84rem' }}
              onClick={() => setShowFiltersPopover((prev) => !prev)}
            >
              ✨ Filter: {activeFilterObj.name}
            </button>

            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ minHeight: 50, padding: '10px 28px', fontSize: '0.96rem' }}
              disabled={
                countdown !== null ||
                isAutoBursting ||
                (mode === 'duo' && (!hostReady || !guestReady))
              }
              onClick={triggerAutoCaptureSequence}
            >
              {isAutoBursting
                ? `📸 Memotret ${currentShot + 1}/${takeCount}...`
                : `📷 Ambil Foto (${takeCount}× Otomatis)`}
            </button>

            <button
              type="button"
              className="btn btn-lift"
              style={{ minHeight: 46, padding: '8px 16px', fontSize: '0.84rem' }}
              disabled={
                countdown !== null ||
                isAutoBursting ||
                (mode === 'duo' && (!hostReady || !guestReady))
              }
              onClick={() => triggerSingleShot()}
            >
              Jepret Pose #{currentShot + 1}
            </button>

            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ minHeight: 46, padding: '8px 18px', fontSize: '0.84rem' }}
              onClick={() => onNavigate('editor')}
            >
              Lihat Hasil →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
