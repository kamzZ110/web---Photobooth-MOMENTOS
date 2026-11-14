import React, { useEffect, useState } from 'react';
import type {
  BoothMode,
  CapturedFrame,
  ExportFormat,
  ExportStatus,
  PhotoFilterId,
  ScreenId,
  StickerItem,
  TemplateLayoutId,
} from '@momentos/shared';
import { InstantCameraRig } from '../../components/InstantCameraRig';
import {
  renderClassicCompositeDataUrl,
  triggerFileDownload,
} from '../../lib/mediaEngine';

interface ExportScreenProps {
  mode: BoothMode;
  isNight?: boolean;
  takeCount: 3 | 4;
  frames: CapturedFrame[];
  layout: TemplateLayoutId;
  selectedFilter: PhotoFilterId;
  stripTint: string;
  caption: string;
  stickers: StickerItem[];
  onNavigate: (screen: ScreenId) => void;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({
  mode,
  isNight = false,
  takeCount,
  frames,
  layout,
  selectedFilter,
  stripTint,
  caption,
  stickers,
  onNavigate,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const visibleFrames = frames.slice(0, takeCount);
  const activeStickers = stickers.filter((s) => s.active);

  useEffect(() => {
    let active = true;
    renderClassicCompositeDataUrl({
      mode,
      frames: visibleFrames,
      layout,
      stripTint,
      selectedFilter,
      caption,
      stickers,
      format,
    })
      .then((url) => {
        if (active) setPreviewDataUrl(url);
      })
      .catch(() => {
        // Keep previous preview if transient
      });

    return () => {
      active = false;
    };
  }, [mode, takeCount, frames, layout, selectedFilter, stripTint, caption, stickers, format]);

  const handleRealDownload = async () => {
    setStatus('rendering');
    try {
      const url = await renderClassicCompositeDataUrl({
        mode,
        frames: visibleFrames,
        layout,
        stripTint,
        selectedFilter,
        caption,
        stickers,
        format,
      });
      setPreviewDataUrl(url);
      triggerFileDownload(url, `momentos-${mode}-${layout}.${format}`);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="page-stack">
      <section>
        <div className="page-intro">
          <span className="eyebrow-text">Final Canvas 2D Render &amp; Export</span>
          <h1 className="heading-h1" style={{ marginBottom: 12 }}>
            Cetak dan unduh hasil photobooth-mu.
          </h1>
          <p className="text-muted">
            Hasil dirender langsung menggunakan Canvas 2D resolusi tinggi sesuai template{' '}
            <strong>{layout}</strong>, filter <strong>{selectedFilter}</strong>, dan stiker
            aktif.
          </p>
        </div>

        <div className="demo-state-strip">
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#52525B' }}>
            Simulasi Status Export:
          </span>
          {(
            [
              { id: 'idle', label: 'Siap' },
              { id: 'rendering', label: 'Rendering' },
              { id: 'success', label: 'Berhasil' },
              { id: 'error', label: 'Gagal (Retry)' },
            ] as Array<{ id: ExportStatus; label: string }>
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              className={`btn btn-lift ${status === st.id ? 'active-pill' : ''}`}
              style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
              onClick={() => setStatus(st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="grid-2" style={{ alignItems: 'center' }}>
          {/* Pratinjau Hasil Canvas 2D Nyata + Kamera */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {previewDataUrl ? (
              <div
                style={{
                  background: '#FFFFFF',
                  padding: 16,
                  borderRadius: 20,
                  border: '1.5px solid #18181B',
                  boxShadow: '6px 6px 0px #18181B',
                  maxWidth: 340,
                }}
              >
                <img
                  src={previewDataUrl}
                  alt="Pratinjau Hasil Render Canvas 2D"
                  style={{ width: '100%', height: 'auto', borderRadius: 10, display: 'block' }}
                />
              </div>
            ) : (
              <InstantCameraRig
                mode={mode}
                isNight={isNight}
                badgeText={`FINAL ${layout.toUpperCase()}`}
                caption={caption}
                frames={visibleFrames.map((fr) => ({
                  id: fr.id,
                  label: fr.label,
                  hostPose: fr.hostPose,
                  guestPose: fr.guestPose,
                  bg: stripTint === '#FFFFFF' ? fr.accentBg : stripTint,
                  imageDataUrl: fr.imageDataUrl,
                }))}
                onTriggerShutter={handleRealDownload}
              />
            )}

            {activeStickers.length > 0 && (
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#52525B' }}>
                Stiker terpasang: {activeStickers.map((s) => s.emoji).join(' ')}
              </div>
            )}
          </div>

          {/* Panel Unduh Bersih */}
          <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                Pilih Format Unduhan Nyata
              </h2>
              <p className="text-muted" style={{ fontSize: '0.92rem' }}>
                Klik tombol di bawah untuk mengunduh file gambar asli langsung dari browser ke
                perangkatmu.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className={`btn btn-lift ${format === 'png' ? 'active-pill' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setFormat('png')}
              >
                Format PNG (Tajam)
              </button>
              <button
                type="button"
                className={`btn btn-lift ${format === 'jpg' ? 'active-pill' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setFormat('jpg')}
              >
                Format JPG (Ringan)
              </button>
            </div>

            {status === 'rendering' && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: '#EBF4FD',
                  border: '1.5px solid #18181B',
                  fontWeight: 700,
                }}
              >
                ⏳ Merender Canvas 2D ke .{format.toUpperCase()}...
              </div>
            )}

            {status === 'success' && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: '#ECF3ED',
                  border: '1.5px solid #18181B',
                  fontWeight: 700,
                }}
              >
                ✅ File <code>momentos-{mode}-{layout}.{format}</code> berhasil diunduh!
              </div>
            )}

            {status === 'error' && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: '#FCEEF3',
                  border: '1.5px solid #18181B',
                  fontWeight: 700,
                }}
              >
                ⚠️ Gagal merender ekspor. Klik tombol di bawah untuk mengulangi tanpa kehilangan
                hasil editmu.
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ minHeight: 54, fontSize: '1rem' }}
              disabled={status === 'rendering'}
              onClick={handleRealDownload}
            >
              {status === 'error'
                ? `🔄 Coba Unduh Ulang (.${format.toUpperCase()})`
                : `⬇️ Unduh Strip (.${format.toUpperCase()})`}
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-lift"
                style={{ flex: 1 }}
                onClick={() => onNavigate('editor')}
              >
                ← Kembali ke Editor
              </button>
              <button
                type="button"
                className="btn btn-secondary-pop"
                style={{ flex: 1 }}
                onClick={() => onNavigate('home')}
              >
                Sesi Baru
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Info Privasi & Cetak */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Privasi &amp; Penyimpanan</span>
          <h2 className="heading-h1">Hasilmu milikmu sepenuhnya.</h2>
        </div>

        <div className="grid-2">
          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#ECF3ED' }}>
              🔐
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Tanpa Public Share Link
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Kami tidak membuat tautan publik permanen atau galeri online. Pastikan kamu sudah
              mengunduh foto sebelum menutup tab browser.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#FAF7F2' }}>
              🖨️
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Siap Cetak Fisik
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Format PNG menjaga detail warna tetap tajam bila kamu ingin mencetak strip foto
              di printer rumah atau cetak foto instan.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
