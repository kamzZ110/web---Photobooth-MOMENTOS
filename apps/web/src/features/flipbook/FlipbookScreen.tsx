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
import { MiniCameraStripIcon } from '../../components/InstantCameraRig';
import {
  buildFlipbookGifSequenceWithCover,
  captureFlipbookFrameDataUrl,
  encodeAnimatedGifBlob,
  getCssFilterById,
  recordCanvasVideoBlob,
  renderFlipbookCoverDataUrl,
  startCameraStream,
  stopCameraStream,
  triggerFileDownload,
} from '../../lib/mediaEngine';
import {
  realtimeClient,
  type RealtimeClientState,
} from '../../lib/realtimeClient';

interface FlipbookScreenProps {
  mode: BoothMode;
  onChangeMode?: (mode: BoothMode) => void;
  realtimeState?: RealtimeClientState;
  selectedFilter: PhotoFilterId;
  onChangeFilter: (filter: PhotoFilterId) => void;
  onNavigate: (screen: ScreenId) => void;
}

type FlipbookStep = 1 | 2 | 3 | 4 | 5 | 6;

const TOTAL_FRAMES = 60;
const CAPTURE_FPS = 6;
const CAPTURE_INTERVAL_MS = 166; // ~60 frames in 10 seconds (6 FPS)
const CAPTURE_WIDTH = 420;
const CAPTURE_HEIGHT = 315;
const GIF_PAGE_DELAY_MS = 85; // ~12 FPS fast book flip

const FLIPBOOK_STEPS: Array<{ step: FlipbookStep; num: string; label: string }> = [
  { step: 1, num: '01', label: 'Cara Kerja & Efek' },
  { step: 2, num: '02', label: 'Pilih Mode' },
  { step: 3, num: '03', label: 'Tema & Filter' },
  { step: 4, num: '04', label: 'Take Flipbook' },
  { step: 5, num: '05', label: 'Preview & Retake' },
  { step: 6, num: '06', label: 'Unduh .GIF' },
];

const POSE_SEQUENCE_EMOJIS_SOLO = [
  '👋😊',
  '👋😄',
  '😊✨',
  '✌️😊',
  '✌️😁',
  '😉✌️',
  '🫶😊',
  '🫶😍',
  '🥳🎉',
  '😎🔥',
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
  onChangeMode,
  realtimeState,
  selectedFilter,
  onChangeFilter,
  onNavigate,
}) => {
  const [step, setStep] = useState<FlipbookStep>(1);
  const [presetId, setPresetId] = useState<FlipbookPresetId>('retro-bounce');
  const [poseMode, setPoseMode] = useState<FlipbookPoseMode>('guided');
  const [overlayId, setOverlayId] = useState<FlipbookEffectOverlayId>('confetti-burst');

  // Step 1 Interactive Showcase animation tick
  const [showcaseTick, setShowcaseTick] = useState<number>(0);

  // Step 2 Duo Host / Guest Join states (no name input!)
  const [guestInputCode, setGuestInputCode] = useState('');
  const [copiedType, setCopiedType] = useState<'none' | 'code' | 'link'>('none');

  // Step 4 Camera & Recording states (420x315, 60 frames in 10s @ 6 FPS)
  const [useSimulation, setUseSimulation] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState<number>(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [retakesLeft, setRetakesLeft] = useState<number>(3);

  // Step 5 & 6 Playback & Cover Preview states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrame, setCurrentFrame] = useState<number>(0); // 0..59
  const [playbackSpeed, setPlaybackSpeed] = useState<'0.5x' | '1x' | '1.5x' | 'bounce'>('1x');
  const [bounceDirection, setBounceDirection] = useState<1 | -1>(1);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>('');
  const [showCoverInStep6, setShowCoverInStep6] = useState<boolean>(false);

  // Step 6 Async Export states with % progress
  const [gifStatus, setGifStatus] = useState<ExportStatus>('idle');
  const [gifProgress, setGifProgress] = useState<number>(0);
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

  const liveSnapshot = realtimeState?.snapshot;
  const roomCode = liveSnapshot?.code ?? 'MMT-4829';
  const shareInviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?room=${roomCode}&flow=flipbook`
      : `?room=${roomCode}&flow=flipbook`;

  // Step 1 mini showcase animation loop
  useEffect(() => {
    if (step !== 1) return;
    const t = window.setInterval(() => {
      setShowcaseTick((prev) => (prev + 1) % 24);
    }, 140);
    return () => window.clearInterval(t);
  }, [step]);

  // Pre-render the closed book cover preview whenever preset changes
  useEffect(() => {
    let active = true;
    void renderFlipbookCoverDataUrl({
      width: CAPTURE_WIDTH,
      height: CAPTURE_HEIGHT,
      title: activePreset.name,
      subtitle: activePreset.subtitle,
      binderColor: activePreset.binderColor,
      paperColor: activePreset.paperColor,
      accentHex: activePreset.accentHex,
      openProgress: 0,
    }).then((url) => {
      if (active) setCoverPreviewUrl(url);
    });
    return () => {
      active = false;
    };
  }, [activePreset]);

  // Start / Stop live webcam feed when on Step 4 (Take Flipbook)
  useEffect(() => {
    let active = true;

    if (step !== 4) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      return;
    }

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
        realtimeClient.attachLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!active) return;
        setCameraError(
          err instanceof Error
            ? err.message
            : 'Webcam tidak tersedia — memakai preview simulasi otomatis.'
        );
        setUseSimulation(true);
      }
    };

    void initCam();

    return () => {
      active = false;
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    };
  }, [step, useSimulation]);

  useEffect(() => {
    if (remoteVideoRef.current && realtimeState?.remoteStream) {
      remoteVideoRef.current.srcObject = realtimeState.remoteStream;
    }
  }, [realtimeState?.remoteStream, step]);

  // Playback loop for Step 5 & Step 6
  useEffect(() => {
    if ((step !== 5 && step !== 6) || !isPlaying || isRecording || showCoverInStep6) return;

    const intervalMs =
      playbackSpeed === '0.5x' ? 160 : playbackSpeed === '1.5x' ? 55 : GIF_PAGE_DELAY_MS;

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
  }, [step, isPlaying, isRecording, playbackSpeed, bounceDirection, activeFrameTotal, showCoverInStep6]);

  // Step 4: Record 60 frames over 10 seconds (~6 FPS, 166ms/frame) at 420x315 px
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
          ? POSE_SEQUENCE_EMOJIS_DUO[Math.floor(idx / 12) % POSE_SEQUENCE_EMOJIS_DUO.length]
          : POSE_SEQUENCE_EMOJIS_SOLO[Math.floor(idx / 6) % POSE_SEQUENCE_EMOJIS_SOLO.length];

      const frameUrl = captureFlipbookFrameDataUrl({
        videoEl: useSimulation ? null : videoRef.current,
        guestVideoEl: useSimulation ? null : remoteVideoRef.current,
        mode,
        fallbackEmoji: emoji,
        frameIndex: idx,
        totalFrames: TOTAL_FRAMES,
        cssFilter,
        overlayId,
        mirror,
        paperColor: activePreset.paperColor,
        accentHex: activePreset.accentHex,
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
      });

      if (frameUrl) collected.push(frameUrl);
      setRecordedCount(collected.length);
      setCurrentFrame(idx);

      if (collected.length >= TOTAL_FRAMES) {
        window.clearInterval(captureTimer);
        setCapturedFrames(collected);
        setIsRecording(false);
        setIsPlaying(true);
        setStep(5);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, CAPTURE_INTERVAL_MS);

    return () => window.clearInterval(captureTimer);
  }, [isRecording]);

  const ensureFramesReady = (): string[] => {
    if (capturedFrames.length > 0) return capturedFrames;
    const cssFilter = getCssFilterById(selectedFilter);
    return Array.from({ length: TOTAL_FRAMES }).map((_, idx) =>
      captureFlipbookFrameDataUrl({
        videoEl: null,
        mode,
        fallbackEmoji:
          mode === 'duo'
            ? POSE_SEQUENCE_EMOJIS_DUO[Math.floor(idx / 12) % POSE_SEQUENCE_EMOJIS_DUO.length]
            : POSE_SEQUENCE_EMOJIS_SOLO[Math.floor(idx / 6) % POSE_SEQUENCE_EMOJIS_SOLO.length],
        frameIndex: idx,
        totalFrames: TOTAL_FRAMES,
        cssFilter,
        overlayId,
        mirror,
        paperColor: activePreset.paperColor,
        accentHex: activePreset.accentHex,
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
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

  const handleCopyInvite = (type: 'code' | 'link') => {
    const value = type === 'code' ? roomCode : shareInviteUrl;
    navigator.clipboard?.writeText(value).catch(() => { });
    setCopiedType(type);
    window.setTimeout(() => setCopiedType('none'), 2000);
  };

  const handlePasteGuestCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setGuestInputCode(text.trim().toUpperCase());
    } catch {
      // Clipboard optional
    }
  };

  const handleStartSoloStep2 = () => {
    onChangeMode?.('solo');
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartDuoHostStep2 = () => {
    onChangeMode?.('duo');
    realtimeClient.createRoom({ displayName: 'Host', mode: 'duo' });
  };

  const handleJoinDuoGuestStep2 = () => {
    const code = guestInputCode.trim().toUpperCase();
    if (!code) return;
    onChangeMode?.('duo');
    realtimeClient.joinRoom(code, 'Guest');
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartCountdownAndRecord = () => {
    if (isRecording || countdown !== null) return;
    setCapturedFrames([]);
    setIsPlaying(false);
    setGifStatus('idle');
    setGifProgress(0);
    setMp4Status('idle');

    setCountdown(3);
    window.setTimeout(() => setCountdown(2), 750);
    window.setTimeout(() => setCountdown(1), 1500);
    window.setTimeout(() => {
      setCountdown(null);
      setIsRecording(true);
    }, 2250);
  };

  const handleRetakeFromStep5 = () => {
    if (retakesLeft <= 0 || isRecording) return;
    setRetakesLeft((prev) => Math.max(0, prev - 1));
    setCapturedFrames([]);
    setRecordedCount(0);
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadGifWithBookCover = async (forceError = false) => {
    setGifStatus('rendering');
    setGifProgress(1);

    if (forceError) {
      window.setTimeout(() => {
        setGifStatus('error');
        setGifProgress(0);
      }, 400);
      return;
    }

    try {
      const rawPages = ensureFramesReady();
      setGifProgress(5);

      const { allFrames, frameDelaysMs } = await buildFlipbookGifSequenceWithCover({
        frames: rawPages,
        presetName: activePreset.name,
        presetSubtitle: activePreset.subtitle,
        binderColor: activePreset.binderColor,
        paperColor: activePreset.paperColor,
        accentHex: activePreset.accentHex,
        pageDelayMs: GIF_PAGE_DELAY_MS, // 85ms (~12 FPS)
      });

      const blob = await encodeAnimatedGifBlob(allFrames, GIF_PAGE_DELAY_MS, {
        frameDelaysMs,
        onProgress: (pct) => setGifProgress(pct),
      });

      triggerFileDownload(blob, `momentos-flipbook-${presetId}.gif`);
      setGifStatus('success');
    } catch {
      setGifStatus('error');
    }
  };

  const handleDownloadVideo = async (forceError = false) => {
    setMp4Status('rendering');
    if (forceError) {
      window.setTimeout(() => setMp4Status('error'), 400);
      return;
    }
    try {
      const rawPages = ensureFramesReady();
      const { blob, ext } = await recordCanvasVideoBlob(rawPages, 12);
      setLastVideoExt(ext);
      triggerFileDownload(blob, `momentos-flipbook-${presetId}.${ext}`);
      setMp4Status('success');
    } catch {
      setMp4Status('error');
    }
  };

  const currentBeat = Math.min(2, Math.floor((isRecording ? recordedCount : currentFrame) / 20));
  const poseEmoji =
    mode === 'duo'
      ? POSE_SEQUENCE_EMOJIS_DUO[Math.floor(currentFrame / 12) % POSE_SEQUENCE_EMOJIS_DUO.length]
      : POSE_SEQUENCE_EMOJIS_SOLO[Math.floor(currentFrame / 6) % POSE_SEQUENCE_EMOJIS_SOLO.length];
  const showcasePoseEmoji =
    POSE_SEQUENCE_EMOJIS_SOLO[Math.floor(showcaseTick / 3) % POSE_SEQUENCE_EMOJIS_SOLO.length];

  const isDarkPaper = activePreset.id === 'neon-disco';

  return (
    <div className="page-stack" style={{ maxWidth: 1060, margin: '0 auto' }}>
      <section>
        {/* 6-Step Progress Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          {FLIPBOOK_STEPS.map((st, idx) => (
            <React.Fragment key={st.step}>
              <button
                type="button"
                className={`btn ${step === st.step ? 'active-pill' : ''}`}
                style={{
                  minHeight: 32,
                  padding: '4px 11px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                }}
                onClick={() => setStep(st.step)}
              >
                {st.num}. {st.label}
              </button>
              {idx < FLIPBOOK_STEPS.length - 1 && (
                <span style={{ alignSelf: 'center', opacity: 0.35, fontWeight: 700 }}>
                  —
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* =====================================================================
            LANGKAH 1: CARA KERJA & SHOWCASE CONTOH EFEK INTERAKTIF
           ===================================================================== */}
        {step === 1 && (
          <div>
            <div className="page-intro" style={{ marginBottom: 24 }}>
              <span className="eyebrow-text">Langkah 01 · Cara Kerja &amp; Showcase Efek</span>
              <h1 className="heading-h1" style={{ marginBottom: 10 }}>
                Kenali <span className="font-upright-serif">Flipbook Studio</span> &amp; coba efeknya.
              </h1>
              <p className="text-muted">
                Klik salah satu efek di bawah untuk melihat simulasi buku flipbook mini yang
                bergerak secara langsung sebelum mulai merekam.
              </p>
            </div>

            {/* 3-Step Quick Pose Guide */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
              <div className="clean-card card-tone-cream surface-light">
                <span className="pill-tag" style={{ marginBottom: 10, fontSize: '0.7rem' }}>
                  01 · Persiapan
                </span>
                <h2 className="heading-h3" style={{ marginBottom: 6 }}>
                  Pilih Mode, Tema &amp; Efek
                </h2>
                <p className="text-muted" style={{ fontSize: '0.86rem' }}>
                  Bisa sendiri (Solo) atau berdua jarak jauh (Duo). Pilih sampul buku, efek
                  partikel, dan filter warna favoritmu.
                </p>
              </div>

              <div className="clean-card card-tone-rose surface-light">
                <span className="pill-tag" style={{ marginBottom: 10, fontSize: '0.7rem' }}>
                  02 · 10 Detik (60 Frame)
                </span>
                <h2 className="heading-h3" style={{ marginBottom: 6 }}>
                  Bergerak Mengikuti 3 Aba-aba
                </h2>
                <p className="text-muted" style={{ fontSize: '0.86rem' }}>
                  Kamera mencuplik <strong>60 frame selama 10 detik (6 FPS)</strong> pada
                  ukuran <code>420 × 315 px</code>. Ikuti panduan pose atau bergerak bebas!
                </p>
              </div>

              <div className="clean-card card-tone-sky surface-light">
                <span className="pill-tag" style={{ marginBottom: 10, fontSize: '0.7rem' }}>
                  03 · Buka Buku Cepat
                </span>
                <h2 className="heading-h3" style={{ marginBottom: 6 }}>
                  Unduh .GIF Lengkap dengan Cover
                </h2>
                <p className="text-muted" style={{ fontSize: '0.86rem' }}>
                  File <code>.GIF</code> dimulai dari sampul depan buku tanpa foto, lalu
                  membuka dan membalik halaman 1–60 secara cepat (~12 FPS).
                </p>
              </div>
            </div>

            {/* Interactive Effect Showcase + Live Animated Mini Flipbook Preview */}
            <div className="flipbook-workspace-grid">
              {/* Left: Clickable Effect Cards */}
              <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 4 }}>
                    KLIK CONTOH EFEK INTERAKTIF (6 EFEK)
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                    Pilih efek untuk melihat animasi partikelnya bekerja di buku flipbook sebelah kanan:
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {FLIPBOOK_OVERLAY_EFFECTS.map((ov) => {
                    const isSelected = overlayId === ov.id;
                    return (
                      <button
                        key={ov.id}
                        type="button"
                        className={`clean-card interactive ${isSelected ? 'card-tone-rose surface-light' : 'card-tone-neutral'
                          }`}
                        style={{
                          padding: '12px 14px',
                          textAlign: 'left',
                          borderColor: isSelected ? '#BC4374' : undefined,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          cursor: 'pointer',
                        }}
                        onClick={() => setOverlayId(ov.id)}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                          }}
                        >
                          <span>
                            {ov.icon} {ov.label}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: '0.66rem',
                                padding: '2px 7px',
                                borderRadius: 999,
                                background: '#BC4374',
                                color: '#FFFFFF',
                              }}
                            >
                              Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.76rem' }}>
                          {ov.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-primary-pop"
                    style={{ width: '100%', minHeight: 48, fontSize: '0.95rem' }}
                    onClick={() => {
                      setStep(2);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Buat Flipbook Sekarang →
                  </button>
                </div>
              </div>

              {/* Right: Live Mini Animated Flipbook Showcase */}
              <div
                className="clean-card surface-light"
                style={{
                  background: '#FFFFFF',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#BC4374',
                  }}
                >
                  <span>▶ LIVE PREVIEW EFEK:</span>
                  <span>
                    {activeOverlay.icon} {activeOverlay.label}
                  </span>
                </div>

                {/* Mini Spiral-Bound Animated Flipbook */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 420,
                    aspectRatio: '4 / 3',
                    background: activePreset.paperColor,
                    border: `2.5px solid ${activePreset.binderColor}`,
                    borderRadius: 18,
                    padding: '14px 16px 14px 44px',
                    boxShadow: '8px 8px 0px #18181B',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Spiral Spine Left */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: 30,
                      background: activePreset.binderColor,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-evenly',
                      alignItems: 'center',
                    }}
                  >
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          width: 20,
                          height: 8,
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #F5F5F4, #A8A29E, #44403C)',
                          marginLeft: -6,
                          display: 'block',
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#18181B',
                    }}
                  >
                    <span style={{ color: activePreset.accentHex }}>
                      CONTOH ANIMASI FLIPBOOK
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>
                      HAL {String((showcaseTick % 24) + 1).padStart(2, '0')}/60
                    </span>
                  </div>

                  {/* Animated Page Viewport */}
                  <div
                    style={{
                      position: 'relative',
                      flex: 1,
                      margin: '8px 0',
                      borderRadius: 12,
                      border: `1.5px solid ${activePreset.accentHex}`,
                      background:
                        overlayId === 'disco-sparkles'
                          ? showcaseTick % 2 === 0
                            ? '#FDF2F8'
                            : '#EFF6FF'
                          : '#FFFFFF',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Animated Pose Character */}
                    <div
                      style={{
                        fontSize: '3.6rem',
                        transform: `translateY(${showcaseTick % 2 === 0 ? -5 : 5}px) scale(${showcaseTick % 4 === 0 ? 1.06 : 1
                          })`,
                        transition: 'transform 0.12s ease',
                      }}
                    >
                      {showcasePoseEmoji}
                    </div>

                    {/* Live Effect Particles Overlay */}
                    {overlayId === 'confetti-burst' &&
                      ['🎊', '✨', '🎉', '🌸', '⭐'].map((ic, idx) => (
                        <span
                          key={idx}
                          style={{
                            position: 'absolute',
                            left: `${14 + idx * 18}%`,
                            top: `${((showcaseTick * 13 + idx * 23) % 78) + 8}%`,
                            fontSize: '1.35rem',
                            pointerEvents: 'none',
                          }}
                        >
                          {ic}
                        </span>
                      ))}

                    {overlayId === 'floating-hearts' &&
                      ['💖', '🫶', '💕', '🌸'].map((ic, idx) => (
                        <span
                          key={idx}
                          style={{
                            position: 'absolute',
                            left: `${16 + idx * 22}%`,
                            bottom: `${((showcaseTick * 11 + idx * 25) % 75) + 8}%`,
                            fontSize: '1.4rem',
                            pointerEvents: 'none',
                          }}
                        >
                          {ic}
                        </span>
                      ))}

                    {overlayId === 'disco-sparkles' && (
                      <span
                        style={{
                          position: 'absolute',
                          left: `${18 + ((showcaseTick * 17) % 64)}%`,
                          top: `${18 + ((showcaseTick * 11) % 55)}%`,
                          fontSize: '1.6rem',
                          pointerEvents: 'none',
                        }}
                      >
                        ✨🪩✨
                      </span>
                    )}

                    {overlayId === 'comic-pop' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 12,
                          padding: '4px 12px',
                          borderRadius: 8,
                          background: '#FBBF24',
                          border: '2px solid #18181B',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          color: '#18181B',
                        }}
                      >
                        {showcaseTick < 8 ? 'SNAP!' : showcaseTick < 16 ? 'POW!' : 'YAY!'}
                      </div>
                    )}

                    {overlayId === 'film-grain' && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage:
                            'repeating-linear-gradient(0deg, rgba(24,24,27,0.06) 0px, rgba(24,24,27,0.06) 1px, transparent 1px, transparent 5px)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 10,
                        padding: '2px 9px',
                        borderRadius: 999,
                        background: activePreset.accentHex,
                        color: '#FFFFFF',
                        fontSize: '0.66rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                      }}
                    >
                      420×315 · 6 FPS → 12 FPS GIF
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: '#52525B',
                      fontWeight: 700,
                    }}
                  >
                    <span>{activeOverlay.description}</span>
                    <span>MOMENTOS • 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            LANGKAH 2: PILIH MODE (SOLO / DUO TANPA INPUT NAMA)
           ===================================================================== */}
        {step === 2 && (
          <div>
            <div className="page-intro" style={{ marginBottom: 24 }}>
              <span className="eyebrow-text">Langkah 02 · Pilih Mode Flipbook</span>
              <h1 className="heading-h1" style={{ marginBottom: 10 }}>
                Rekam Flipbook sendiri atau berdua?
              </h1>
              <p className="text-muted">
                Tanpa input nama dan tanpa registrasi. Pilih Solo untuk langsung lanjut, atau
                Duo untuk membuat Room dan membagikan kode/link undangan ke temanmu.
              </p>
            </div>

            <div className="grid-2" style={{ marginBottom: 22 }}>
              {/* Card 1: Solo Flipbook */}
              <div
                className={`clean-card interactive ${mode === 'solo' ? 'card-tone-rose surface-light' : 'card-tone-neutral'
                  }`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 18,
                  borderColor: mode === 'solo' ? '#BC4374' : undefined,
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <span
                      className="pill-tag"
                      style={{ background: '#FFFFFF', color: '#18181B', fontSize: '0.72rem' }}
                    >
                      👤 1 Peserta · Instan
                    </span>
                    <MiniCameraStripIcon accentColor="#C93B6B" size={34} />
                  </div>
                  <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                    Solo Flipbook
                  </h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                    Langsung pilih tema buku, efek, dan rekam 60 frame ekspresimu sendiri tanpa
                    menunggu peserta lain.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary-pop"
                  style={{ width: '100%' }}
                  onClick={handleStartSoloStep2}
                >
                  Pilih Solo &amp; Lanjut →
                </button>
              </div>

              {/* Card 2: Duo Flipbook (Auto Host + Copy Code & Link) */}
              <div
                className={`clean-card interactive ${mode === 'duo' ? 'card-tone-sky surface-light' : 'card-tone-neutral'
                  }`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  borderColor: mode === 'duo' ? '#2563EB' : undefined,
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <span
                      className="pill-tag"
                      style={{
                        background: '#BC4374',
                        color: '#FFFFFF',
                        borderColor: '#BC4374',
                        fontSize: '0.72rem',
                      }}
                    >
                      👥 Host + Guest · Sinkron
                    </span>
                    <MiniCameraStripIcon accentColor="#7AB3EF" size={34} />
                  </div>
                  <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                    Duo Flipbook (Jadi Host)
                  </h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 12 }}>
                    Otomatis membuat room privat tanpa input nama. Bagikan kode atau link
                    undangan di bawah kepada temanmu:
                  </p>

                  {mode === 'duo' && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: '#FFFFFF',
                        border: '1.5px solid #18181B',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#52525B' }}>
                          Kode Room Aktif:
                        </span>
                        <strong
                          style={{
                            fontSize: '1rem',
                            fontFamily: 'var(--primitive-font-heading)',
                            letterSpacing: '0.06em',
                            color: '#18181B',
                          }}
                        >
                          {roomCode}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-lift"
                          style={{ flex: 1, minHeight: 34, fontSize: '0.76rem', padding: '4px 10px' }}
                          onClick={() => handleCopyInvite('code')}
                        >
                          {copiedType === 'code' ? '✓ Kode Disalin!' : '📋 Salin Kode'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary-pop"
                          style={{ flex: 1, minHeight: 34, fontSize: '0.76rem', padding: '4px 10px' }}
                          onClick={() => handleCopyInvite('link')}
                        >
                          {copiedType === 'link' ? '✓ Link Disalin!' : '🔗 Salin Link Undangan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {mode !== 'duo' ? (
                    <button
                      type="button"
                      className="btn btn-secondary-pop"
                      style={{ width: '100%' }}
                      onClick={handleStartDuoHostStep2}
                    >
                      Buat Room Duo (Jadi Host)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary-pop"
                      style={{ width: '100%' }}
                      onClick={() => {
                        setStep(3);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Lanjut Pilih Tema &amp; Efek →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Guest Join by Code Bar (No name input!) */}
            <div
              className="clean-card card-tone-neutral"
              style={{
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                  Punya Kode Undangan Room Flipbook?
                </div>
                <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                  Masukkan kode dari temanmu (Host) untuk bergabung sebagai Guest tanpa nama.
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  flex: 1,
                  justifyContent: 'flex-end',
                }}
              >
                <input
                  type="text"
                  placeholder="Contoh: MMT-4829"
                  aria-label="Masukkan kode room Flipbook"
                  value={guestInputCode}
                  onChange={(e) => setGuestInputCode(e.target.value.toUpperCase())}
                  style={{
                    minWidth: 185,
                    height: 42,
                    padding: '0 16px',
                    borderRadius: 999,
                    border: '1.5px solid #18181B',
                    background: '#FAF7F2',
                    color: '#18181B',
                    fontFamily: 'var(--primitive-font-heading)',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-lift"
                  style={{ minHeight: 42, padding: '6px 14px', fontSize: '0.8rem' }}
                  onClick={() => void handlePasteGuestCode()}
                >
                  📋 Tempel
                </button>
                <button
                  type="button"
                  className="btn btn-primary-pop"
                  style={{ minHeight: 42, padding: '8px 20px', fontSize: '0.86rem' }}
                  disabled={!guestInputCode.trim()}
                  onClick={handleJoinDuoGuestStep2}
                >
                  Gabung →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            LANGKAH 3: PILIH TEMA BUKU (8), EFEK INTERAKTIF & FILTER WARNA (8)
           ===================================================================== */}
        {step === 3 && (
          <div>
            <div className="page-intro" style={{ marginBottom: 22 }}>
              <span className="eyebrow-text">Langkah 03 · Kustomisasi Buku &amp; Kamera</span>
              <h1 className="heading-h1" style={{ marginBottom: 8 }}>
                Pilih <span className="font-upright-serif">Tema Sampul</span>, Efek &amp; Filter.
              </h1>
              <p className="text-muted">
                Tema sampul buku ini akan menjadi cover pembuka pada file <code>.GIF</code> yang
                kamu unduh nanti.
              </p>
            </div>

            {isOverlayIncompatible && (
              <div
                className="clean-card surface-light"
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
                <div>
                  <strong style={{ color: '#92400E', display: 'block', marginBottom: 2 }}>
                    ⚠️ Efek "{activeOverlay.label}" kurang selaras dengan tema "{activePreset.name}"
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: '#78350F' }}>
                    Disarankan memakai Clean Frame agar tekstur sampul &amp; kertas tetap jelas.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary-pop"
                  style={{ minHeight: 36, padding: '4px 14px', fontSize: '0.8rem' }}
                  onClick={() => setOverlayId('none')}
                >
                  Sesuaikan Otomatis (Clean Frame)
                </button>
              </div>
            )}

            <div className="flipbook-workspace-grid">
              {/* Left: 8 Book Themes, 6 Effects, 8 Filters */}
              <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. 8 Tema Sampul Buku */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 8 }}>
                    1. PILIH TEMA SAMPUL BUKU (8 PRESET)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {FLIPBOOK_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`btn btn-lift ${presetId === preset.id ? 'active-pill' : ''}`}
                        style={{
                          minHeight: 46,
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          textAlign: 'left',
                        }}
                        title={preset.subtitle}
                        onClick={() => handleSelectPreset(preset.id)}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            background: preset.binderColor,
                            border: `2px solid ${preset.accentHex}`,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ lineHeight: 1.2 }}>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.76rem', marginTop: 6 }}>
                    {activePreset.subtitle}
                  </div>
                </div>

                {/* 2. Efek Interaktif */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 8 }}>
                    2. EFEK INTERAKTIF SAAT REKAMAN
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
                            minHeight: 36,
                            padding: '4px 12px',
                            fontSize: '0.76rem',
                            opacity: clash ? 0.75 : 1,
                          }}
                          onClick={() => setOverlayId(ov.id)}
                        >
                          {ov.icon} {ov.label} {clash ? '⚠️' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 8 Filter Warna */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 8 }}>
                    3. FILTER WARNA KAMERA (8 PRESET)
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PHOTO_FILTER_PRESETS.map((flt) => (
                      <button
                        key={flt.id}
                        type="button"
                        className={`btn btn-lift ${selectedFilter === flt.id ? 'active-pill' : ''}`}
                        style={{
                          minHeight: 34,
                          padding: '4px 11px',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        onClick={() => onChangeFilter(flt.id)}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: flt.previewBg,
                            border: '1px solid rgba(0,0,0,0.3)',
                          }}
                        />
                        {flt.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Gaya Panduan Pose */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 8 }}>
                    4. PANDUAN ABA-ABA POSE
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      className={`btn btn-lift ${poseMode === 'guided' ? 'active-pill' : ''}`}
                      style={{ minHeight: 38, fontSize: '0.78rem' }}
                      onClick={() => setPoseMode('guided')}
                    >
                      🧭 Guided (3 Aba-aba Pose)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-lift ${poseMode === 'freestyle' ? 'active-pill' : ''}`}
                      style={{ minHeight: 38, fontSize: '0.78rem' }}
                      onClick={() => setPoseMode('freestyle')}
                    >
                      🕺 Freestyle Bebas
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-lift"
                    onClick={() => setStep(2)}
                  >
                    ← Pilih Mode
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary-pop"
                    style={{ flex: 1, minHeight: 46 }}
                    onClick={() => {
                      setStep(4);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Buka Kamera Flipbook →
                  </button>
                </div>
              </div>

              {/* Right: Preview Sampul Buku (Tanpa Foto) */}
              <div
                className="clean-card surface-light"
                style={{
                  background: '#FFFFFF',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#52525B' }}>
                  PREVIEW SAMPUL DEPAN BUKU (.GIF PEMBUKA TANPA FOTO)
                </div>

                {coverPreviewUrl ? (
                  <img
                    src={coverPreviewUrl}
                    alt={`Sampul ${activePreset.name}`}
                    style={{
                      width: '100%',
                      maxWidth: 420,
                      borderRadius: 14,
                      boxShadow: '8px 8px 0px #18181B',
                      display: 'block',
                    }}
                  />
                ) : null}

                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#52525B',
                    textAlign: 'center',
                    maxWidth: 380,
                  }}
                >
                  Tema: <strong>{activePreset.name}</strong> · Efek:{' '}
                  <strong>{activeOverlay.label}</strong> · Filter:{' '}
                  <strong>{activeFilter.name}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            LANGKAH 4: TAKE FLIPBOOK (60 FRAME DALAM 10 DETIK · 6 FPS · 420x315)
           ===================================================================== */}
        {step === 4 && (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div className="page-intro" style={{ marginBottom: 18 }}>
              <span className="eyebrow-text">
                Langkah 04 · Rekaman {TOTAL_FRAMES} Frame (10 Detik · {CAPTURE_FPS} FPS · {CAPTURE_WIDTH}×{CAPTURE_HEIGHT} px)
              </span>
              <h1 className="heading-h1" style={{ marginBottom: 8 }}>
                Siap berpose di depan <span className="font-upright-serif">kamera!</span>
              </h1>
              <p className="text-muted">
                Kamera akan merekam 60 lembar foto beruntun selama 10 detik. Ikuti aba-aba di
                bawah layar!
              </p>
            </div>

            {/* Duo Room Invite Bar if Mode Duo is active */}
            {mode === 'duo' && (
              <div
                className="clean-card surface-light"
                style={{
                  background: '#EBF4FD',
                  padding: '12px 16px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#18181B' }}>
                  👥 Room Duo Flipbook: <strong>{roomCode}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-lift"
                    style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.75rem' }}
                    onClick={() => handleCopyInvite('code')}
                  >
                    {copiedType === 'code' ? '✓ Kode Disalin!' : '📋 Salin Kode'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary-pop"
                    style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.75rem' }}
                    onClick={() => handleCopyInvite('link')}
                  >
                    {copiedType === 'link' ? '✓ Link Disalin!' : '🔗 Salin Link Undangan'}
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div
                className="clean-card surface-light"
                style={{
                  background: '#FEF3C7',
                  borderColor: '#D97706',
                  marginBottom: 14,
                  padding: '10px 16px',
                  fontSize: '0.82rem',
                  color: '#78350F',
                }}
              >
                <strong>Info Kamera:</strong> {cameraError}
              </div>
            )}

            {/* Centered Clean Camera Stage (420x315 4:3 Aspect Ratio) */}
            <div
              className="clean-card surface-light"
              style={{
                background: '#FFFFFF',
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* Progress Header Bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 520,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#18181B',
                }}
              >
                <span>
                  {activePreset.name} · {activeOverlay.icon} {activeOverlay.label}
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: isRecording ? '#BC4374' : '#FAF7F2',
                    color: isRecording ? '#FFFFFF' : '#18181B',
                    border: '1.5px solid #18181B',
                  }}
                >
                  {recordedCount}/{TOTAL_FRAMES} Frame (
                  {((recordedCount / TOTAL_FRAMES) * 10).toFixed(1)}s / 10.0s)
                </span>
              </div>

              {/* Progress Bar Track */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 520,
                  height: 10,
                  borderRadius: 999,
                  background: '#E4E4E7',
                  border: '1.5px solid #18181B',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.round((recordedCount / TOTAL_FRAMES) * 100)}%`,
                    height: '100%',
                    background: '#BC4374',
                    transition: 'width 0.14s linear',
                  }}
                />
              </div>

              {/* Clean 4:3 Camera Viewport (420x315 capture proportion) */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 520,
                  aspectRatio: '4 / 3',
                  borderRadius: 18,
                  border: '2.5px solid #18181B',
                  background: useSimulation ? activePreset.paperColor : '#09090B',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '6px 6px 0px #18181B',
                }}
              >
                {countdown !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 30,
                      background: 'rgba(24,24,27,0.48)',
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
                        fontSize: '4.8rem',
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {countdown}
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 8 }}>
                      Bersiap! 60 Frame dalam 10 Detik...
                    </div>
                  </div>
                )}

                {!useSimulation ? (
                  mode === 'duo' ? (
                    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '50%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: mirror ? 'scaleX(-1)' : 'none',
                          filter: activeFilter.cssFilter,
                        }}
                      />
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '50%',
                          height: '100%',
                          objectFit: 'cover',
                          borderLeft: '2px solid rgba(255,255,255,0.85)',
                          filter: activeFilter.cssFilter,
                          background: '#18181B',
                        }}
                      />
                    </div>
                  ) : (
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
                  )
                ) : (
                  <div
                    style={{
                      fontSize: '4rem',
                      filter: activeFilter.cssFilter,
                    }}
                  >
                    {poseEmoji}
                  </div>
                )}

                {/* Guided Pose Prompt Pill at Bottom of Camera */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '6px 16px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.92)',
                    color: '#18181B',
                    border: '1.5px solid #18181B',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    zIndex: 20,
                  }}
                >
                  {poseMode === 'guided'
                    ? activePreset.guidedPrompts[currentBeat]
                    : `Freestyle Beat #${currentBeat + 1} · Bergerak Ekspresif!`}
                </div>
              </div>

              {/* Clean Camera Controls: Only Mirror + Record CTA (No Webcam|Simulasi toggle!) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  className="btn btn-lift"
                  style={{ minHeight: 46, padding: '8px 16px', fontSize: '0.84rem' }}
                  disabled={isRecording}
                  onClick={() => setstepOrMirror()}
                >
                  🪞 {mirror ? 'Mirror ON' : 'Mirror OFF'}
                </button>

                <button
                  type="button"
                  className="btn btn-primary-pop"
                  style={{ minHeight: 50, padding: '10px 28px', fontSize: '0.95rem' }}
                  disabled={isRecording || countdown !== null}
                  onClick={handleStartCountdownAndRecord}
                >
                  {isRecording
                    ? `🔴 Merekam ${recordedCount}/${TOTAL_FRAMES} Frame...`
                    : countdown !== null
                      ? `⏳ Mulai dalam ${countdown}...`
                      : '🎬 Mulai Take Flipbook (60 Frame · 10 Detik)'}
                </button>

                <button
                  type="button"
                  className="btn btn-lift"
                  style={{ minHeight: 46, padding: '8px 16px', fontSize: '0.82rem' }}
                  disabled={isRecording}
                  onClick={() => setStep(3)}
                >
                  ← Tema &amp; Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            LANGKAH 5: PREVIEW HASIL & RETAKE (MAKSIMAL 3x UJI COBA)
           ===================================================================== */}
        {step === 5 && (
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div className="page-intro" style={{ marginBottom: 20 }}>
              <span className="eyebrow-text">
                Langkah 05 · Preview 60 Frame &amp; Uji Coba Ulang
              </span>
              <h1 className="heading-h1" style={{ marginBottom: 8 }}>
                Periksa hasil <span className="font-upright-serif">60 halaman</span> flipbook-mu!
              </h1>
              <p className="text-muted">
                Putar secara loop atau geser slider manual lembar demi lembar. Kurang pas? Kamu
                punya kuota maksimal <strong>3× Take Ulang</strong>.
              </p>
            </div>

            <div
              className="clean-card surface-light"
              style={{
                background: '#FFFFFF',
                padding: '26px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 18,
              }}
            >
              {/* Spiral-Bound Book Player */}
              <div style={{ position: 'relative', width: '100%', maxWidth: 500 }}>
                <div
                  style={{
                    position: 'relative',
                    background: activePreset.paperColor,
                    color: isDarkPaper ? '#FAF7F2' : '#18181B',
                    border: `2.5px solid ${activePreset.binderColor}`,
                    borderRadius: 20,
                    padding: '16px 18px 16px 46px',
                    boxShadow: '8px 8px 0px #18181B',
                    overflow: 'hidden',
                  }}
                >
                  {/* Spiral Spine Left */}
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
                    }}
                  >
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 22,
                          height: 9,
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #F3EFEA, #9D958C, #3A3531)',
                          marginLeft: -8,
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ color: activePreset.accentHex }}>
                      {activePreset.name.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'monospace' }}>
                      HALAMAN {String(currentFrame + 1).padStart(2, '0')}/{activeFrameTotal}
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      borderRadius: 12,
                      border: `1.5px solid ${activePreset.accentHex}`,
                      background: '#FFFFFF',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ensureFramesReady()[currentFrame] ? (
                      <img
                        src={ensureFramesReady()[currentFrame]}
                        alt={`Halaman ${currentFrame + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Playback Loop Controls + Manual Page Scrubber */}
              <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
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
                    {isPlaying ? '⏸ Jeda Loop' : '▶ Putar Loop'}
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
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#18181B',
                      marginBottom: 4,
                    }}
                  >
                    <span>Geser Lembar Halaman Manual</span>
                    <span>
                      Lembar {currentFrame + 1} dari {activeFrameTotal}
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

              {/* Step 5 Actions: Retake (Max 3x) & Proceed to Step 6 */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  width: '100%',
                  maxWidth: 500,
                  paddingTop: 8,
                  borderTop: '1.5px solid rgba(24,24,27,0.1)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-lift"
                  style={{ minHeight: 46, padding: '8px 18px', fontSize: '0.86rem' }}
                  disabled={retakesLeft <= 0}
                  onClick={handleRetakeFromStep5}
                >
                  🔄 Take Ulang ({retakesLeft}/3 Sisa)
                </button>

                <button
                  type="button"
                  className="btn btn-primary-pop"
                  style={{ flex: 1, minHeight: 46, padding: '8px 22px', fontSize: '0.92rem' }}
                  onClick={() => {
                    setStep(6);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Lanjut ke Unduh →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            LANGKAH 6: UNDUH .GIF BUKA BUKU CEPAT (COVER TANPA FOTO + 60 HALAMAN @ ~12 FPS)
           ===================================================================== */}
        {step === 6 && (
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="page-intro" style={{ marginBottom: 22 }}>
              <span className="eyebrow-text">
                Langkah 06 · Unduh .GIF Buka Buku Cepat (~12 FPS)
              </span>
              <h1 className="heading-h1" style={{ marginBottom: 8 }}>
                Flipbook siap <span className="font-upright-serif">diunduh!</span>
              </h1>
              <p className="text-muted">
                File <code>.GIF</code> diawali dengan <strong>Sampul Depan Buku (tanpa foto)</strong>{' '}
                berjilid spiral selama <code>~0.4 detik</code>, diikuti animasi membuka sampul dan
                membalik <strong>Frame 1 s/d Frame 60</strong> secara cepat (<code>~12 FPS</code> /{' '}
                <code>85 ms</code> per halaman).
              </p>
            </div>

            <div className="flipbook-workspace-grid">
              {/* Left: Book Cover vs Fast Flip Preview */}
              <div
                className="clean-card surface-light"
                style={{
                  background: '#FFFFFF',
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn ${!showCoverInStep6 ? 'active-pill' : ''}`}
                    style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.75rem' }}
                    onClick={() => setShowCoverInStep6(false)}
                  >
                    🎞️ Animasi 60 Halaman (~12 FPS)
                  </button>
                  <button
                    type="button"
                    className={`btn ${showCoverInStep6 ? 'active-pill' : ''}`}
                    style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.75rem' }}
                    onClick={() => setShowCoverInStep6(true)}
                  >
                    📕 Lihat Cover Pembuka (Tanpa Foto)
                  </button>
                </div>

                {showCoverInStep6 && coverPreviewUrl ? (
                  <img
                    src={coverPreviewUrl}
                    alt="Cover Pembuka Flipbook"
                    style={{
                      width: '100%',
                      maxWidth: 420,
                      borderRadius: 14,
                      boxShadow: '8px 8px 0px #18181B',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: 420,
                      background: activePreset.paperColor,
                      border: `2.5px solid ${activePreset.binderColor}`,
                      borderRadius: 16,
                      padding: '12px 14px 12px 42px',
                      boxShadow: '8px 8px 0px #18181B',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: 30,
                        background: activePreset.binderColor,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-evenly',
                        alignItems: 'center',
                      }}
                    >
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: 20,
                            height: 8,
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #F3EFEA, #9D958C, #3A3531)',
                            marginLeft: -6,
                          }}
                        />
                      ))}
                    </div>

                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '4 / 3',
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: `1.5px solid ${activePreset.accentHex}`,
                      }}
                    >
                      {ensureFramesReady()[currentFrame] && (
                        <img
                          src={ensureFramesReady()[currentFrame]}
                          alt={`Frame ${currentFrame + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: '#52525B', textAlign: 'center' }}>
                  <strong>{activePreset.name}</strong> · MOMENTO FLIPBOOK • 2026
                </div>
              </div>

              {/* Right: Async GIF Download with % Progress + Video Export */}
              <div
                className="clean-card surface-light"
                style={{
                  background: '#FFFFFF',
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Primary GIF Export Box */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      background: '#FAF7F2',
                      border: '2px solid #18181B',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <strong style={{ fontSize: '0.96rem', color: '#18181B' }}>
                        📕 Animated .GIF (Cover + 60 Halaman)
                      </strong>
                      <span
                        className="pill-tag"
                        style={{
                          fontSize: '0.68rem',
                          background: '#BC4374',
                          color: '#FFFFFF',
                          borderColor: '#BC4374',
                        }}
                      >
                        Utama · ~12 FPS
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: '#52525B' }}>
                      Menyertakan Cover Buku <em>"{activePreset.name}"</em> tanpa foto (0.4s),
                      transisi buka sampul, dan 60 frame foto (85ms/lembar).
                    </p>

                    {gifStatus === 'rendering' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: '#BC4374',
                          }}
                        >
                          <span>⏳ Mengenkode LZW .GIF secara bertahap...</span>
                          <span>{gifProgress}%</span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: 10,
                            borderRadius: 999,
                            background: '#E4E4E7',
                            border: '1px solid #18181B',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${gifProgress}%`,
                              height: '100%',
                              background: '#BC4374',
                              transition: 'width 0.1s linear',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary-pop"
                        style={{ flex: 1, minHeight: 46, fontSize: '0.88rem' }}
                        disabled={gifStatus === 'rendering'}
                        onClick={() => void handleDownloadGifWithBookCover(false)}
                      >
                        {gifStatus === 'rendering'
                          ? `⏳ Menyusun .GIF (${gifProgress}%)...`
                          : gifStatus === 'success'
                            ? '✓ Unduh Lagi (.GIF Buka Buku)'
                            : '💾 Unduh .GIF Buka Buku Cepat'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-lift"
                        style={{ minHeight: 46, padding: '6px 12px', fontSize: '0.74rem' }}
                        disabled={gifStatus === 'rendering'}
                        onClick={() => void handleDownloadGifWithBookCover(true)}
                      >
                        Uji Gagal
                      </button>
                    </div>

                    {gifStatus === 'success' && (
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#166534' }}>
                        ✅ File .GIF berhasil diunduh! Sesi tetap terbuka.
                      </div>
                    )}
                    {gifStatus === 'error' && (
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#B91C1C' }}>
                        ⚠️ Gagal membuat .GIF. Klik tombol Unduh untuk mencoba ulang (Retry).
                      </div>
                    )}
                  </div>

                  {/* Secondary Video Export Box */}
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: '#FAF9F6',
                      border: '1.5px solid #E4E4E7',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#18181B' }}>
                      🎬 Video Loop (.MP4 / .WEBM)
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary-pop"
                        style={{ flex: 1, minHeight: 38, fontSize: '0.8rem' }}
                        disabled={mp4Status === 'rendering'}
                        onClick={() => void handleDownloadVideo(false)}
                      >
                        {mp4Status === 'rendering'
                          ? '⏳ Merekam Video...'
                          : mp4Status === 'success'
                            ? `✓ .${lastVideoExt.toUpperCase()} Diunduh`
                            : 'Unduh Video'}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ minHeight: 38, padding: '4px 10px', fontSize: '0.72rem' }}
                        onClick={() => void handleDownloadVideo(true)}
                      >
                        Uji Gagal
                      </button>
                    </div>
                    {mp4Status === 'error' && (
                      <div style={{ fontSize: '0.74rem', color: '#B91C1C' }}>
                        Gagal encoding video. File .GIF tetap aman.
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Footer */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-lift"
                    onClick={() => setStep(5)}
                  >
                    ← Preview &amp; Retake
                  </button>
                  <button
                    type="button"
                    className="btn btn-lift"
                    onClick={() => onNavigate('room')}
                  >
                    🏠 Ke Pilihan Booth
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  function setstepOrMirror() {
    setMirror((m) => !m);
  }
};
