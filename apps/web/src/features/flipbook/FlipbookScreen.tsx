import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FLIPBOOK_OVERLAY_EFFECTS,
  FLIPBOOK_PRESETS,
  PHOTO_FILTER_PRESETS,
  type BoothMode,
  type ExportStatus,
  type FlipbookEffectOverlayId,
  type FlipbookPoseMode,
  type FlipbookPresetId,
  type PhotoFilterId,
  type ScreenId,
} from '@momentos/shared';
import {
  captureFlipbookFrameDataUrl,
  encodeAnimatedGifBlob,
  getCssFilterById,
  recordCanvasVideoBlob,
  startCameraStream,
  stopCameraStream,
  triggerFileDownload,
} from '../../lib/mediaEngine';

interface FlipbookScreenProps {
  mode: BoothMode;
  selectedFilter: PhotoFilterId;
  onChangeFilter: (filter: PhotoFilterId) => void;
  onNavigate: (screen: ScreenId) => void;
}

const TOTAL_FRAMES = 30;
const TARGET_FPS = 10;

const POSE_SEQUENCE_EMOJIS_SOLO = [
  '👋😊', '👋😄', '😊✨', '✌️😊', '✌️😁', '😉✌️', '🫶😊', '🫶😍', '🥳🎉', '😎🔥',
];

const POSE_SEQUENCE_EMOJIS_DUO = [
  '👋😊 · 😄👋',
  '✌️😁 · 😆✌️',
  '🫶😊 · 😍🫶',
  '🥳✨ · 🎉😄',
  '😉🔥 · 😎✨',
];

export const FlipbookScreen: React.FC<FlipbookScreenProps> = ({
  mode,
  selectedFilter,
  onChangeFilter,
  onNavigate,
}) => {
  const [presetId, setPresetId] = useState<FlipbookPresetId>('retro-bounce');
  const [poseMode, setPoseMode] = useState<FlipbookPoseMode>('guided');
  const [overlayId, setOverlayId] = useState<FlipbookEffectOverlayId>('confetti-burst');

  // Real camera vs simulation
  const [useSimulation, setUseSimulation] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Recording & captured 30-frame buffer
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState<number>(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [retakesLeft, setRetakesLeft] = useState<number>(3);

  // Playback & physical thumb-flip state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrame, setCurrentFrame] = useState<number>(0); // 0..29
  const [playbackSpeed, setPlaybackSpeed] = useState<'0.5x' | '1x' | '1.5x' | 'bounce'>('1x');
  const [bounceDirection, setBounceDirection] = useState<1 | -1>(1);

  // Independent export isolation states (AC-FB-12 / AC-FB-13)
  const [gifStatus, setGifStatus] = useState<ExportStatus>('idle');
  const [mp4Status, setMp4Status] = useState<ExportStatus>('idle');
  const [lastVideoExt, setLastVideoExt] = useState<'mp4' | 'webm'>('mp4');

  const activePreset = useMemo(
    () => FLIPBOOK_PRESETS.find((p) => p.id === presetId) ?? FLIPBOOK_PRESETS[0],
    [presetId]
  );

  const activeFilter = useMemo(
    () => PHOTO_FILTER_PRESETS.find((f) => f.id === selectedFilter) ?? PHOTO_FILTER_PRESETS[0],
    [selectedFilter]
  );

  const activeOverlay = useMemo(
    () =>
      FLIPBOOK_OVERLAY_EFFECTS.find((o) => o.id === overlayId) ?? FLIPBOOK_OVERLAY_EFFECTS[0],
    [overlayId]
  );

  const isOverlayIncompatible = activePreset.incompatibleOverlays.includes(overlayId);
  const activeFrameTotal = capturedFrames.length > 0 ? capturedFrames.length : TOTAL_FRAMES;

  // Start / Stop live webcam feed when reviewing live camera (before/during recording)
  useEffect(() => {
    let active = true;

    const initCam = async () => {
      if (useSimulation) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
        return;
      }
      try {
        setCameraError(null);
        stopCameraStream(streamRef.current);
        const stream = await startCameraStream();
        if (!active) {
          stopCameraStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!active) return;
        setCameraError(
          err instanceof Error
            ? err.message
            : 'Webcam tidak tersedia — memakai Mode Simulasi.'
        );
        setUseSimulation(true);
      }
    };

    initCam();

    return () => {
      active = false;
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    };
  }, [useSimulation, capturedFrames.length]);

  // Playback loop for reviewed sequence
  useEffect(() => {
    if (!isPlaying || isRecording) return;

    const intervalMs =
      playbackSpeed === '0.5x' ? 190 : playbackSpeed === '1.5x' ? 65 : 100;

    const timer = window.setInterval(() => {
      setCurrentFrame((prev) => {
        if (playbackSpeed === 'bounce') {
          if (prev >= activeFrameTotal - 1) {
            setBounceDirection(-1);
            return Math.max(0, activeFrameTotal - 2);
          }
          if (prev <= 0) {
            setBounceDirection(1);
            return 1;
          }
          return prev + bounceDirection;
        }
        return (prev + 1) % activeFrameTotal;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, isRecording, playbackSpeed, bounceDirection, activeFrameTotal]);

  // Real 3.0s burst recording @ 10 fps -> 30 discrete composited PNG frames
  useEffect(() => {
    if (!isRecording) return;
    setRecordedCount(0);
    setCapturedFrames([]);
    setCurrentFrame(0);

    const collected: string[] = [];
    const cssFilter = getCssFilterById(selectedFilter);

    const captureTimer = window.setInterval(() => {
      const idx = collected.length;
      const emoji =
        mode === 'duo'
          ? POSE_SEQUENCE_EMOJIS_DUO[Math.floor(idx / 6) % POSE_SEQUENCE_EMOJIS_DUO.length]
          : POSE_SEQUENCE_EMOJIS_SOLO[Math.floor(idx / 3) % POSE_SEQUENCE_EMOJIS_SOLO.length];

      const frameUrl = captureFlipbookFrameDataUrl({
        videoEl: useSimulation ? null : videoRef.current,
        fallbackEmoji: emoji,
        frameIndex: idx,
        totalFrames: TOTAL_FRAMES,
        cssFilter,
        overlayId,
        mirror,
        paperColor: activePreset.paperColor,
        accentHex: activePreset.accentHex,
      });

      if (frameUrl) collected.push(frameUrl);
      setRecordedCount(collected.length);
      setCurrentFrame(idx);

      if (collected.length >= TOTAL_FRAMES) {
        window.clearInterval(captureTimer);
        setCapturedFrames(collected);
        setIsRecording(false);
        setIsPlaying(true);
      }
    }, 100);

    return () => window.clearInterval(captureTimer);
  }, [isRecording]);

  const ensureFramesReady = (): string[] => {
    if (capturedFrames.length > 0) return capturedFrames;
    const cssFilter = getCssFilterById(selectedFilter);
    return Array.from({ length: TOTAL_FRAMES }).map((_, idx) =>
      captureFlipbookFrameDataUrl({
        videoEl: null,
        fallbackEmoji:
          mode === 'duo'
            ? POSE_SEQUENCE_EMOJIS_DUO[Math.floor(idx / 6) % POSE_SEQUENCE_EMOJIS_DUO.length]
            : POSE_SEQUENCE_EMOJIS_SOLO[Math.floor(idx / 3) % POSE_SEQUENCE_EMOJIS_SOLO.length],
        frameIndex: idx,
        totalFrames: TOTAL_FRAMES,
        cssFilter,
        overlayId,
        mirror,
        paperColor: activePreset.paperColor,
        accentHex: activePreset.accentHex,
      })
    );
  };

  const handleSelectPreset = (nextId: FlipbookPresetId) => {
    setPresetId(nextId);
    const nextPreset = FLIPBOOK_PRESETS.find((p) => p.id === nextId);
    if (nextPreset) {
      onChangeFilter(nextPreset.recommendedFilter);
    }
  };

  const handleTriggerRecord = () => {
    setCapturedFrames([]);
    setIsPlaying(false);
    setGifStatus('idle');
    setMp4Status('idle');
    setIsRecording(true);
  };

  const handleFullRetake = () => {
    if (retakesLeft <= 0 || isRecording) return;
    setRetakesLeft((prev) => prev - 1);
    handleTriggerRecord();
  };

  const handleExportFormat = async (format: 'gif' | 'mp4', forceError = false) => {
    const setter = format === 'gif' ? setGifStatus : setMp4Status;
    setter('rendering');

    if (forceError) {
      window.setTimeout(() => setter('error'), 500);
      return;
    }

    try {
      const framesToEncode = ensureFramesReady();
      if (format === 'gif') {
        const delayMs =
          playbackSpeed === '0.5x' ? 190 : playbackSpeed === '1.5x' ? 65 : 100;
        const blob = await encodeAnimatedGifBlob(framesToEncode, delayMs);
        triggerFileDownload(blob, `momentos-flipbook-${presetId}.gif`);
      } else {
        const fps = playbackSpeed === '0.5x' ? 5 : playbackSpeed === '1.5x' ? 15 : TARGET_FPS;
        const { blob, ext } = await recordCanvasVideoBlob(framesToEncode, fps);
        setLastVideoExt(ext);
        triggerFileDownload(blob, `momentos-flipbook-${presetId}.${ext}`);
      }
      setter('success');
    } catch {
      setter('error');
    }
  };

  const currentBeat = Math.min(2, Math.floor(currentFrame / 10));
  const poseEmoji =
    mode === 'duo'
      ? POSE_SEQUENCE_EMOJIS_DUO[Math.floor(currentFrame / 6) % POSE_SEQUENCE_EMOJIS_DUO.length]
      : POSE_SEQUENCE_EMOJIS_SOLO[Math.floor(currentFrame / 3) % POSE_SEQUENCE_EMOJIS_SOLO.length];

  const isDarkPaper = activePreset.id === 'neon-disco';
  const showLiveFeed = !useSimulation && (capturedFrames.length === 0 || isRecording);

  return (
    <div className="page-stack">
      {/* Header & Mode Switch */}
      <section>
        <div className="page-intro">
          <span className="eyebrow-text">Mode Flipbook Nyata • Video-to-Frame 10 FPS</span>
          <h1 className="heading-h1" style={{ marginBottom: 12 }}>
            Ubah 3 detik ekspresimu menjadi{' '}
            <span className="font-upright-serif">flipbook</span> estetik.
          </h1>
          <p className="text-muted">
            Rekam langsung lewat webcam dengan efek interaktif menyala. Browser mencuplik 30
            frame tercomposisi @ 10 FPS, lalu menyusunnya menjadi file GIF &amp; video asli.
          </p>
        </div>

        {/* Camera Source Controls */}
        <div className="demo-state-strip" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn btn-lift ${!useSimulation ? 'active-pill' : ''}`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => setUseSimulation(false)}
          >
            📷 Webcam Asli
          </button>
          <button
            type="button"
            className={`btn btn-lift ${useSimulation ? 'active-pill' : ''}`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => setUseSimulation(true)}
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
        </div>

        {cameraError && (
          <div
            className="clean-card"
            style={{
              background: '#FEF3C7',
              borderColor: '#D97706',
              marginBottom: 20,
              fontSize: '0.84rem',
              color: '#78350F',
            }}
          >
            <strong>Webcam tidak tersedia:</strong> {cameraError} — Memakai Mode Simulasi agar
            ekspor GIF/Video tetap bisa dicoba.
          </div>
        )}

        {/* AC-FB-04 Non-blocking Compatibility Alert */}
        {isOverlayIncompatible && (
          <div
            className="clean-card"
            style={{
              background: '#FEF3C7',
              borderColor: '#D97706',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <strong style={{ color: '#92400E', display: 'block', marginBottom: 4 }}>
                ⚠️ Efek "{activeOverlay.label}" kurang selaras dengan preset "
                {activePreset.name}"
              </strong>
              <span style={{ fontSize: '0.86rem', color: '#78350F' }}>
                Untuk menjaga keterbacaan visual kertas &amp; grain preset ini, disarankan
                menggunakan overlay yang lebih bersih atau ganti ke preset lain.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ minHeight: 38, padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => setOverlayId('none')}
            >
              Sesuaikan Otomatis (Clean Frame)
            </button>
          </div>
        )}

        {/* Main Studio Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 0.92fr) minmax(0, 1.38fr)',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* LEFT PANEL: Preset Explorer, Pose Mode, Interactive Overlay & Filters */}
          <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 8 }}>
                1. GAYA ABA-ABA POSE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-lift ${poseMode === 'guided' ? 'active-pill' : ''}`}
                  style={{ minHeight: 40, fontSize: '0.8rem' }}
                  onClick={() => setPoseMode('guided')}
                >
                  🧭 Guided (3 Beat)
                </button>
                <button
                  type="button"
                  className={`btn btn-lift ${poseMode === 'freestyle' ? 'active-pill' : ''}`}
                  style={{ minHeight: 40, fontSize: '0.8rem' }}
                  onClick={() => setPoseMode('freestyle')}
                >
                  🕺 Freestyle Bebas
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 8 }}>
                2. TEMA BUKU FLIPBOOK (8 PRESET)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {FLIPBOOK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`btn btn-lift ${presetId === preset.id ? 'active-pill' : ''}`}
                    style={{
                      minHeight: 44,
                      padding: '6px 10px',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      textAlign: 'left',
                    }}
                    title={preset.subtitle}
                    onClick={() => handleSelectPreset(preset.id)}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: preset.binderColor,
                        border: `2px solid ${preset.accentHex}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ lineHeight: 1.2 }}>{preset.name}</span>
                  </button>
                ))}
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
                {activePreset.subtitle}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 8 }}>
                3. EFEK INTERAKTIF SAAT BERPOSE
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FLIPBOOK_OVERLAY_EFFECTS.map((ov) => {
                  const clash = activePreset.incompatibleOverlays.includes(ov.id);
                  return (
                    <button
                      key={ov.id}
                      type="button"
                      className={`btn btn-lift ${overlayId === ov.id ? 'active-pill' : ''}`}
                      style={{
                        minHeight: 34,
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        opacity: clash ? 0.72 : 1,
                      }}
                      title={ov.description}
                      onClick={() => setOverlayId(ov.id)}
                    >
                      {ov.icon} {ov.label} {clash ? '⚠️' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 8 }}>
                4. FILTER WARNA (SYNC CANVAS 2D)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PHOTO_FILTER_PRESETS.map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    className={`btn btn-lift ${selectedFilter === flt.id ? 'active-pill' : ''}`}
                    style={{
                      minHeight: 32,
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                    onClick={() => onChangeFilter(flt.id)}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: flt.previewBg,
                        border: '1px solid rgba(0,0,0,0.28)',
                      }}
                    />
                    {flt.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary-pop"
                disabled={isRecording}
                onClick={handleTriggerRecord}
              >
                {isRecording
                  ? `🔴 Mencuplik Canvas (${recordedCount}/${TOTAL_FRAMES} frame)...`
                  : capturedFrames.length > 0
                  ? '🎬 Rekam Ulang Sequence Baru (3.0s)'
                  : '🎬 Mulai Rekam Flipbook (3.0s · 10 FPS)'}
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary-pop"
                  style={{ flex: 1, fontSize: '0.82rem' }}
                  disabled={retakesLeft <= 0 || isRecording}
                  onClick={handleFullRetake}
                >
                  🔄 Retake Penuh ({retakesLeft}/3)
                </button>
                <button
                  type="button"
                  className="btn btn-lift"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => onNavigate('camera')}
                >
                  ← Mode Classic
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Aesthetic Spiral-Bound Flipbook Preview + Scrubber + Real Export */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div
              className="clean-card"
              style={{
                background: '#FFFFFF',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 18,
              }}
            >
              <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    bottom: -8,
                    left: 14,
                    right: -10,
                    borderRadius: 20,
                    background: '#DFD5C6',
                    border: '1.5px solid #B7AA98',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 5,
                    bottom: -4,
                    left: 7,
                    right: -5,
                    borderRadius: 20,
                    background: '#EDE5D9',
                    border: '1.5px solid #C6BAA9',
                  }}
                />

                <div
                  style={{
                    position: 'relative',
                    background: activePreset.paperColor,
                    color: isDarkPaper ? '#FAF7F2' : '#18181B',
                    border: `2px solid ${activePreset.binderColor}`,
                    borderRadius: 20,
                    padding: '18px 20px 18px 46px',
                    boxShadow: '0 14px 32px rgba(24,24,27,0.12)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: 32,
                      background: activePreset.binderColor,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-evenly',
                      alignItems: 'center',
                      padding: '10px 0',
                    }}
                  >
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 22,
                          height: 10,
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #F3EFEA, #9D958C, #3A3531)',
                          marginLeft: -8,
                          boxShadow: '2px 2px 3px rgba(0,0,0,0.35)',
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ color: activePreset.accentHex }}>
                      {activePreset.name.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'monospace', opacity: 0.8 }}>
                      FRM {String(currentFrame + 1).padStart(2, '0')}/{activeFrameTotal} •{' '}
                      {TARGET_FPS} FPS
                    </span>
                  </div>

                  {/* Motion Canvas Aperture */}
                  <div
                    style={{
                      position: 'relative',
                      height: 270,
                      borderRadius: 14,
                      border: `1.5px solid ${activePreset.accentHex}`,
                      background: isDarkPaper ? '#2A2736' : '#FFFFFF',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {capturedFrames.length > 0 && capturedFrames[currentFrame] ? (
                      <img
                        src={capturedFrames[currentFrame]}
                        alt={`Flipbook Frame ${currentFrame + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : showLiveFeed ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: mirror ? 'scaleX(-1)' : 'none',
                          filter: activeFilter.cssFilter,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          filter: activeFilter.cssFilter,
                        }}
                      >
                        <div style={{ fontSize: '3.6rem' }}>{poseEmoji}</div>
                      </div>
                    )}

                    {/* Guided prompt pill over webcam during live/recording */}
                    {capturedFrames.length === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '4px 12px',
                          borderRadius: 999,
                          background: 'rgba(255,255,255,0.9)',
                          color: '#18181B',
                          border: '1px solid rgba(24,24,27,0.18)',
                        }}
                      >
                        {poseMode === 'guided'
                          ? activePreset.guidedPrompts[currentBeat]
                          : `Freestyle Beat #${currentBeat + 1} • Bebas Bergaya`}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.76rem',
                    }}
                  >
                    <span className="font-upright-serif" style={{ fontSize: '1.05rem' }}>
                      Momentos Flipbook
                    </span>
                    <span style={{ opacity: 0.72 }}>
                      {capturedFrames.length > 0
                        ? `${capturedFrames.length} Frame Tersimpan`
                        : `Filter: ${activeFilter.name} • ${activeOverlay.label}`}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary-pop"
                    style={{ minHeight: 36, padding: '4px 14px', fontSize: '0.78rem' }}
                    onClick={() => setIsPlaying((p) => !p)}
                  >
                    {isPlaying ? '⏸ Jeda Flip' : '▶ Putar Loop'}
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['0.5x', '1x', '1.5x', 'bounce'] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        className={`btn ${playbackSpeed === spd ? 'active-pill' : ''}`}
                        style={{ minHeight: 32, padding: '3px 10px', fontSize: '0.74rem' }}
                        onClick={() => setPlaybackSpeed(spd)}
                      >
                        {spd === 'bounce' ? '🔁 Bounce' : spd}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    <span>Geser Halaman (Thumb-Flip Review)</span>
                    <span>
                      Frame {currentFrame + 1} dari {activeFrameTotal} (
                      {((currentFrame + 1) / TARGET_FPS).toFixed(1)}s)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={activeFrameTotal - 1}
                    value={currentFrame}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentFrame(Number(e.target.value));
                    }}
                    style={{ width: '100%', accentColor: '#BC4374' }}
                  />
                </div>
              </div>
            </div>

            {/* FB-07: Dual Isolated Real Export Panel (GIF & Video MP4/WebM) */}
            <div className="clean-card">
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 12 }}>
                EKSPOR NYATA FLIPBOOK (GIF &amp; VIDEO TERISOLASI)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div
                  style={{
                    border: '1.5px solid #E4E4E7',
                    borderRadius: 14,
                    padding: 14,
                    background: '#FAF9F6',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>
                    Animated GIF (GIF89a)
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.76rem', marginBottom: 10 }}>
                    Enkoder GIF murni di browser untuk loop otomatis di chat &amp; Stories.
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary-pop"
                      style={{ minHeight: 36, padding: '6px 14px', fontSize: '0.78rem' }}
                      disabled={gifStatus === 'rendering' || isRecording}
                      onClick={() => handleExportFormat('gif', false)}
                    >
                      {gifStatus === 'rendering'
                        ? 'Menyusun GIF...'
                        : gifStatus === 'success'
                        ? '✓ GIF Diunduh (Lagi)'
                        : 'Unduh GIF Asli'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ minHeight: 36, padding: '4px 10px', fontSize: '0.72rem' }}
                      onClick={() => handleExportFormat('gif', true)}
                    >
                      Uji Gagal
                    </button>
                  </div>
                  {gifStatus === 'error' && (
                    <div style={{ color: '#B91C1C', fontSize: '0.74rem', marginTop: 6 }}>
                      Gagal merender GIF. Klik "Unduh GIF Asli" untuk retry tanpa mengganggu
                      Video.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    border: '1.5px solid #E4E4E7',
                    borderRadius: 14,
                    padding: 14,
                    background: '#FAF9F6',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>
                    Video MP4 / WebM
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.76rem', marginBottom: 10 }}>
                    Direkam via Canvas captureStream sesuai codec native browser.
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary-pop"
                      style={{ minHeight: 36, padding: '6px 14px', fontSize: '0.78rem' }}
                      disabled={mp4Status === 'rendering' || isRecording}
                      onClick={() => handleExportFormat('mp4', false)}
                    >
                      {mp4Status === 'rendering'
                        ? 'Merekam Video...'
                        : mp4Status === 'success'
                        ? `✓ .${lastVideoExt.toUpperCase()} Diunduh`
                        : 'Unduh Video Asli'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ minHeight: 36, padding: '4px 10px', fontSize: '0.72rem' }}
                      onClick={() => handleExportFormat('mp4', true)}
                    >
                      Uji Gagal
                    </button>
                  </div>
                  {mp4Status === 'error' && (
                    <div style={{ color: '#B91C1C', fontSize: '0.74rem', marginTop: 6 }}>
                      Gagal encoding video. Retry terisolasi — hasil GIF tetap aman tersimpan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
