import React, { useState } from 'react';
import {
  CLASSIC_TEMPLATE_PRESETS,
  type BoothMode,
  type ClassicTemplatePreset,
  type ScreenId,
  type TemplateLayoutId,
} from '@momentos/shared';

interface FrameSelectScreenProps {
  mode: BoothMode;
  layout: TemplateLayoutId;
  onChangeLayout: (layout: TemplateLayoutId) => void;
  takeCount: number;
  onChangeTakeCount: (count: number) => void;
  roomCode?: string | null;
  onNavigate: (screen: ScreenId) => void;
}

type FrameCategory = 'strips' | 'instant';

const STRIP_IDS: TemplateLayoutId[] = ['strip-1x4', 'vintage-ticket', 'film-35mm'];
const INSTANT_IDS: TemplateLayoutId[] = [
  'grid-2x2',
  'polaroid-duo',
  'editorial-scrapbook',
];

const MINI_POSES = ['😊', '✌️', '🤩', '🫶', '😎', '🥳', '😉', '🌸'];

export const FrameSelectScreen: React.FC<FrameSelectScreenProps> = ({
  mode,
  layout,
  onChangeLayout,
  takeCount,
  onChangeTakeCount,
  roomCode,
  onNavigate,
}) => {
  const initialCategory: FrameCategory = INSTANT_IDS.includes(layout)
    ? 'instant'
    : 'strips';
  const [category, setCategory] = useState<FrameCategory>(initialCategory);
  const [customPoseInput, setCustomPoseInput] = useState<string>(
    takeCount > 4 || takeCount === 1 ? String(takeCount) : '6'
  );
  const [isCustomPoseActive, setIsCustomPoseActive] = useState<boolean>(
    takeCount > 4 || takeCount === 1
  );

  const stripPresets = CLASSIC_TEMPLATE_PRESETS.filter((p) =>
    STRIP_IDS.includes(p.id)
  );
  const instantPresets = CLASSIC_TEMPLATE_PRESETS.filter((p) =>
    INSTANT_IDS.includes(p.id)
  );

  const selectedStripIdx = Math.max(
    0,
    stripPresets.findIndex((p) => p.id === layout)
  );

  const handleCycleStrip = (delta: number) => {
    const nextIdx =
      (selectedStripIdx + delta + stripPresets.length) % stripPresets.length;
    onChangeLayout(stripPresets[nextIdx].id);
  };

  const handleSwitchCategory = (nextCat: FrameCategory) => {
    setCategory(nextCat);
    if (nextCat === 'strips' && !STRIP_IDS.includes(layout)) {
      onChangeLayout(stripPresets[0].id);
    } else if (nextCat === 'instant' && !INSTANT_IDS.includes(layout)) {
      onChangeLayout(instantPresets[0].id);
    }
  };

  const renderStripMiniCard = (preset: ClassicTemplatePreset) => {
    const isSelected = layout === preset.id;
    const isFilm = preset.id === 'film-35mm';
    const isTicket = preset.id === 'vintage-ticket';

    return (
      <button
        key={preset.id}
        type="button"
        onClick={() => onChangeLayout(preset.id)}
        className="surface-light"
        style={{
          position: 'relative',
          width: isSelected ? 215 : 185,
          padding: isFilm ? '14px 20px' : '16px 14px',
          borderRadius: isTicket ? 12 : 18,
          background: preset.frameTone,
          color: isFilm ? '#FAF3EA' : '#18181B',
          border: isSelected ? '3px solid #BC4374' : '1.5px solid #18181B',
          boxShadow: isSelected
            ? '0 10px 24px rgba(188, 67, 116, 0.22)'
            : '4px 4px 0px #18181B',
          transform: isSelected ? 'scale(1.03)' : 'scale(0.95)',
          opacity: isSelected ? 1 : 0.84,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {preset.isNew && (
          <span
            style={{
              position: 'absolute',
              top: -10,
              right: 12,
              background: '#BC4374',
              color: '#FFFFFF',
              fontSize: '0.64rem',
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: 999,
              border: '1.5px solid #18181B',
            }}
          >
            BARU
          </span>
        )}

        {/* Decorative Film Sprockets */}
        {isFilm && (
          <div
            style={{
              position: 'absolute',
              inset: '14px 6px',
              display: 'flex',
              justifyContent: 'space-between',
              pointerEvents: 'none',
            }}
          >
            {[0, 1].map((col) => (
              <div
                key={col}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {Array.from({ length: 7 }).map((_, idx) => (
                  <span
                    key={idx}
                    style={{
                      width: 6,
                      height: 10,
                      borderRadius: 1.5,
                      background: '#FFFFFF',
                      opacity: 0.9,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {isTicket && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.56rem',
              fontWeight: 800,
              color: '#9E325F',
              borderBottom: '1px dashed rgba(158,50,95,0.4)',
              paddingBottom: 4,
            }}
          >
            <span>ADMIT ONE</span>
            <span>#2026</span>
          </div>
        )}

        {/* Mini Pose Windows */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: takeCount > 4 ? '1fr 1fr' : '1fr',
            gap: 6,
          }}
        >
          {Array.from({ length: takeCount }).map((_, idx) => (
            <div
              key={idx}
              style={{
                height: takeCount > 4 ? 36 : takeCount === 4 ? 40 : 52,
                borderRadius: 8,
                background: isFilm
                  ? '#2C282F'
                  : idx % 2 === 0
                  ? '#FCEEF3'
                  : '#EBF4FD',
                border: isFilm
                  ? '1px solid rgba(224,159,90,0.45)'
                  : '1px solid rgba(24,24,27,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: takeCount > 4 ? '0.95rem' : '1.15rem',
              }}
            >
              {MINI_POSES[idx % MINI_POSES.length]}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 4, textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--primitive-font-heading)',
              fontWeight: 800,
              fontSize: '0.92rem',
              color: isFilm ? '#E09F5A' : '#18181B',
            }}
          >
            {preset.name}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              opacity: 0.78,
              color: isFilm ? '#E5E7EB' : '#52525B',
            }}
          >
            {isSelected ? '✓ Terpilih' : 'Klik untuk pilih'}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="page-stack" style={{ maxWidth: 960, margin: '0 auto' }}>
      <section>
        {/* Clean 4-Step Progress Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 24,
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
                className={`btn ${st.id === 'frame-select' ? 'active-pill' : ''}`}
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
          <span className="eyebrow-text">
            Langkah 02 · Mode {mode === 'duo' ? 'Duo' : 'Solo'}
            {roomCode ? ` (Room ${roomCode})` : ''}
          </span>
          <h1 className="heading-h1" style={{ marginBottom: 8 }}>
            Pilih gaya <span className="font-upright-serif">frame</span>-mu.
          </h1>
          <p className="text-muted">
            Pilih bentuk photostrip atau kolase dan jumlah pose sebelum kamera terbuka.
          </p>
        </div>

        {/* Category Toggle + Pose Count Pills */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 28,
          }}
        >
          <div
            className="glass-bar"
            style={{
              padding: 5,
              display: 'inline-flex',
              gap: 6,
            }}
          >
            <button
              type="button"
              className={`btn ${category === 'strips' ? 'active-pill' : ''}`}
              style={{ minHeight: 36, padding: '6px 16px', fontSize: '0.82rem' }}
              onClick={() => handleSwitchCategory('strips')}
            >
              🎞️ Photo Strips
            </button>
            <button
              type="button"
              className={`btn ${category === 'instant' ? 'active-pill' : ''}`}
              style={{ minHeight: 36, padding: '6px 16px', fontSize: '0.82rem' }}
              onClick={() => handleSwitchCategory('instant')}
            >
              🖼️ Instant &amp; Kolase
            </button>
          </div>

          <div
            className="glass-bar"
            style={{
              padding: 5,
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {([2, 3, 4] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                className={`btn ${!isCustomPoseActive && takeCount === cnt ? 'active-pill' : ''}`}
                style={{ minHeight: 36, padding: '6px 14px', fontSize: '0.8rem' }}
                onClick={() => {
                  setIsCustomPoseActive(false);
                  onChangeTakeCount(cnt);
                }}
              >
                {cnt} Pose
              </button>
            ))}

            <button
              type="button"
              className={`btn ${isCustomPoseActive || takeCount > 4 || takeCount === 1 ? 'active-pill' : ''}`}
              style={{ minHeight: 36, padding: '6px 14px', fontSize: '0.8rem' }}
              onClick={() => {
                setIsCustomPoseActive(true);
                const parsed = Number.parseInt(customPoseInput, 10);
                const clamped = Number.isFinite(parsed)
                  ? Math.max(1, Math.min(8, parsed))
                  : 6;
                setCustomPoseInput(String(clamped));
                onChangeTakeCount(clamped);
              }}
            >
              ✏️ Kustom (Maks 8)
            </button>

            {(isCustomPoseActive || takeCount > 4 || takeCount === 1) && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#FAF7F2',
                  border: '1.5px solid #18181B',
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={8}
                  aria-label="Input jumlah pose kustom (maksimal 8)"
                  value={customPoseInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setCustomPoseInput(raw);
                    const num = Number.parseInt(raw, 10);
                    if (Number.isFinite(num)) {
                      const clamped = Math.max(1, Math.min(8, num));
                      onChangeTakeCount(clamped);
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
                    width: 48,
                    height: 28,
                    borderRadius: 999,
                    border: '1px solid rgba(24,24,27,0.35)',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    background: '#FFFFFF',
                    color: '#18181B',
                  }}
                />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#18181B' }}>
                  / 8 Pose
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Category 1: Photo Strips 3-Card Carousel */}
        {category === 'strips' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 28,
            }}
          >
            <button
              type="button"
              className="btn btn-lift"
              aria-label="Frame sebelumnya"
              style={{
                width: 44,
                minHeight: 44,
                padding: 0,
                borderRadius: '50%',
                fontSize: '1.2rem',
              }}
              onClick={() => handleCycleStrip(-1)}
            >
              ‹
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                flexWrap: 'wrap',
              }}
            >
              {stripPresets.map((preset) => renderStripMiniCard(preset))}
            </div>

            <button
              type="button"
              className="btn btn-lift"
              aria-label="Frame berikutnya"
              style={{
                width: 44,
                minHeight: 44,
                padding: 0,
                borderRadius: '50%',
                fontSize: '1.2rem',
              }}
              onClick={() => handleCycleStrip(1)}
            >
              ›
            </button>
          </div>
        ) : (
          /* Category 2: Instant & Kolase Clean Stacked List */
          <div
            style={{
              maxWidth: 640,
              margin: '0 auto 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {instantPresets.map((preset) => {
              const isSelected = layout === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeLayout(preset.id)}
                  className="clean-card interactive surface-light"
                  style={{
                    width: '100%',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    textAlign: 'left',
                    borderColor: isSelected ? '#BC4374' : '#18181B',
                    borderWidth: isSelected ? 2.5 : 1.5,
                    background: isSelected ? '#FCEEF3' : '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        border: '1.5px solid #18181B',
                        background: preset.frameTone,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 3,
                        padding: 6,
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ background: '#E89CB6', borderRadius: 2 }} />
                      <span style={{ background: '#7AB3EF', borderRadius: 2 }} />
                      <span style={{ background: '#A9C096', borderRadius: 2 }} />
                      <span style={{ background: '#F6E8BA', borderRadius: 2 }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong
                          style={{
                            fontFamily: 'var(--primitive-font-heading)',
                            fontSize: '1.05rem',
                            color: '#18181B',
                          }}
                        >
                          {preset.name}
                        </strong>
                        {preset.isNew && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: '#BC4374',
                              color: '#FFFFFF',
                            }}
                          >
                            BARU
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#52525B', marginTop: 2 }}>
                        {preset.description}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: isSelected ? '#BC4374' : '#52525B',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected ? '✓ Dipilih' : 'Pilih →'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Frame Summary + Proceed CTA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn btn-lift"
            onClick={() => onNavigate('room')}
          >
            ← Ganti Mode
          </button>

          <button
            type="button"
            className="btn btn-primary-pop"
            style={{ minHeight: 50, padding: '10px 28px', fontSize: '0.96rem' }}
            onClick={() => onNavigate('camera')}
          >
            Lanjut ke Kamera ({takeCount} Pose) →
          </button>
        </div>
      </section>
    </div>
  );
};
