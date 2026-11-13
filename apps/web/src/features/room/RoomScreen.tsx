import React, { useState } from 'react';
import type {
  BoothMode,
  RoomConnectionState,
  ScreenId,
} from '@momentos/shared';
import { MiniCameraStripIcon } from '../../components/InstantCameraRig';

interface RoomScreenProps {
  mode: BoothMode;
  onChangeMode: (mode: BoothMode) => void;
  roomState: RoomConnectionState;
  onChangeRoomState: (state: RoomConnectionState) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const RoomScreen: React.FC<RoomScreenProps> = ({
  mode,
  onChangeMode,
  roomState,
  onChangeRoomState,
  onNavigate,
}) => {
  const [inviteCode] = useState('MMT-4829');
  const [guestInputCode, setGuestInputCode] = useState('MMT-4829');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="page-stack">
      {/* 1. Centered Clean Intro */}
      <section>
        <div className="page-intro">
          <span className="eyebrow-text">Pilih Mode &amp; Ruang Tunggu</span>
          <h1 className="heading-h1" style={{ marginBottom: 12 }}>
            Masuk sendiri atau undang 1 teman ke Room Duo.
          </h1>
          <p className="text-muted">
            Pilih Mode Solo untuk langsung ke kamera, atau buat Room privat agar kamu
            dan temanmu bisa sinkron sebelum sesi dimulai.
          </p>
        </div>

        {/* Simulasi State Ringkas */}
        <div className="demo-state-strip">
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#52525B' }}>
            Simulasi Status Room:
          </span>
          {(
            [
              { id: 'waiting', label: 'Waiting' },
              { id: 'connected', label: 'Connected (2/2)' },
              { id: 'reconnecting', label: 'Reconnecting 5m' },
              { id: 'error', label: 'Join Error' },
            ] as Array<{ id: RoomConnectionState; label: string }>
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              className={`btn btn-lift ${roomState === st.id ? 'active-pill' : ''}`}
              style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
              onClick={() => {
                onChangeMode('duo');
                onChangeRoomState(st.id);
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Pilihan Mode Solo vs Duo */}
        <div className="grid-2">
          <div
            className="clean-card interactive"
            style={{ background: mode === 'solo' ? '#FCEEF3' : 'rgba(255,255,255,0.92)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <h2 className="heading-h2">Mode Solo</h2>
              <MiniCameraStripIcon accentColor="#C93B6B" size={36} />
            </div>
            <p className="text-muted" style={{ fontSize: '0.94rem', marginBottom: 22 }}>
              1 peserta tanpa kode undangan. Langsung atur kamera, pilih 3 atau 4
              pose, lalu cetak strip secara instan.
            </p>
            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ width: '100%' }}
              onClick={() => {
                onChangeMode('solo');
                onNavigate('camera');
              }}
            >
              Masuk Kamera Solo →
            </button>
          </div>

          <div
            className="clean-card interactive"
            style={{ background: mode === 'duo' ? '#EBF4FD' : 'rgba(255,255,255,0.92)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <h2 className="heading-h2">Mode Duo (Host + Guest)</h2>
              <MiniCameraStripIcon accentColor="#7AB3EF" size={36} />
            </div>
            <p className="text-muted" style={{ fontSize: '0.94rem', marginBottom: 22 }}>
              Maksimal 2 peserta dalam satu room. Bagikan kode unik ke temanmu di
              bawah ini, lalu masuk ke kamera bersama.
            </p>
            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ width: '100%' }}
              onClick={() => onChangeMode('duo')}
            >
              Aktifkan Mode Duo
            </button>
          </div>
        </div>
      </section>

      {/* 2. Panel Invite Code & Status Koneksi */}
      <section className="grid-2">
        <div className="clean-card">
          <span className="eyebrow-text">Untuk Host &amp; Guest</span>
          <h3 className="heading-h2" style={{ marginBottom: 10 }}>
            Kode Undangan Room Privat
          </h3>
          <p className="text-muted" style={{ fontSize: '0.92rem', marginBottom: 20 }}>
            Salin kode ini untuk dibagikan ke 1 teman, atau masukkan kode milik Host
            bila kamu bergabung sebagai Guest.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: '#FAF7F2',
              border: '1.5px solid #18181B',
              borderRadius: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#52525B' }}>
                KODE ROOM
              </div>
              <div
                style={{
                  fontFamily: 'var(--primitive-font-heading)',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}
              >
                {inviteCode}
              </div>
            </div>

            <button type="button" className="btn btn-lift" onClick={handleCopyCode}>
              {copied ? '✓ Tersalin' : 'Salin Kode'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <input
              id="guest-code-input"
              type="text"
              aria-label="Masukkan kode room"
              value={guestInputCode}
              onChange={(e) => setGuestInputCode(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                height: 46,
                padding: '0 16px',
                borderRadius: 999,
                border: '1.5px solid #18181B',
                fontFamily: 'var(--primitive-font-heading)',
                fontSize: '0.96rem',
                fontWeight: 700,
              }}
            />
            <button
              type="button"
              className="btn btn-secondary-pop"
              onClick={() => onChangeRoomState('connected')}
            >
              Gabung
            </button>
          </div>
        </div>

        <div className="clean-card">
          <span className="eyebrow-text">Status Ruang Tunggu</span>
          <h3 className="heading-h2" style={{ marginBottom: 14 }}>
            {roomState === 'waiting' && 'Menunggu Guest Bergabung (1/2)'}
            {roomState === 'connected' && 'Kedua Peserta Terhubung (2/2)'}
            {roomState === 'reconnecting' && 'Menyambungkan Ulang Guest (04:42 / 05:00)'}
            {roomState === 'error' && 'Room Penuh atau Kode Tidak Valid'}
          </h3>

          <p className="text-muted" style={{ fontSize: '0.92rem', marginBottom: 22 }}>
            {roomState === 'waiting' &&
              'Host siap di ruang tunggu. Begitu Guest masuk, kalian bisa langsung melanjutkan ke persiapan kamera.'}
            {roomState === 'connected' &&
              'Koneksi sinkron aktif. Kedua perangkat siap masuk ke layar kamera bersama.'}
            {roomState === 'reconnecting' &&
              'Koneksi Guest sempat terputus. Room ditahan hingga 5 menit agar progres tidak hilang.'}
            {roomState === 'error' &&
              'Room hanya menerima maksimal 2 peserta aktif. Pastikan kode benar atau buat room baru.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 14,
                background: '#FAF7F2',
                border: '1.5px solid #18181B',
              }}
            >
              <span>👩‍💻 <strong>Host (Kamu)</strong></span>
              <span style={{ fontWeight: 700, color: '#7A9E7E' }}>● Ready</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 14,
                background: '#FAF7F2',
                border: '1.5px solid #18181B',
              }}
            >
              <span>
                🧑‍💻{' '}
                <strong>
                  {roomState === 'connected'
                    ? 'Guest (Nadia)'
                    : roomState === 'reconnecting'
                    ? 'Guest (Reconnecting...)'
                    : 'Slot Guest #2'}
                </strong>
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    roomState === 'connected'
                      ? '#7A9E7E'
                      : roomState === 'error'
                      ? '#C93B6B'
                      : '#52525B',
                }}
              >
                {roomState === 'connected'
                  ? '● Connected'
                  : roomState === 'reconnecting'
                  ? '↻ Reconnecting'
                  : roomState === 'error'
                  ? '✕ Gagal'
                  : '⏳ Menunggu'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary-pop"
            style={{ width: '100%' }}
            onClick={() => onNavigate('camera')}
          >
            Lanjut ke Studio Kamera →
          </button>
        </div>
      </section>

      {/* 3. Panduan Singkat Room & Reconnect (Menjaga halaman tetap lega & panjang) */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Aturan Room &amp; Privasi</span>
          <h2 className="heading-h1">Hal penting sebelum memulai sesi Duo.</h2>
        </div>

        <div className="grid-3">
          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#FCEEF3' }}>
              👥
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Batas 2 Peserta
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Setiap room dikunci hanya untuk 1 Host dan 1 Guest. Peserta ke-3 yang
              mencoba masuk otomatis ditolak.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              ⏱️
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Pemulihan 5 Menit
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Jika jaringan salah satu peserta terputus atau tab tertutup tidak sengaja,
              token rejoin aktif selama 5 menit.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#ECF3ED' }}>
              🧹
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Sesi Sementara
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Room bersifat sementara dan otomatis berakhir setelah kalian selesai
              mengunduh hasil foto.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
