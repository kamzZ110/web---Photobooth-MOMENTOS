import React, { useState } from 'react';
import type {
  BoothMode,
  CapturedFrame,
  ScreenId,
  StickerItem,
  TemplateLayoutId,
} from '@momentos/shared';

interface EditorScreenProps {
  mode: BoothMode;
  takeCount: 3 | 4;
  frames: CapturedFrame[];
  layout: TemplateLayoutId;
  onChangeLayout: (layout: TemplateLayoutId) => void;
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
  const visibleFrames = frames.slice(0, takeCount);
  const activeStickers = stickers.filter((s) => s.active);

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
          <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 10 }}>
                1. TATA LETAK TEMPLATE
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(
                  [
                    { id: 'strip-1x4', label: 'Strip 1×N' },
                    { id: 'grid-2x2', label: 'Grid 2×2' },
                    { id: 'polaroid-duo', label: 'Polaroid' },
                  ] as Array<{ id: TemplateLayoutId; label: string }>
                ).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={disconnectPaused}
                    className={`btn btn-lift ${layout === tpl.id ? 'active-pill' : ''}`}
                    style={{ minHeight: 38, padding: '6px 14px', fontSize: '0.82rem' }}
                    onClick={() => onChangeLayout(tpl.id)}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 10 }}>
                2. WARNA KERTAS FRAME
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
              <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 10 }}>
                3. STIKER &amp; PERSONAL UNDO
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {stickers.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    disabled={disconnectPaused}
                    className={`btn btn-lift ${st.active ? 'active-pill' : ''}`}
                    style={{ minHeight: 36, padding: '4px 12px', fontSize: '0.8rem' }}
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
                4. CAPTION STRIP
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
              minHeight: 480,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: layout === 'grid-2x2' ? 340 : 250,
                background: stripTint,
                border: '2px solid #18181B',
                borderRadius: 16,
                padding: 16,
                boxShadow: '5px 5px 0px #18181B',
              }}
            >
              {activeStickers.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {activeStickers.map((st) => (
                    <span
                      key={st.id}
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: '#FFFFFF',
                        border: '1.5px solid #18181B',
                      }}
                    >
                      {st.emoji} {st.label}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: layout === 'grid-2x2' ? '1fr 1fr' : '1fr',
                  gap: 10,
                }}
              >
                {visibleFrames.map((fr) => (
                  <div
                    key={fr.id}
                    style={{
                      background: fr.accentBg,
                      border: '1.5px solid #18181B',
                      borderRadius: 10,
                      padding: layout === 'polaroid-duo' ? '18px 10px' : '12px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>{fr.label}</span>
                    <span style={{ fontSize: '1.4rem' }}>
                      {mode === 'duo'
                        ? `${fr.hostPose} ${fr.guestPose}`
                        : fr.hostPose}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: '1.5px dashed rgba(24,24,27,0.22)',
                  textAlign: 'center',
                  fontFamily: 'var(--primitive-font-heading)',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                }}
              >
                {caption || 'MOMENTOS • 2026'}
              </div>
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
