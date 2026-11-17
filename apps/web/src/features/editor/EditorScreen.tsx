import React, { useEffect, useRef, useState } from 'react';
import {
  CLASSIC_TEMPLATE_PRESETS,
  PHOTO_FILTER_PRESETS,
  type BoothMode,
  type CapturedFrame,
  type PhotoFilterId,
  type PlacedSticker,
  type ScreenId,
  type StickerCategory,
  type StickerItem,
  type TemplateLayoutId,
} from '@momentos/shared';
import {
  renderClassicCompositeDataUrl,
  triggerFileDownload,
} from '../../lib/mediaEngine';
import {
  realtimeClient,
  type RealtimeClientState,
} from '../../lib/realtimeClient';

interface EditorScreenProps {
  mode: BoothMode;
  takeCount: number;
  frames: CapturedFrame[];
  retakesRemaining?: number;
  onRetakeFrame?: (frameId: number) => void;
  layout: TemplateLayoutId;
  onChangeLayout: (layout: TemplateLayoutId) => void;
  selectedFilter: PhotoFilterId;
  onChangeFilter: (filter: PhotoFilterId) => void;
  stripTint: string;
  onChangeStripTint: (color: string) => void;
  caption: string;
  onChangeCaption: (text: string) => void;
  stickers: StickerItem[];
  placedStickers: PlacedSticker[];
  onAddPlacedSticker: (sticker: StickerItem) => string;
  onUpdatePlacedSticker: (
    instanceId: string,
    patch: Partial<Pick<PlacedSticker, 'xPct' | 'yPct' | 'scale' | 'rotation'>>
  ) => void;
  onRemovePlacedSticker: (instanceId: string) => void;
  onUndoByOwner: (owner: 'host' | 'guest') => void;
  realtimeState?: RealtimeClientState;
  onNavigate: (screen: ScreenId) => void;
}

type CustomizeTabId = 'bg' | 'frame' | 'stickers' | 'caption' | 'filter';

const STRIP_COLORS = [
  { hex: '#FFFFFF', name: 'Putih' },
  { hex: '#FAF7F2', name: 'Cream' },
  { hex: '#FCEEF3', name: 'Berry' },
  { hex: '#EBF4FD', name: 'Sky' },
  { hex: '#ECF3ED', name: 'Sage' },
  { hex: '#FEF3C7', name: 'Butter' },
  { hex: '#EDE9FE', name: 'Lilac' },
  { hex: '#18181B', name: 'Charcoal' },
];

export const EditorScreen: React.FC<EditorScreenProps> = ({
  mode,
  takeCount,
  frames,
  retakesRemaining = 3,
  onRetakeFrame,
  layout,
  onChangeLayout,
  selectedFilter,
  onChangeFilter,
  stripTint,
  onChangeStripTint,
  caption,
  onChangeCaption,
  stickers,
  placedStickers,
  onAddPlacedSticker,
  onUpdatePlacedSticker,
  onRemovePlacedSticker,
  onUndoByOwner,
  realtimeState,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<CustomizeTabId>('stickers');
  const [stickerTab, setStickerTab] = useState<'all' | StickerCategory>('all');
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [disconnectPaused, setDisconnectPaused] = useState(false);
  const [showRetakePicker, setShowRetakePicker] = useState(false);
  const [showDateStamp, setShowDateStamp] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    mode: 'move' | 'resize' | 'rotate';
    instanceId: string;
    startX: number;
    startY: number;
    origXPct: number;
    origYPct: number;
    origScale: number;
    origRotation: number;
    cornerSignX?: 1 | -1;
    cornerSignY?: 1 | -1;
  } | null>(null);

  const visibleFrames = frames.slice(0, takeCount);
  const filteredStickers =
    stickerTab === 'all'
      ? stickers
      : stickers.filter((s) => (s.category ?? 'sticker') === stickerTab);

  const liveEditor = realtimeState?.snapshot?.editorState;
  const livePrompt = realtimeState?.snapshot?.retakePrompt;
  const isPaused = disconnectPaused || Boolean(liveEditor?.pausedByDisconnect);

  const activePreset =
    CLASSIC_TEMPLATE_PRESETS.find((t) => t.id === layout) ??
    CLASSIC_TEMPLATE_PRESETS[0];
  const activeFilter =
    PHOTO_FILTER_PRESETS.find((f) => f.id === selectedFilter) ??
    PHOTO_FILTER_PRESETS[0];

  const isFilm35mm = layout === 'film-35mm';
  const isTicket = layout === 'vintage-ticket';
  const isScrapbook = layout === 'editorial-scrapbook';
  const isPolaroid = layout === 'polaroid-duo';
  const isGridOrScrapbook = layout === 'grid-2x2' || isScrapbook;

  const effectiveBg = isFilm35mm
    ? '#181619'
    : isTicket && stripTint === '#FFFFFF'
    ? '#F4ECDD'
    : isScrapbook && stripTint === '#FFFFFF'
    ? '#FAF3EA'
    : stripTint;
  const isDarkPaper = effectiveBg === '#18181B' || isFilm35mm;

  const selectedPlaced = placedStickers.find(
    (ps) => ps.instanceId === selectedStickerId
  );

  // Drag, Corner-Resize & Rotate handler over the photostrip canvas (Canva-style)
  useEffect(() => {
    const handlePointerMove = (ev: PointerEvent) => {
      const drag = dragStateRef.current;
      const box = stripRef.current;
      if (!drag || !box) return;

      if (drag.mode === 'move') {
        const rect = box.getBoundingClientRect();
        const dxPct = ((ev.clientX - drag.startX) / rect.width) * 100;
        const dyPct = ((ev.clientY - drag.startY) / rect.height) * 100;
        const nextX = Math.max(6, Math.min(94, Math.round(drag.origXPct + dxPct)));
        const nextY = Math.max(5, Math.min(95, Math.round(drag.origYPct + dyPct)));
        onUpdatePlacedSticker(drag.instanceId, { xPct: nextX, yPct: nextY });
      } else if (drag.mode === 'resize') {
        const dx = (ev.clientX - drag.startX) * (drag.cornerSignX ?? 1);
        const dy = (ev.clientY - drag.startY) * (drag.cornerSignY ?? 1);
        const deltaScale = (dx + dy) / 90;
        const nextScale = Math.max(
          0.5,
          Math.min(2.4, Number((drag.origScale + deltaScale).toFixed(2)))
        );
        onUpdatePlacedSticker(drag.instanceId, { scale: nextScale });
      } else if (drag.mode === 'rotate') {
        const dx = ev.clientX - drag.startX;
        const nextRot = Math.max(
          -180,
          Math.min(180, Math.round(drag.origRotation + dx * 1.2))
        );
        onUpdatePlacedSticker(drag.instanceId, { rotation: nextRot });
      }
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onUpdatePlacedSticker]);

  const handleQuickDownload = async () => {
    setIsSaving(true);
    setSavedNotice(false);
    setSelectedStickerId(null);
    try {
      const url = await renderClassicCompositeDataUrl({
        mode,
        frames: visibleFrames,
        layout,
        stripTint,
        selectedFilter,
        caption,
        stickers,
        placedStickers,
        format: 'png',
      });
      triggerFileDownload(url, `momentos-${mode}-${layout}.png`);
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-stack" style={{ maxWidth: 1080, margin: '0 auto' }}>
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
                className={`btn ${st.id === 'editor' ? 'active-pill' : ''}`}
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

        <div className="page-intro" style={{ marginBottom: 22 }}>
          <span className="eyebrow-text">Langkah 04 · Foto Siap &amp; Customize</span>
          <h1 className="heading-h1" style={{ marginBottom: 8 }}>
            Hasil <span className="font-upright-serif">sempurna!</span>
          </h1>
          <p className="text-muted">
            Klik stiker lalu geser, ubah ukuran, atau putar langsung di atas foto ala Canva.
          </p>
        </div>

        {/* Duo Disconnect Safe Pause Banner */}
        {mode === 'duo' && isPaused && (
          <div
            className="clean-card surface-light"
            style={{
              background: '#FCEEF3',
              marginBottom: 20,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <strong>⏸️ Editor Dijeda Sementara — Menunggu Peserta Rejoin</strong>
              <p className="text-muted" style={{ fontSize: '0.86rem' }}>
                Kanvas dijeda hingga koneksi temanmu pulih kembali.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary-pop"
              onClick={() => {
                realtimeClient.resumeFromRecoveryWindow();
                setDisconnectPaused(false);
              }}
            >
              Pulihkan Koneksi
            </button>
          </div>
        )}

        {/* Duo Live Guest Retake Approval Banner */}
        {mode === 'duo' && livePrompt && livePrompt.status === 'pending' && (
          <div
            className="clean-card surface-light"
            style={{
              background: '#EBF4FD',
              marginBottom: 20,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <strong>🙋 Guest meminta Retake Pose #{livePrompt.frameId}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary-pop"
                style={{ minHeight: 36, padding: '6px 14px', fontSize: '0.82rem' }}
                disabled={retakesRemaining <= 0}
                onClick={() => {
                  realtimeClient.decideRetake(livePrompt.requestId, true);
                  onRetakeFrame?.(livePrompt.frameId);
                }}
              >
                Setujui Retake
              </button>
              <button
                type="button"
                className="btn btn-lift"
                style={{ minHeight: 36, padding: '6px 14px', fontSize: '0.82rem' }}
                onClick={() => realtimeClient.decideRetake(livePrompt.requestId, false)}
              >
                Tolak
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Result + Tabbed Customize Workspace */}
        <div className="editor-workspace-grid">
          {/* LEFT: Printed Photo Slot + Fixed-Proportion Interactive Strip + Actions */}
          <div
            className="clean-card surface-light"
            style={{
              background: '#FFFFFF',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Printer Dispenser Slot Accent */}
            <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
              <div
                style={{
                  height: 18,
                  borderRadius: 999,
                  background: '#27272A',
                  border: '2px solid #18181B',
                  boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.6)',
                  marginBottom: -10,
                  position: 'relative',
                  zIndex: 3,
                }}
              />
            </div>

            {/* Interactive Strip Canvas with Fixed Aspect Ratio Photo Slots */}
            <div
              ref={stripRef}
              onClick={() => setSelectedStickerId(null)}
              style={{
                position: 'relative',
                zIndex: 2,
                width: isGridOrScrapbook ? 356 : 276,
                background: effectiveBg,
                backgroundImage: isScrapbook
                  ? 'radial-gradient(#d8c8b6 1px, transparent 1px)'
                  : undefined,
                backgroundSize: isScrapbook ? '16px 16px' : undefined,
                color: isDarkPaper ? '#FAF3EA' : '#18181B',
                border: isFilm35mm ? '2px solid #322E34' : '2px solid #18181B',
                borderRadius: isTicket ? 12 : isFilm35mm ? 8 : 12,
                padding: isFilm35mm
                  ? '14px 24px 16px'
                  : isPolaroid
                  ? '14px 14px 20px'
                  : '14px 14px 18px',
                boxShadow: '6px 6px 0px #18181B',
                transition: 'background 0.2s ease',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              {/* 35mm Film Sprocket Holes */}
              {isFilm35mm && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      bottom: 14,
                      left: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      pointerEvents: 'none',
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          width: 9,
                          height: 14,
                          borderRadius: 2,
                          background: '#FFFFFF',
                          display: 'block',
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      bottom: 14,
                      right: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      pointerEvents: 'none',
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          width: 9,
                          height: 14,
                          borderRadius: 2,
                          background: '#FFFFFF',
                          display: 'block',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {isTicket && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#9E325F',
                    borderBottom: '1.5px dashed rgba(158,50,95,0.4)',
                    paddingBottom: 6,
                    marginBottom: 10,
                  }}
                >
                  <span>ADMIT ONE • STUDIO</span>
                  <span>NO. 2026-0411</span>
                </div>
              )}

              {isFilm35mm && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'monospace',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: '#E09F5A',
                    marginBottom: 8,
                  }}
                >
                  <span>MOMENTOS GC 400</span>
                  <span>SAFETY FILM</span>
                </div>
              )}

              {isScrapbook && (
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div
                    className="font-upright-serif"
                    style={{ fontSize: '1.1rem', color: '#2A1F1D' }}
                  >
                    Little Moments Journal
                  </div>
                </div>
              )}

              {/* Full-Bleed Clean Photos Grid (Zero labels/text inside photo slots!) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isGridOrScrapbook ? '1fr 1fr' : '1fr',
                  gap: isScrapbook ? 12 : isPolaroid ? 12 : 9,
                  filter: activeFilter.cssFilter,
                  transition: 'filter 0.25s ease',
                }}
              >
                {visibleFrames.map((fr, idx) => (
                  <div
                    key={fr.id}
                    style={{
                      position: 'relative',
                      background: isScrapbook || isPolaroid ? '#FFFFFF' : fr.accentBg,
                      border: isFilm35mm
                        ? '1.5px solid rgba(224,159,90,0.45)'
                        : isScrapbook
                        ? '1px solid #DFD3C3'
                        : '1.5px solid #18181B',
                      borderRadius: isScrapbook ? 4 : isPolaroid ? 6 : 4,
                      padding: isScrapbook
                        ? '6px 6px 14px'
                        : isPolaroid
                        ? '6px 6px 14px'
                        : 0,
                      transform: isScrapbook
                        ? `rotate(${idx % 2 === 0 ? '-2deg' : '2deg'})`
                        : undefined,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Fixed Aspect Ratio Photo Aperture (like Gambar 5!) */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: isPolaroid
                          ? '4 / 3'
                          : isGridOrScrapbook
                          ? '4 / 3'
                          : '3 / 2',
                        overflow: 'hidden',
                        background: fr.accentBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {mode === 'duo' ? (
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div
                            style={{
                              width: '50%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              background: fr.accentBg,
                            }}
                          >
                            {fr.imageDataUrl ? (
                              <img
                                src={fr.imageDataUrl}
                                alt={`Host ${idx + 1}`}
                                draggable={false}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: '1.8rem' }}>{fr.hostPose}</span>
                            )}
                          </div>
                          <div
                            style={{
                              width: '50%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              background: '#EBF4FD',
                              borderLeft: '2px solid rgba(255,255,255,0.85)',
                            }}
                          >
                            {fr.guestImageDataUrl ? (
                              <img
                                src={fr.guestImageDataUrl}
                                alt={`Guest ${idx + 1}`}
                                draggable={false}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: '1.8rem' }}>{fr.guestPose}</span>
                            )}
                          </div>
                        </div>
                      ) : fr.imageDataUrl ? (
                        <img
                          src={fr.imageDataUrl}
                          alt={`Pose ${idx + 1}`}
                          draggable={false}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '2.1rem' }}>{fr.hostPose}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Clean Footer */}
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: isTicket ? '2px dashed #7A6554' : 'none',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: isFilm35mm
                      ? 'monospace'
                      : 'var(--primitive-font-heading)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: isFilm35mm
                      ? '#E09F5A'
                      : isDarkPaper
                      ? '#FFFFFF'
                      : '#18181B',
                  }}
                >
                  {caption || 'MOMENTOS • 2026'}
                </div>
                {showDateStamp && (
                  <div
                    style={{
                      fontSize: '0.66rem',
                      opacity: 0.72,
                      marginTop: 2,
                      color: isDarkPaper ? '#E5E7EB' : '#52525B',
                    }}
                  >
                    17 Nov 2026 · {mode.toUpperCase()}
                  </div>
                )}
              </div>

              {/* FREEFORM CANVA-STYLE PLACED STICKERS OVERLAY */}
              {placedStickers.map((ps) => {
                const isSelected = ps.instanceId === selectedStickerId;
                const isTapeOrStamp = ps.category === 'tape' || ps.category === 'stamp';
                const invScale = Number((1 / Math.max(0.5, ps.scale)).toFixed(3));
                return (
                  <div
                    key={ps.instanceId}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelectedStickerId(ps.instanceId);
                      setActiveTab('stickers');
                    }}
                    onPointerDown={(ev) => {
                      if (isPaused) return;
                      ev.stopPropagation();
                      setSelectedStickerId(ps.instanceId);
                      setActiveTab('stickers');
                      dragStateRef.current = {
                        mode: 'move',
                        instanceId: ps.instanceId,
                        startX: ev.clientX,
                        startY: ev.clientY,
                        origXPct: ps.xPct,
                        origYPct: ps.yPct,
                        origScale: ps.scale,
                        origRotation: ps.rotation,
                      };
                    }}
                    style={{
                      position: 'absolute',
                      left: `${ps.xPct}%`,
                      top: `${ps.yPct}%`,
                      transform: `translate(-50%, -50%) rotate(${ps.rotation}deg) scale(${ps.scale})`,
                      zIndex: isSelected ? 40 : 25,
                      cursor: isPaused ? 'not-allowed' : 'grab',
                      padding: isSelected ? '6px 8px' : 2,
                      border: isSelected ? '1.5px dashed #BC4374' : '1.5px solid transparent',
                      borderRadius: 8,
                      background: isSelected ? 'rgba(255,255,255,0.24)' : 'transparent',
                    }}
                    title="Geser untuk memindahkan, atau tarik sudut untuk mengubah ukuran"
                  >
                    {isTapeOrStamp ? (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          fontFamily: ps.category === 'stamp' ? 'monospace' : undefined,
                          padding: '3px 9px',
                          borderRadius: ps.category === 'tape' ? 3 : 6,
                          background:
                            ps.category === 'tape'
                              ? 'rgba(232, 156, 182, 0.9)'
                              : '#FFFDF9',
                          color: ps.category === 'stamp' ? '#BC4374' : '#18181B',
                          border:
                            ps.category === 'stamp'
                              ? '1.5px dashed #BC4374'
                              : '1px solid rgba(24,24,27,0.35)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ps.emoji} {ps.badgeText ?? ps.label}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '2.1rem',
                          lineHeight: 1,
                          display: 'block',
                          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
                        }}
                      >
                        {ps.emoji}
                      </span>
                    )}

                    {/* Canva-Style Interactive Corner Handles (Delete, Rotate, & Drag Corner Resize) */}
                    {isSelected && !isPaused && (
                      <>
                        {/* Top-Right: Delete Button (×) */}
                        <button
                          type="button"
                          onPointerDown={(ev) => ev.stopPropagation()}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onRemovePlacedSticker(ps.instanceId);
                            setSelectedStickerId(null);
                          }}
                          style={{
                            position: 'absolute',
                            top: -11,
                            right: -11,
                            width: 21,
                            height: 21,
                            transform: `scale(${invScale})`,
                            borderRadius: '50%',
                            border: '1.5px solid #18181B',
                            background: '#BC4374',
                            color: '#FFFFFF',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                          aria-label="Hapus stiker"
                          title="Hapus stiker (×)"
                        >
                          ×
                        </button>

                        {/* Top-Left: Quick Rotate / Drag Rotate Handle (↻) */}
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onUpdatePlacedSticker(ps.instanceId, {
                              rotation: ((ps.rotation + 15 + 180) % 360) - 180,
                            });
                          }}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            dragStateRef.current = {
                              mode: 'rotate',
                              instanceId: ps.instanceId,
                              startX: ev.clientX,
                              startY: ev.clientY,
                              origXPct: ps.xPct,
                              origYPct: ps.yPct,
                              origScale: ps.scale,
                              origRotation: ps.rotation,
                            };
                          }}
                          style={{
                            position: 'absolute',
                            top: -11,
                            left: -11,
                            width: 21,
                            height: 21,
                            transform: `scale(${invScale})`,
                            borderRadius: '50%',
                            border: '1.5px solid #18181B',
                            background: '#FFFFFF',
                            color: '#18181B',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'ew-resize',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
                          }}
                          aria-label="Putar stiker"
                          title="Klik atau geser untuk memutar stiker"
                        >
                          ↻
                        </button>

                        {/* Bottom-Right: Primary Drag Corner Resize Handle (↘) */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Tarik sudut kanan bawah untuk mengubah ukuran stiker"
                          title="Tarik sudut untuk memperbesar / memperkecil (Resize)"
                          onClick={(ev) => ev.stopPropagation()}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            dragStateRef.current = {
                              mode: 'resize',
                              instanceId: ps.instanceId,
                              startX: ev.clientX,
                              startY: ev.clientY,
                              origXPct: ps.xPct,
                              origYPct: ps.yPct,
                              origScale: ps.scale,
                              origRotation: ps.rotation,
                              cornerSignX: 1,
                              cornerSignY: 1,
                            };
                          }}
                          style={{
                            position: 'absolute',
                            bottom: -10,
                            right: -10,
                            width: 19,
                            height: 19,
                            transform: `scale(${invScale})`,
                            borderRadius: 5,
                            border: '2px solid #18181B',
                            background: '#FFFFFF',
                            color: '#BC4374',
                            fontSize: '0.66rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'nwse-resize',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.22)',
                          }}
                        >
                          ↘
                        </div>

                        {/* Bottom-Left: Secondary Drag Corner Resize Handle (↙) */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Tarik sudut kiri bawah untuk mengubah ukuran stiker"
                          title="Tarik sudut untuk memperbesar / memperkecil (Resize)"
                          onClick={(ev) => ev.stopPropagation()}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            dragStateRef.current = {
                              mode: 'resize',
                              instanceId: ps.instanceId,
                              startX: ev.clientX,
                              startY: ev.clientY,
                              origXPct: ps.xPct,
                              origYPct: ps.yPct,
                              origScale: ps.scale,
                              origRotation: ps.rotation,
                              cornerSignX: -1,
                              cornerSignY: 1,
                            };
                          }}
                          style={{
                            position: 'absolute',
                            bottom: -10,
                            left: -10,
                            width: 15,
                            height: 15,
                            transform: `scale(${invScale})`,
                            borderRadius: 4,
                            border: '2px solid #BC4374',
                            background: '#FFFFFF',
                            cursor: 'nesw-resize',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Sticker Quick Canva Bar directly beneath strip */}
            {selectedPlaced && !isPaused && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: '#FAF7F2',
                  border: '1.5px solid #18181B',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#18181B',
                }}
              >
                <span>{selectedPlaced.emoji} Edit Stiker:</span>
                <button
                  type="button"
                  className="btn"
                  style={{ minHeight: 26, padding: '2px 8px', fontSize: '0.74rem' }}
                  onClick={() =>
                    onUpdatePlacedSticker(selectedPlaced.instanceId, {
                      scale: Math.max(0.5, Number((selectedPlaced.scale - 0.15).toFixed(2))),
                    })
                  }
                >
                  − Perkecil
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ minHeight: 26, padding: '2px 8px', fontSize: '0.74rem' }}
                  onClick={() =>
                    onUpdatePlacedSticker(selectedPlaced.instanceId, {
                      scale: Math.min(2.4, Number((selectedPlaced.scale + 0.15).toFixed(2))),
                    })
                  }
                >
                  + Perbesar
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ minHeight: 26, padding: '2px 8px', fontSize: '0.74rem' }}
                  onClick={() =>
                    onUpdatePlacedSticker(selectedPlaced.instanceId, {
                      rotation: selectedPlaced.rotation - 15,
                    })
                  }
                >
                  ↺ Putar
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ minHeight: 26, padding: '2px 8px', fontSize: '0.74rem' }}
                  onClick={() =>
                    onUpdatePlacedSticker(selectedPlaced.instanceId, {
                      rotation: selectedPlaced.rotation + 15,
                    })
                  }
                >
                  ↻ Putar
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    minHeight: 26,
                    padding: '2px 8px',
                    fontSize: '0.74rem',
                    color: '#BC4374',
                  }}
                  onClick={() => {
                    onRemovePlacedSticker(selectedPlaced.instanceId);
                    setSelectedStickerId(null);
                  }}
                >
                  🗑️ Hapus
                </button>
              </div>
            )}

            {/* Primary Result Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <button
                type="button"
                className="btn btn-lift"
                style={{ minHeight: 42, padding: '6px 14px', fontSize: '0.84rem' }}
                onClick={() => setShowRetakePicker((v) => !v)}
              >
                🔄 Retake ({retakesRemaining} sisa)
              </button>

              <button
                type="button"
                className="btn btn-primary-pop"
                style={{ minHeight: 42, padding: '6px 18px', fontSize: '0.86rem' }}
                disabled={isSaving}
                onClick={() => void handleQuickDownload()}
              >
                {isSaving ? '⏳ Menyimpan...' : '💾 Simpan (.PNG)'}
              </button>

              <button
                type="button"
                className="btn btn-secondary-pop"
                style={{ minHeight: 42, padding: '6px 16px', fontSize: '0.84rem' }}
                onClick={() => onNavigate('export')}
              >
                ⚙️ Export / JPG →
              </button>
            </div>

            {savedNotice && (
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#166534',
                }}
              >
                ✅ Foto berhasil diunduh ke perangkatmu!
              </div>
            )}

            {showRetakePicker && (
              <div
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: '#FAF7F2',
                  border: '1.5px solid #18181B',
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
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#18181B',
                  }}
                >
                  <span>Pilih pose yang ingin diulang (Sisa {retakesRemaining}×):</span>
                  <button
                    type="button"
                    className="btn"
                    style={{ minHeight: 28, padding: '2px 10px', fontSize: '0.74rem' }}
                    onClick={() => onNavigate('camera')}
                  >
                    📷 Buka Kamera Ulang
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {visibleFrames.map((fr) => (
                    <button
                      key={fr.id}
                      type="button"
                      className="btn btn-lift"
                      style={{ minHeight: 34, padding: '4px 12px', fontSize: '0.76rem' }}
                      disabled={retakesRemaining <= 0}
                      onClick={() => {
                        realtimeClient.requestRetake(fr.id);
                        onRetakeFrame?.(fr.id);
                      }}
                    >
                      🔄 Ulang {fr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Tabbed Customize Session Panel */}
          <div
            className="clean-card surface-light"
            style={{
              background: '#FFFFFF',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <h2 className="heading-h2" style={{ color: '#18181B' }}>
                  Customize Frame
                </h2>
                <div style={{ fontSize: '0.76rem', color: '#52525B' }}>
                  {mode === 'duo'
                    ? `Kolaborasi Sinkron v${liveEditor?.editorVersion ?? 1} · Aktor: ${
                        liveEditor?.lastActor?.toUpperCase() ?? 'HOST'
                      }`
                    : 'Pilih satu tab pengaturan di bawah ini.'}
                </div>
              </div>

              {mode === 'duo' && (
                <button
                  type="button"
                  className={`btn btn-lift ${isPaused ? 'active-pill' : ''}`}
                  style={{ minHeight: 30, padding: '3px 10px', fontSize: '0.72rem' }}
                  onClick={() => {
                    if (realtimeState?.snapshot) {
                      if (isPaused) {
                        realtimeClient.resumeFromRecoveryWindow();
                        setDisconnectPaused(false);
                      } else {
                        realtimeClient.simulateDropRecoveryWindow();
                      }
                    } else {
                      setDisconnectPaused((v) => !v);
                    }
                  }}
                >
                  {isPaused ? '🔄 Pulihkan' : '⏸️ Uji Putus'}
                </button>
              )}
            </div>

            {/* 5 Clean Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                paddingBottom: 12,
                borderBottom: '1.5px solid rgba(24,24,27,0.12)',
              }}
            >
              {(
                [
                  { id: 'bg', label: '🎨 Warna' },
                  { id: 'frame', label: '🖼️ Frame' },
                  { id: 'stickers', label: '✨ Stiker' },
                  { id: 'caption', label: '✍️ Caption' },
                  { id: 'filter', label: '🎞️ Filter' },
                ] as Array<{ id: CustomizeTabId; label: string }>
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`btn ${activeTab === t.id ? 'active-pill' : ''}`}
                  style={{
                    minHeight: 36,
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: WARNA KERTAS / BG */}
            {activeTab === 'bg' && (
              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#18181B',
                    marginBottom: 12,
                  }}
                >
                  WARNA KERTAS FRAME
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {STRIP_COLORS.map((sw) => {
                    const active = stripTint === sw.hex;
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        disabled={isPaused}
                        onClick={() => onChangeStripTint(sw.hex)}
                        title={sw.name}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: sw.hex,
                          border: active
                            ? '3px solid #BC4374'
                            : '1.5px solid #18181B',
                          boxShadow: active ? '0 0 0 3px #FCEEF3' : 'none',
                          cursor: 'pointer',
                          color: sw.hex === '#18181B' ? '#FFFFFF' : '#18181B',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                        }}
                      >
                        {active ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#52525B', marginTop: 12 }}>
                  Tips: Frame 35mm Film selalu memakai rol hitam film autentik.
                </p>
              </div>
            )}

            {/* TAB 2: PILIH FRAME PRESET */}
            {activeTab === 'frame' && (
              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#18181B',
                    marginBottom: 12,
                  }}
                >
                  GAYA TEMPLATE FRAME ({activePreset.name})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {CLASSIC_TEMPLATE_PRESETS.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      disabled={isPaused}
                      className={`btn btn-lift ${layout === tpl.id ? 'active-pill' : ''}`}
                      style={{
                        minHeight: 46,
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        textAlign: 'left',
                      }}
                      onClick={() => onChangeLayout(tpl.id)}
                    >
                      <span>{tpl.name}</span>
                      {tpl.isNew && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 999,
                            background: layout === tpl.id ? '#FFFFFF' : '#BC4374',
                            color: layout === tpl.id ? '#BC4374' : '#FFFFFF',
                          }}
                        >
                          BARU
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#52525B', marginTop: 10 }}>
                  {activePreset.description}
                </div>
              </div>
            )}

            {/* TAB 3: CANVA-STYLE INTERACTIVE STIKER & PERSONAL UNDO */}
            {activeTab === 'stickers' && (
              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#18181B',
                    marginBottom: 4,
                  }}
                >
                  TAMBAH &amp; EDIT STIKER ALA CANVA
                </div>
                <p style={{ fontSize: '0.76rem', color: '#52525B', marginBottom: 10 }}>
                  Klik item di bawah untuk menempelkannya ke foto, lalu geser/besar-kecilkan/putar langsung di photostrip.
                </p>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {(
                    [
                      { id: 'all', label: 'Semua' },
                      { id: 'sticker', label: 'Stiker' },
                      { id: 'emoticon', label: 'Emotikon' },
                      { id: 'stamp', label: 'Stempel' },
                      { id: 'tape', label: 'Washi Tape' },
                    ] as Array<{ id: 'all' | StickerCategory; label: string }>
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`btn ${stickerTab === tab.id ? 'active-pill' : ''}`}
                      style={{ minHeight: 30, padding: '2px 10px', fontSize: '0.74rem' }}
                      onClick={() => setStickerTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {filteredStickers.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={isPaused}
                      className="btn btn-lift"
                      style={{ minHeight: 36, padding: '4px 11px', fontSize: '0.78rem' }}
                      onClick={() => {
                        const createdId = onAddPlacedSticker(st);
                        setSelectedStickerId(createdId);
                      }}
                    >
                      + {st.emoji} {st.label}
                    </button>
                  ))}
                </div>

                {/* Selected Sticker Slider Controls (Canva Inspector) */}
                {selectedPlaced && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#FAF7F2',
                      border: '1.5px solid #18181B',
                      marginBottom: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                      }}
                    >
                      <span>
                        Terpilih: {selectedPlaced.emoji} {selectedPlaced.label}
                      </span>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#BC4374',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          onRemovePlacedSticker(selectedPlaced.instanceId);
                          setSelectedStickerId(null);
                        }}
                      >
                        Hapus ×
                      </button>
                    </div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                      Ukuran ({Math.round(selectedPlaced.scale * 100)}%)
                      <input
                        type="range"
                        min={0.5}
                        max={2.4}
                        step={0.05}
                        value={selectedPlaced.scale}
                        onChange={(e) =>
                          onUpdatePlacedSticker(selectedPlaced.instanceId, {
                            scale: Number(e.target.value),
                          })
                        }
                        style={{ width: '100%', accentColor: '#BC4374' }}
                      />
                    </label>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                      Putar ({selectedPlaced.rotation}°)
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={selectedPlaced.rotation}
                        onChange={(e) =>
                          onUpdatePlacedSticker(selectedPlaced.instanceId, {
                            rotation: Number(e.target.value),
                          })
                        }
                        style={{ width: '100%', accentColor: '#BC4374' }}
                      />
                    </label>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    paddingTop: 10,
                    borderTop: '1px dashed rgba(24,24,27,0.2)',
                  }}
                >
                  <button
                    type="button"
                    disabled={isPaused}
                    className="btn btn-lift"
                    style={{ fontSize: '0.78rem', minHeight: 36, padding: '4px 12px' }}
                    onClick={() => onUndoByOwner('host')}
                  >
                    ↩ Undo Host
                  </button>
                  {mode === 'duo' && (
                    <button
                      type="button"
                      disabled={isPaused}
                      className="btn btn-lift"
                      style={{ fontSize: '0.78rem', minHeight: 36, padding: '4px 12px' }}
                      onClick={() => onUndoByOwner('guest')}
                    >
                      ↩ Undo Guest
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: CAPTION & TANGGAL */}
            {activeTab === 'caption' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label
                    htmlFor="strip-caption-input"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#18181B',
                      marginBottom: 8,
                    }}
                  >
                    TEKS CAPTION BAWAH
                  </label>
                  <input
                    id="strip-caption-input"
                    type="text"
                    disabled={isPaused}
                    value={caption}
                    placeholder="Tambahkan kenangan singkat..."
                    onChange={(e) => onChangeCaption(e.target.value)}
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 14px',
                      borderRadius: 999,
                      border: '1.5px solid #18181B',
                      background: '#FAF7F2',
                      color: '#18181B',
                      fontFamily: 'var(--primitive-font-body)',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    'Momentos Studio ✨',
                    'Besties Day Out ✌️',
                    'Kenangan 2026 ❤️',
                  ].map((presetText) => (
                    <button
                      key={presetText}
                      type="button"
                      disabled={isPaused}
                      className="btn btn-lift"
                      style={{ minHeight: 30, padding: '3px 10px', fontSize: '0.74rem' }}
                      onClick={() => onChangeCaption(presetText)}
                    >
                      + {presetText}
                    </button>
                  ))}
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1.5px solid #18181B',
                    background: '#FAF7F2',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#18181B',
                  }}
                >
                  <span>📅 Tampilkan Cap Tanggal Otomatis</span>
                  <input
                    type="checkbox"
                    checked={showDateStamp}
                    onChange={(e) => setShowDateStamp(e.target.checked)}
                  />
                </label>
              </div>
            )}

            {/* TAB 5: FILTER WARNA FOTO */}
            {activeTab === 'filter' && (
              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#18181B',
                    marginBottom: 12,
                  }}
                >
                  FILTER WARNA ({activeFilter.name})
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PHOTO_FILTER_PRESETS.map((flt) => (
                    <button
                      key={flt.id}
                      type="button"
                      disabled={isPaused}
                      className={`btn btn-lift ${
                        selectedFilter === flt.id ? 'active-pill' : ''
                      }`}
                      style={{
                        minHeight: 38,
                        padding: '5px 12px',
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
                          border: '1px solid rgba(24,24,27,0.35)',
                        }}
                      />
                      {flt.name}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#52525B', marginTop: 10 }}>
                  {activeFilter.description}
                </p>
              </div>
            )}

            <div
              style={{
                marginTop: 6,
                paddingTop: 14,
                borderTop: '1.5px solid rgba(24,24,27,0.1)',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="btn btn-primary-pop"
                style={{ flex: 1 }}
                disabled={isSaving}
                onClick={() => void handleQuickDownload()}
              >
                Simpan Perubahan (.PNG)
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
      </section>
    </div>
  );
};
