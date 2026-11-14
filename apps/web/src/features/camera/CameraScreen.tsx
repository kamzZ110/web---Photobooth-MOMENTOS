import React, { useState } from 'react';
import type {
  BoothMode,
  CameraPermissionState,
  CapturedFrame,
  PhotoFilterId,
  ScreenId,
} from '@momentos/shared';
import { InstantCameraRig } from '../../components/InstantCameraRig';

interface CameraScreenProps {
  mode: BoothMode;
  isNight?: boolean;
  takeCount: 3 | 4;
  onChangeTakeCount: (count: 3 | 4) => void;
  selectedFilter: PhotoFilterId;
  onChangeFilter: (filter: PhotoFilterId) => void;
  frames: CapturedFrame[];
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
  onNavigate,
}) => {
  const [permissionState, setPermissionState] =
    useState<CameraPermissionState>('granted');
  const [hostReady, setHostReady] = useState(true);
  const [guestReady, setGuestReady] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentShot, setCurrentShot] = useState(2);

  const triggerCountdownSimulation = () => {
    setCountdown(3);
    window.setTimeout(() => setCountdown(2), 550);
    window.setTimeout(() => setCountdown(1), 1100);
    window.setTimeout(() => {
      setCountdown(null);
      setCurrentShot((prev) => (prev < takeCount ? prev + 1 : takeCount));
    }, 1650);
  };

  return (
    <div className="page-stack">
      <section>
        {/* Centered Clean Intro */}
        <div className="page-intro">
          <span className="eyebrow-text">Studio Kamera &amp; Ready Check</span>
          <h1 className="heading-h1" style={{ marginBottom: 12 }}>
            {mode === 'duo'
              ? 'Kamera Duo Sinkron (Host + Guest)'
              : 'Kamera Solo Siap Bidik'}
          </h1>
          <p className="text-muted">
            Pilih 3 atau 4 pose, sesuaikan filter warna, dan tekan tombol ambil foto
            saat siap.
          </p>
        </div>

        {/* Subtle State Controls */}
        <div className="demo-state-strip">
          <button
            type="button"
            className={`btn btn-lift ${
              permissionState === 'granted' ? 'active-pill' : ''
            }`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => setPermissionState('granted')}
          >
            Kamera Aktif
          </button>
          <button
            type="button"
            className={`btn btn-lift ${
              permissionState === 'denied' ? 'active-pill' : ''
            }`}
            style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => setPermissionState('denied')}
          >
            Simulasi Izin Ditolak (SUP-01)
          </button>
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
              Momentos memerlukan izin kamera browser hanya selama sesi berlangsung.
              Klik ikon kunci/kamera pada address bar lalu pilih{' '}
              <strong>Izinkan</strong>.
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
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  ● Live Viewfinder · Take {currentShot} dari {takeCount}
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
                  minHeight: 340,
                  padding: 16,
                  borderRadius: 18,
                  border: '1.5px solid #18181B',
                  background:
                    selectedFilter === 'mono-ink'
                      ? '#E4E4E7'
                      : selectedFilter === 'warm-cream'
                      ? '#FAF7F2'
                      : selectedFilter === 'soft-berry'
                      ? '#FCEEF3'
                      : '#FFFFFF',
                }}
              >
                {countdown !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 10,
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
                    <div style={{ fontWeight: 700 }}>Tahan Pose!</div>
                  </div>
                )}

                <div
                  style={{
                    borderRadius: 14,
                    border: '1.5px solid #18181B',
                    background: '#FCEEF3',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                  }}
                >
                  <div style={{ fontSize: '4.4rem', marginBottom: 10 }}>😊✌️</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#52525B' }}>
                    {mode === 'duo' ? 'Host (Kamera Lokal)' : 'Kamera Utama'} ·{' '}
                    {selectedFilter}
                  </div>
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
                    }}
                  >
                    <div style={{ fontSize: '4.4rem', marginBottom: 10 }}>😄🫶</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#52525B' }}>
                      Guest (Remote Sinkron)
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Glass Control Dock */}
              <div
                className="glass-bar"
                style={{
                  marginTop: 18,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(
                    [
                      { id: 'normal', label: 'Normal' },
                      { id: 'warm-cream', label: 'Warm' },
                      { id: 'soft-berry', label: 'Berry' },
                      { id: 'mono-ink', label: 'Mono' },
                    ] as Array<{ id: PhotoFilterId; label: string }>
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`btn btn-lift ${
                        selectedFilter === f.id ? 'active-pill' : ''
                      }`}
                      style={{ minHeight: 36, padding: '4px 12px', fontSize: '0.78rem' }}
                      onClick={() => onChangeFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary-pop"
                    disabled={mode === 'duo' && (!hostReady || !guestReady)}
                    onClick={triggerCountdownSimulation}
                  >
                    📸 Ambil Foto ({currentShot}/{takeCount})
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary-pop"
                    onClick={() => onNavigate('review')}
                  >
                    Review →
                  </button>
                </div>
              </div>
            </div>

            {/* Kamera Cetak Strip Terbuka */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <InstantCameraRig
                mode={mode}
                isNight={isNight}
                badgeText={`TAKE ${currentShot}/${takeCount}`}
                caption={`FILTER: ${selectedFilter.toUpperCase()}`}
                frames={frames.slice(0, takeCount).map((fr) => ({
                  id: fr.id,
                  label: fr.label,
                  hostPose: fr.hostPose,
                  guestPose: fr.guestPose,
                  bg: fr.accentBg,
                }))}
                onTriggerShutter={triggerCountdownSimulation}
              />
            </div>
          </div>
        )}
      </section>

      {/* Tips Pengambilan Foto (Menjaga halaman kamera lega & informatif) */}
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
              Hadapkan wajah ke arah lampu atau jendela agar kamera menangkap warna
              kulit dan ekspresi secara jelas tanpa noise.
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
              Saat Mode Duo, hasil foto diambil dari frame lokal masing-masing perangkat,
              bukan dari tangkapan layar video call yang terkompresi.
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
              Jangan khawatir kalau satu pose kurang pas. Kamu masih punya hingga 3×
              kesempatan foto ulang di layar Review.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
