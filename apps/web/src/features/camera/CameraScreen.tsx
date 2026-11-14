import React, { useEffect, useRef, useState } from 'react';
import {
  PHOTO_FILTER_PRESETS,
  type BoothMode,
  type CameraPermissionState,
  type CapturedFrame,
  type PhotoFilterId,
  type ScreenId,
} from '@momentos/shared';
import { InstantCameraRig } from '../../components/InstantCameraRig';
import {
  captureVideoFrameToDataUrl,
  createSimulatedPoseDataUrl,
  getCssFilterById,
  listVideoInputDevices,
  startCameraStream,
  stopCameraStream,
} from '../../lib/mediaEngine';

interface CameraScreenProps {
  mode: BoothMode;
  isNight?: boolean;
  takeCount: 3 | 4;
  onChangeTakeCount: (count: 3 | 4) => void;
  selectedFilter: PhotoFilterId;
  onChangeFilter: (filter: PhotoFilterId) => void;
  frames: CapturedFrame[];
  onCaptureFrame: (frameIndex: number, dataUrl: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  mode,
  isNight = false,
  takeCount,
  onChangeTakeCount,
  selectedFilter,
  onChangeFilter,
  frames,
  onCaptureFrame,
  onNavigate,
}) => {
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>('granted');
  const [useSimulation, setUseSimulation] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [mirror, setMirror] = useState<boolean>(true);
  const [hostReady, setHostReady] = useState(true);
  const [guestReady, setGuestReady] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [currentShot, setCurrentShot] = useState(0); // 0..takeCount-1
  const [isAutoBursting, setIsAutoBursting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activeFilterCss = getCssFilterById(selectedFilter);

  useEffect(() => {
    let active = true;

    const initCamera = async () => {
      if (permissionState === 'denied' || useSimulation) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
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
            : 'Tidak dapat mengakses kamera webcam. Beralih ke Mode Simulasi.';
        setCameraError(msg);
        setUseSimulation(true);
      }
    };

    initCamera();

    return () => {
      active = false;
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    };
  }, [permissionState, useSimulation, selectedDeviceId]);

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
        mode === 'duo'
          ? `${targetFrame.hostPose} ${targetFrame.guestPose}`
          : targetFrame.hostPose,
        targetFrame.label,
        targetFrame.accentBg,
        activeFilterCss
      );
    }

    if (dataUrl) {
      setFlashActive(true);
      onCaptureFrame(slotIdx, dataUrl);
      window.setTimeout(() => setFlashActive(false), 260);
    }
  };

  const triggerSingleShot = (slotOverride?: number) => {
    if (countdown !== null) return;
    const targetIndex = slotOverride ?? currentShot;
    setCountdown(3);
    window.setTimeout(() => setCountdown(2), 550);
    window.setTimeout(() => setCountdown(1), 1100);
    window.setTimeout(() => {
      setCountdown(null);
      performSnapAtIndex(targetIndex);
      setCurrentShot((prev) => (prev + 1 < takeCount ? prev + 1 : 0));
    }, 1650);
  };

  const triggerAutoBurstAll = () => {
    if (countdown !== null || isAutoBursting) return;
    setIsAutoBursting(true);
    let idx = 0;

    const runStep = () => {
      setCurrentShot(idx);
      setCountdown(3);
      window.setTimeout(() => setCountdown(2), 450);
      window.setTimeout(() => setCountdown(1), 900);
      window.setTimeout(() => {
        setCountdown(null);
        performSnapAtIndex(idx);
        idx += 1;
        if (idx < takeCount) {
          window.setTimeout(runStep, 450);
        } else {
          setIsAutoBursting(false);
          setCurrentShot(0);
        }
      }, 1350);
    };

    runStep();
  };

  const capturedCount = frames.slice(0, takeCount).filter((f) => Boolean(f.imageDataUrl)).length;

  return (
    <div className="page-stack">
      <section>
        {/* Centered Clean Intro */}
        <div className="page-intro">
          <span className="eyebrow-text">Studio Kamera Asli · getUserMedia</span>
          <h1 className="heading-h1" style={{ marginBottom: 12 }}>
            {mode === 'duo'
              ? 'Kamera Duo Sinkron (Host + Guest)'
              : 'Kamera Solo Siap Bidik'}
          </h1>
          <p className="text-muted">
            Izinkan akses webcam untuk mengambil {takeCount} pose beresolusi tajam secara
            langsung di browser, lengkap dengan filter real-time.
          </p>
        </div>

        {/* Camera Toolbar: Real Webcam / Simulation / Devices / Mirror / Shot Count */}
        <div className="demo-state-strip" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn btn-lift ${
              permissionState === 'granted' && !useSimulation ? 'active-pill' : ''
            }`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => {
              setPermissionState('granted');
              setUseSimulation(false);
            }}
          >
            📷 Webcam Asli
          </button>

          <button
            type="button"
            className={`btn btn-lift ${
              permissionState === 'granted' && useSimulation ? 'active-pill' : ''
            }`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => {
              setPermissionState('granted');
              setUseSimulation(true);
            }}
          >
            🎭 Mode Simulasi
          </button>

          <button
            type="button"
            className={`btn btn-lift ${mirror ? 'active-pill' : ''}`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => setMirror((m) => !m)}
          >
            🪞 Mirror: {mirror ? 'ON' : 'OFF'}
          </button>

          {devices.length > 0 && !useSimulation && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              style={{
                height: 32,
                borderRadius: 999,
                border: '1.5px solid #18181B',
                padding: '0 10px',
                fontSize: '0.76rem',
                fontWeight: 600,
                background: '#FFFFFF',
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

          <button
            type="button"
            className={`btn btn-lift ${takeCount === 3 ? 'active-pill' : ''}`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => onChangeTakeCount(3)}
          >
            3 Pose
          </button>
          <button
            type="button"
            className={`btn btn-lift ${takeCount === 4 ? 'active-pill' : ''}`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => onChangeTakeCount(4)}
          >
            4 Pose
          </button>
        </div>

        {cameraError && (
          <div
            className="clean-card"
            style={{
              background: '#FEF3C7',
              borderColor: '#D97706',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: '0.84rem', color: '#78350F' }}>
              <strong>Kamera tidak terdeteksi / ditolak:</strong> {cameraError} — Saat ini
              memakai Mode Simulasi agar kamu tetap bisa mencoba alur lengkap hingga unduh.
            </div>
            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.76rem' }}
              onClick={() => {
                setCameraError(null);
                setUseSimulation(false);
              }}
            >
              Coba Aktifkan Webcam Lagi
            </button>
          </div>
        )}

        {permissionState === 'denied' ? (
          <div
            className="clean-card"
            style={{
              background: '#FCEEF3',
              textAlign: 'center',
              maxWidth: 680,
              margin: '0 auto',
            }}
          >
            <div className="squircle-icon" style={{ background: '#FFFFFF' }}>
              📷
            </div>
            <h2 className="heading-h1" style={{ marginBottom: 10 }}>
              Akses Kamera Belum Diizinkan
            </h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Momentos memerlukan izin kamera browser hanya selama sesi berlangsung. Klik ikon
              kunci/kamera pada address bar lalu pilih <strong>Izinkan</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                type="button"
                className="btn btn-primary-pop"
                onClick={() => setPermissionState('granted')}
              >
                Coba Minta Izin Lagi
              </button>
              <button
                type="button"
                className="btn btn-lift"
                onClick={() => onNavigate('home')}
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.55fr) minmax(290px, 0.85fr)',
              gap: 32,
              alignItems: 'start',
            }}
          >
            {/* Viewfinder Tajam */}
            <div className="clean-card" style={{ padding: 22 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {useSimulation ? '🎭 Simulasi Preview' : '🔴 Live Webcam'} · Target Pose{' '}
                  {currentShot + 1} dari {takeCount} ({capturedCount}/{takeCount} tersimpan)
                </span>

                {mode === 'duo' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-lift"
                      style={{
                        minHeight: 34,
                        padding: '4px 12px',
                        fontSize: '0.76rem',
                        background: hostReady ? '#ECF3ED' : '#FFFFFF',
                      }}
                      onClick={() => setHostReady((v) => !v)}
                    >
                      Host: {hostReady ? 'Ready' : 'Belum Siap'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-lift"
                      style={{
                        minHeight: 34,
                        padding: '4px 12px',
                        fontSize: '0.76rem',
                        background: guestReady ? '#ECF3ED' : '#FFFFFF',
                      }}
                      onClick={() => setGuestReady((v) => !v)}
                    >
                      Guest: {guestReady ? 'Ready' : 'Belum Siap'}
                    </button>
                  </div>
                )}
              </div>

              <div
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: mode === 'duo' ? '1fr 1fr' : '1fr',
                  gap: 14,
                  minHeight: 360,
                  padding: 12,
                  borderRadius: 18,
                  border: '1.5px solid #18181B',
                  background: '#18181B',
                  overflow: 'hidden',
                }}
              >
                {flashActive && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 20,
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
                      zIndex: 15,
                      background: 'rgba(24, 24, 27, 0.45)',
                      borderRadius: 16,
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
                        fontSize: '4.5rem',
                        fontWeight: 800,
                      }}
                    >
                      {countdown}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      Tahan Pose #{currentShot + 1}!
                    </div>
                  </div>
                )}

                {/* Primary Host / Solo Camera Feed */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    background: useSimulation ? '#FCEEF3' : '#09090B',
                    minHeight: 320,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {!useSimulation ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 320,
                        maxHeight: 400,
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
                      <div style={{ fontSize: '4.4rem', marginBottom: 10 }}>
                        {frames[currentShot]?.hostPose ?? '😊✌️'}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#52525B' }}>
                        {mode === 'duo' ? 'Host (Simulasi Lokal)' : 'Kamera Simulasi'} ·{' '}
                        {selectedFilter}
                      </div>
                    </div>
                  )}
                </div>

                {mode === 'duo' && (
                  <div
                    style={{
                      borderRadius: 14,
                      border: '1.5px solid #18181B',
                      background: '#EBF4FD',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                      filter: activeFilterCss,
                    }}
                  >
                    <div style={{ fontSize: '4.4rem', marginBottom: 10 }}>😄🫶</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#52525B' }}>
                      Guest (Remote WebRTC Tahap 4)
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail Slot Selector */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${takeCount}, 1fr)`,
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {frames.slice(0, takeCount).map((fr, idx) => (
                  <button
                    key={fr.id}
                    type="button"
                    onClick={() => setCurrentShot(idx)}
                    style={{
                      padding: 0,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border:
                        currentShot === idx
                          ? '2.5px solid #BC4374'
                          : '1.5px solid rgba(24,24,27,0.25)',
                      background: fr.accentBg,
                      height: 68,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {fr.imageDataUrl ? (
                      <img
                        src={fr.imageDataUrl}
                        alt={fr.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                        {fr.label}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Floating Glass Control Dock */}
              <div
                className="glass-bar"
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PHOTO_FILTER_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`btn btn-lift ${
                        selectedFilter === f.id ? 'active-pill' : ''
                      }`}
                      style={{
                        minHeight: 34,
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      title={f.description}
                      onClick={() => onChangeFilter(f.id)}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: f.previewBg,
                          border: '1px solid rgba(24,24,27,0.35)',
                          display: 'inline-block',
                        }}
                      />
                      {f.name}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary-pop"
                    disabled={
                      countdown !== null ||
                      isAutoBursting ||
                      (mode === 'duo' && (!hostReady || !guestReady))
                    }
                    onClick={() => triggerSingleShot()}
                  >
                    📸 Foto Pose {currentShot + 1}/{takeCount}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary-pop"
                    disabled={
                      countdown !== null ||
                      isAutoBursting ||
                      (mode === 'duo' && (!hostReady || !guestReady))
                    }
                    onClick={triggerAutoBurstAll}
                  >
                    ⚡ Otomatis {takeCount}×
                  </button>

                  <button
                    type="button"
                    className="btn btn-lift"
                    onClick={() => onNavigate('review')}
                  >
                    Review &amp; Edit →
                  </button>

                  <button
                    type="button"
                    className="btn btn-lift"
                    onClick={() => onNavigate('flipbook')}
                  >
                    🎞️ Flipbook
                  </button>
                </div>
              </div>
            </div>

            {/* Kamera Cetak Strip Terbuka */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <InstantCameraRig
                mode={mode}
                isNight={isNight}
                badgeText={`TAKE ${currentShot + 1}/${takeCount}`}
                caption={`FILTER: ${selectedFilter.toUpperCase()}`}
                frames={frames.slice(0, takeCount).map((fr) => ({
                  id: fr.id,
                  label: fr.label,
                  hostPose: fr.hostPose,
                  guestPose: fr.guestPose,
                  bg: fr.accentBg,
                  imageDataUrl: fr.imageDataUrl,
                }))}
                onTriggerShutter={() => triggerSingleShot()}
              />
            </div>
          </div>
        )}
      </section>

      {/* Tips Pengambilan Foto */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Tips Studio</span>
          <h2 className="heading-h1">Biar hasil fotomu makin maksimal.</h2>
        </div>

        <div className="grid-3">
          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#FCEEF3' }}>
              💡
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Cahaya dari Depan
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Hadapkan wajah ke arah lampu atau jendela agar kamera menangkap warna kulit
              dan ekspresi secara jelas tanpa noise.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              ⏱️
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Capture Lokal Tajam
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Hasil foto langsung dicuplik dari feed webcam resolusi tinggi ke Canvas 2D
              tanpa kompresi ulang.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#ECF3ED' }}>
              🔄
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Bisa Retake Setelahnya
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Klik salah satu kotak thumbnail pose di bawah kamera untuk memotret ulang
              slot tertentu kapan saja sebelum dicetak.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
