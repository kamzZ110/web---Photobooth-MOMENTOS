import React, { useState } from 'react';
import {
  CLASSIC_TEMPLATE_PRESETS,
  PHOTO_FILTER_PRESETS,
  type BoothMode,
  type CapturedFrame,
  type PhotoFilterId,
  type ScreenId,
  type StickerCategory,
  type StickerItem,
  type TemplateLayoutId,
} from '@momentos/shared';

interface EditorScreenProps {
  mode: BoothMode;
  takeCount: 3 | 4;
  frames: CapturedFrame[];
  layout: TemplateLayoutId;
  onChangeLayout: (layout: TemplateLayoutId) => void;
  selectedFilter: PhotoFilterId;
  onChangeFilter: (filter: PhotoFilterId) => void;
  stripTint: string;
  onChangeStripTint: (color: string) => void;
  caption: string;
  onChangeCaption: (text: string) => void;
  stickers: StickerItem[];
  onToggleSticker: (id: string) => void;
  onUndoByOwner: (owner: 'host' | 'guest') => void;
  onNavigate: (screen: ScreenId) => void;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({
  mode,
  takeCount,
  frames,
  layout,
  onChangeLayout,
  selectedFilter,
  onChangeFilter,
  stripTint,
  onChangeStripTint,
  caption,
  onChangeCaption,
  stickers,
  onToggleSticker,
  onUndoByOwner,
  onNavigate,
}) => {
  const [disconnectPaused, setDisconnectPaused] = useState(false);
  const [stickerTab, setStickerTab] = useState<'all' | StickerCategory>('all');
  const visibleFrames = frames.slice(0, takeCount);
  const activeStickers = stickers.filter((s) => s.active);
  const filteredStickers =
    stickerTab === 'all'
      ? stickers
      : stickers.filter((s) => (s.category ?? 'sticker') === stickerTab);

  const activePreset =
    CLASSIC_TEMPLATE_PRESETS.find((t) => t.id === layout) ?? CLASSIC_TEMPLATE_PRESETS[0];
  const activeFilter =
    PHOTO_FILTER_PRESETS.find((f) => f.id === selectedFilter) ?? PHOTO_FILTER_PRESETS[0];

  const isFilm35mm = layout === 'film-35mm';
  const isTicket = layout === 'vintage-ticket';
  const isScrapbook = layout === 'editorial-scrapbook';
  const effectiveBg = isFilm35mm
    ? '#181619'
    : isTicket && stripTint === '#FFFFFF'
    ? '#F4ECDD'
    : isScrapbook && stripTint === '#FFFFFF'
    ? '#FAF3EA'
    : stripTint;

  return (
    <div className="page-stack">
      <section>
        <div className="page-intro">
          <span className="eyebrow-text">Template &amp; Editor Kolaboratif</span>
          <h1 className="heading-h1" style={{ marginBottom: 12 }}>
            Hias strip di kanvas putih netral.
          </h1>
          <p className="text-muted">
            Pilih layout, warna kertas, dan stiker bersama tanpa mengunci objek.
            Tombol Undo hanya membatalkan perubahan milikmu sendiri.
          </p>
        </div>

        {mode === 'duo' && (
          <div className="demo-state-strip">
            <button
              type="button"
              className={`btn btn-lift ${disconnectPaused ? 'active-pill' : ''}`}
              style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
              onClick={() => setDisconnectPaused((v) => !v)}
            >
              {disconnectPaused
                ? 'Pulihkan Koneksi Editor'
                : 'Simulasi Putus Koneksi Saat Edit'}
            </button>
          </div>
        )}

        {mode === 'duo' && disconnectPaused && (
          <div
            className="clean-card"
            style={{
              background: '#FCEEF3',
              marginBottom: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            <div>
              <h3 className="heading-h2">
                Editor Dijeda Sementara — Menunggu Guest Rejoin (04:35)
              </h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Kanvas dijeda sementara agar perubahan tidak saling bertabrakan selama
                salah satu peserta menyambung ulang.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary-pop"
              onClick={() => setDisconnectPaused(false)}
            >
              Pulihkan Sekarang
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(290px, 0.9fr) minmax(0, 1.35fr)',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Kontrol Editor */}
          <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 10 }}>
                1. PRESET FRAME CLASSIC (6 VARIASI · 3 DESAIN BARU)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CLASSIC_TEMPLATE_PRESETS.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={disconnectPaused}
                    className={`btn btn-lift ${layout === tpl.id ? 'active-pill' : ''}`}
                    style={{
                      minHeight: 44,
                      padding: '8px 10px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      textAlign: 'left',
                    }}
                    title={tpl.description}
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
              <div className="text-muted" style={{ fontSize: '0.76rem', marginTop: 6 }}>
                {activePreset.description}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 10 }}>
                2. PRESET FILTER WARNA FOTO (8 TONE)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PHOTO_FILTER_PRESETS.map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    disabled={disconnectPaused}
                    className={`btn btn-lift ${selectedFilter === flt.id ? 'active-pill' : ''}`}
                    style={{
                      minHeight: 34,
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title={flt.description}
                    onClick={() => onChangeFilter(flt.id)}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: flt.previewBg,
                        border: '1px solid rgba(24,24,27,0.3)',
                      }}
                    />
                    {flt.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 10 }}>
                3. WARNA KERTAS FRAME
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { hex: '#FFFFFF', name: 'Putih' },
                  { hex: '#FAF7F2', name: 'Cream' },
                  { hex: '#FCEEF3', name: 'Berry' },
                  { hex: '#EBF4FD', name: 'Sky' },
                  { hex: '#ECF3ED', name: 'Sage' },
                ].map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    disabled={disconnectPaused}
                    className="btn btn-lift"
                    style={{
                      minHeight: 36,
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      background: sw.hex,
                      borderWidth: stripTint === sw.hex ? 2 : 1.5,
                    }}
                    onClick={() => onChangeStripTint(sw.hex)}
                  >
                    {stripTint === sw.hex ? `✓ ${sw.name}` : sw.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 8 }}>
                4. ASET EDITING MANDIRI (STIKER · EMOTIKON · STEMPEL)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
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
                    style={{ minHeight: 28, padding: '2px 10px', fontSize: '0.72rem' }}
                    onClick={() => setStickerTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {filteredStickers.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    disabled={disconnectPaused}
                    className={`btn btn-lift ${st.active ? 'active-pill' : ''}`}
                    style={{ minHeight: 34, padding: '4px 10px', fontSize: '0.76rem' }}
                    onClick={() => onToggleSticker(st.id)}
                  >
                    {st.emoji} {st.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={disconnectPaused}
                  className="btn btn-lift"
                  style={{ fontSize: '0.78rem', minHeight: 36, padding: '4px 12px' }}
                  onClick={() => onUndoByOwner('host')}
                >
                  ↩ Undo Host
                </button>
                {mode === 'duo' && (
                  <button
                    type="button"
                    disabled={disconnectPaused}
                    className="btn btn-lift"
                    style={{ fontSize: '0.78rem', minHeight: 36, padding: '4px 12px' }}
                    onClick={() => onUndoByOwner('guest')}
                  >
                    ↩ Undo Guest
                  </button>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="strip-caption-input"
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: 8 }}
              >
                5. CAPTION STRIP
              </label>
              <input
                id="strip-caption-input"
                type="text"
                disabled={disconnectPaused}
                value={caption}
                onChange={(e) => onChangeCaption(e.target.value)}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '0 14px',
                  borderRadius: 999,
                  border: '1.5px solid #18181B',
                  fontFamily: 'var(--primitive-font-body)',
                  fontWeight: 600,
                }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ width: '100%', marginTop: 4 }}
              onClick={() => onNavigate('export')}
            >
              Selesai Edit &amp; Cetak Final →
            </button>
          </div>

          {/* Kanvas Kerja Putih Netral (#FFFFFF) */}
          <div
            className="clean-card"
            style={{
              background: '#FFFFFF',
              minHeight: 520,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="pill-tag" style={{ fontSize: '0.72rem' }}>
                Preset: {activePreset.name}
              </span>
              <span className="pill-tag" style={{ fontSize: '0.72rem' }}>
                Filter: {activeFilter.name}
              </span>
            </div>

            <div
              style={{
                position: 'relative',
                width: layout === 'grid-2x2' || isScrapbook ? 370 : 272,
                background: effectiveBg,
                backgroundImage: isScrapbook
                  ? 'radial-gradient(#d8c8b6 1px, transparent 1px)'
                  : undefined,
                backgroundSize: isScrapbook ? '16px 16px' : undefined,
                color: isFilm35mm ? '#FAF3EA' : '#18181B',
                border: isFilm35mm ? '2px solid #322E34' : '2px solid #18181B',
                borderRadius: isTicket ? 14 : isFilm35mm ? 10 : 18,
                padding: isFilm35mm ? '16px 26px' : 18,
                boxShadow: '6px 6px 0px #18181B',
              }}
            >
              {/* Sprocket holes on left & right for 35mm Film preset */}
              {isFilm35mm && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      bottom: 16,
                      left: 7,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          width: 10,
                          height: 15,
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
                      top: 16,
                      bottom: 16,
                      right: 7,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          width: 10,
                          height: 15,
                          borderRadius: 2,
                          background: '#FFFFFF',
                          display: 'block',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Top Header for Ticket / Film / Scrapbook */}
              {isTicket && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#9E325F',
                    borderBottom: '1.5px solid rgba(158,50,95,0.35)',
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
                    fontSize: '0.65rem',
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
                    style={{ fontSize: '1.15rem', color: '#2A1F1D' }}
                  >
                    Little Moments Journal
                  </div>
                  <div
                    style={{
                      fontSize: '0.62rem',
                      letterSpacing: '0.14em',
                      fontWeight: 700,
                      color: '#BC4374',
                    }}
                  >
                    SCRAPBOOK EDITION • VOL. 03
                  </div>
                </div>
              )}

              {/* Active Stickers / Stamps / Washi Tape */}
              {activeStickers.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {activeStickers.map((st) => {
                    const isTape = st.category === 'tape';
                    const isStamp = st.category === 'stamp';
                    return (
                      <span
                        key={st.id}
                        style={{
                          fontSize: isStamp || isTape ? '0.66rem' : '0.76rem',
                          fontWeight: 700,
                          fontFamily: isStamp ? 'monospace' : undefined,
                          letterSpacing: isStamp ? '0.06em' : undefined,
                          padding: isTape ? '3px 11px' : '3px 9px',
                          borderRadius: isTape ? 3 : isStamp ? 6 : 999,
                          background: isTape
                            ? 'rgba(232, 156, 182, 0.85)'
                            : isStamp
                            ? '#FFFDF9'
                            : '#FFFFFF',
                          color: isStamp ? '#BC4374' : '#18181B',
                          border: isStamp
                            ? '1.5px dashed #BC4374'
                            : isTape
                            ? 'none'
                            : '1.5px solid #18181B',
                          transform: isTape ? 'rotate(-2deg)' : isStamp ? 'rotate(2deg)' : undefined,
                        }}
                      >
                        {st.emoji} {st.badgeText ?? st.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Photo Slots Grid (Filter Applied Live!) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    layout === 'grid-2x2' || isScrapbook ? '1fr 1fr' : '1fr',
                  gap: isScrapbook ? 14 : 10,
                  filter: activeFilter.cssFilter,
                  transition: 'filter 0.25s ease',
                }}
              >
                {visibleFrames.map((fr, idx) => (
                  <div
                    key={fr.id}
                    style={{
                      position: 'relative',
                      background: isScrapbook ? '#FFFFFF' : fr.accentBg,
                      border: isFilm35mm
                        ? '1.5px solid rgba(224,159,90,0.45)'
                        : isScrapbook
                        ? '1px solid #DFD3C3'
                        : '1.5px solid #18181B',
                      borderRadius: isScrapbook ? 6 : 10,
                      padding: isScrapbook
                        ? '10px 10px 22px'
                        : layout === 'polaroid-duo'
                        ? '18px 10px'
                        : '12px 10px',
                      boxShadow: isScrapbook ? '0 4px 10px rgba(0,0,0,0.08)' : undefined,
                      transform: isScrapbook
                        ? `rotate(${idx % 2 === 0 ? '-2.5deg' : '2.5deg'})`
                        : undefined,
                      color: '#18181B',
                      display: 'flex',
                      flexDirection: isScrapbook ? 'column' : 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    {isScrapbook && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -7,
                          width: 44,
                          height: 12,
                          background: idx % 2 === 0 ? '#E89CB6' : '#A9C096',
                          opacity: 0.85,
                          borderRadius: 2,
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        fontFamily: isFilm35mm ? 'monospace' : undefined,
                        color: isFilm35mm ? '#E09F5A' : '#18181B',
                      }}
                    >
                      {isFilm35mm ? `▶ 0${idx + 1}A` : fr.label}
                    </span>
                    {fr.imageDataUrl ? (
                      <img
                        src={fr.imageDataUrl}
                        alt={fr.label}
                        style={{
                          width: isScrapbook ? '100%' : '66%',
                          height: isScrapbook ? 116 : 92,
                          objectFit: 'cover',
                          borderRadius: isScrapbook ? 4 : 8,
                          display: 'block',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: isScrapbook ? '2rem' : '1.45rem' }}>
                        {mode === 'duo' ? `${fr.hostPose} ${fr.guestPose}` : fr.hostPose}
                      </span>
                    )}
                    {isScrapbook && (
                      <span
                        style={{
                          fontFamily: 'Georgia, serif',
                          fontStyle: 'italic',
                          fontSize: '0.68rem',
                          color: '#6E5A4F',
                        }}
                      >
                        take #{idx + 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Ticket Tear-Off Stub vs Film vs Default Footer */}
              {isTicket ? (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 10,
                    borderTop: '2px dashed #7A6554',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '0.96rem' }}>
                    {caption || 'MOMENTOS ADMIT ONE'}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      height: 16,
                      background:
                        'repeating-linear-gradient(90deg, #18181B 0 3px, transparent 3px 6px, #18181B 6px 7px, transparent 7px 11px)',
                      opacity: 0.82,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 8,
                    borderTop: isFilm35mm
                      ? '1px solid rgba(224,159,90,0.35)'
                      : '1.5px dashed rgba(24,24,27,0.22)',
                    textAlign: 'center',
                    fontFamily: isFilm35mm
                      ? 'monospace'
                      : 'var(--primitive-font-heading)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: isFilm35mm ? '#E09F5A' : undefined,
                  }}
                >
                  {caption || 'MOMENTOS • 2026'}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Panduan Kolaborasi Editor */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Cara Kerja Editor</span>
          <h2 className="heading-h1">Bebas berkreasi tanpa saling mengunci.</h2>
        </div>

        <div className="grid-3">
          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#FFFFFF' }}>
              🎨
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Kanvas Putih Netral
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Kanvas kerja selalu dijaga tetap putih bersih (#FFFFFF) tanpa tekstur
              atau tint latar agar warna foto akurat.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#FCEEF3' }}>
              ↩️
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Personal Undo
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Saat kamu menekan Undo, hanya stiker atau perubahan milikmu sendiri yang
              dibatalkan. Hiasan temanmu tetap aman.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              ⏸️
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Jeda Aman Saat Putus
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Jika salah satu peserta terputus di tengah pengeditan, editor dijeda
              sementara hingga koneksi pulih kembali.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
