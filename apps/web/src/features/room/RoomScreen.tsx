import React, { useEffect, useState } from 'react';
import {
  FLIPBOOK_CAPTURE_FRAME_COUNT,
  type BoothMode,
  type RoomConnectionState,
  type ScreenId,
} from '@momentos/shared';
import { MiniCameraStripIcon } from '../../components/InstantCameraRig';
import {
  realtimeClient,
  type RealtimeClientState,
} from '../../lib/realtimeClient';

interface RoomScreenProps {
  mode: BoothMode;
  onChangeMode: (mode: BoothMode) => void;
  roomState: RoomConnectionState;
  onChangeRoomState: (state: RoomConnectionState) => void;
  realtimeState: RealtimeClientState;
  onNavigate: (screen: ScreenId) => void;
}

const STUDIO_STEPS: Array<{ id: ScreenId; num: string; label: string }> = [
  { id: 'room', num: '01', label: 'Pilih Mode' },
  { id: 'frame-select', num: '02', label: 'Pilih Frame' },
  { id: 'camera', num: '03', label: 'Kamera' },
  { id: 'editor', num: '04', label: 'Hasil & Edit' },
];

export const RoomScreen: React.FC<RoomScreenProps> = ({
  mode,
  onChangeMode,
  realtimeState,
  onNavigate,
}) => {
  const [guestInputCode, setGuestInputCode] = useState('');

  const [pending, setPending] = useState<'host' | 'guest' | null>(null);
  useEffect(() => {
    if (!pending) return;
    if (realtimeState.lastError) setPending(null);
    else if (realtimeState.role === pending && realtimeState.snapshot) onNavigate(pending === 'host' ? 'frame-select' : 'camera');
  }, [pending, realtimeState.role, realtimeState.snapshot, realtimeState.lastError]);
  const liveSnapshot = realtimeState.snapshot;
  const savedSession = realtimeClient.getSavedSession();

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setGuestInputCode(text.trim().toUpperCase());
      }
    } catch {
      // Clipboard access optional
    }
  };

  const handleStartSolo = () => {
    onChangeMode('solo');
    onNavigate('frame-select');
  };

  const handleStartDuoAsHost = () => {
    onChangeMode('duo');
    setPending('host');
    realtimeClient.createRoom({ displayName: 'Host', mode: 'duo' });
  };

  const handleJoinGuest = () => {
    const code = guestInputCode.trim().toUpperCase();
    if (!code) return;
    onChangeMode('duo');
    setPending('guest');
    realtimeClient.joinRoom(code, 'Guest');
  };

  return (
    <div className="page-stack" style={{ maxWidth: 1020, margin: '0 auto' }}>
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
          {STUDIO_STEPS.map((st, idx) => (
            <React.Fragment key={st.id}>
              <button
                type="button"
                className={`btn ${st.id === 'room' ? 'active-pill' : ''}`}
                style={{
                  minHeight: 32,
                  padding: '4px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                }}
                onClick={() => onNavigate(st.id)}
              >
                {st.num}. {st.label}
              </button>
              {idx < STUDIO_STEPS.length - 1 && (
                <span style={{ alignSelf: 'center', opacity: 0.35, fontWeight: 700 }}>
                  —
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="page-intro" style={{ marginBottom: 28 }}>
          <span className="eyebrow-text">Langkah 01 · Pilih Booth</span>
          <h1 className="heading-h1" style={{ marginBottom: 10 }}>
            Pilih mode photobooth online-mu.
          </h1>
          <p className="text-muted">
            Langsung foto tanpa akun dan tanpa watermark. Pilih sendiri, berdua real-time,
            atau Flipbook interaktif.
          </p>
        </div>

        {/* Recovery Prompt if saved session exists */}
        {!liveSnapshot && savedSession && (
          <div
            className="clean-card surface-light"
            style={{
              background: '#FEF3C7',
              borderColor: '#D97706',
              marginBottom: 20,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: '0.88rem' }}>
              <strong>
                🔄 Sesi Room Terakhir Terdeteksi ({savedSession.code} ·{' '}
                {savedSession.role.toUpperCase()})
              </strong>
            </div>
            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ minHeight: 36, padding: '6px 14px', fontSize: '0.8rem' }}
              onClick={() => {
                onChangeMode('duo');
                realtimeClient.rejoinSavedSession();
                onNavigate('camera');
              }}
            >
              Pulihkan Sesi
            </button>
          </div>
        )}

        {realtimeState.lastError && (
          <div
            className="clean-card surface-light"
            style={{
              background: '#FCEEF3',
              borderColor: '#C93B6B',
              marginBottom: 20,
              padding: '12px 18px',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {realtimeState.lastError}
          </div>
        )}

        {/* 3 Clean Mode Cards (Night-mode contrast safe!) */}
        <div className="grid-3" style={{ marginBottom: 22 }}>
          {/* 1. Solo Booth */}
          <div
            className={`clean-card interactive ${
              mode === 'solo' ? 'card-tone-rose surface-light' : 'card-tone-neutral'
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
                  marginBottom: 14,
                }}
              >
                <span
                  className="pill-tag"
                  style={{
                    fontSize: '0.7rem',
                    background: '#FFFFFF',
                    color: '#18181B',
                  }}
                >
                  1 Peserta
                </span>
                <MiniCameraStripIcon accentColor="#C93B6B" size={34} />
              </div>
              <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                Solo Booth
              </h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Photobooth instan khusus untukmu sendiri. Pilih gaya frame, berpose, hias,
                lalu unduh seketika.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ width: '100%' }}
              onClick={handleStartSolo}
            >
              Mulai Solo
            </button>
          </div>

          {/* 2. Duo Booth (No name input, enters directly as Host) */}
          <div
            className={`clean-card interactive ${
              mode === 'duo' ? 'card-tone-sky surface-light' : 'card-tone-neutral'
            }`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 18,
              borderColor: mode === 'duo' ? '#2563EB' : undefined,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <span
                  className="pill-tag"
                  style={{
                    fontSize: '0.7rem',
                    background: '#BC4374',
                    color: '#FFFFFF',
                    borderColor: '#BC4374',
                  }}
                >
                  ★ Populer · Host + Guest
                </span>
                <MiniCameraStripIcon accentColor="#7AB3EF" size={34} />
              </div>
              <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                Duo Booth (Room Privat)
              </h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Foto real-time berdua jarak jauh dengan 1 teman. Langsung jadi Host dan
                bagikan kode atau link undangan dari kamera.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ width: '100%' }}
              disabled={Boolean(pending) || realtimeState.transport === 'connecting'} onClick={handleStartDuoAsHost}
            >
              Buat Room Duo (Host)
            </button>
          </div>

          {/* 3. Flipbook Studio */}
          <div
            className="clean-card interactive card-tone-cream surface-light"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 18,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <span
                  className="pill-tag"
                  style={{
                    fontSize: '0.7rem',
                    background: '#FFFFFF',
                    color: '#18181B',
                  }}
                >
                  🎞️ Gerak · {FLIPBOOK_CAPTURE_FRAME_COUNT} Frame
                </span>
                <MiniCameraStripIcon accentColor="#B6834D" size={34} />
              </div>
              <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                Flipbook Studio ✨
              </h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Rekam klip pendek dengan efek interaktif, pecah otomatis jadi buku flipbook,
                dan ekspor ke GIF/MP4.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-lift"
              style={{ width: '100%', background: '#FFFFFF', color: '#18181B' }}
              onClick={() => onNavigate('flipbook')}
            >
              Buka Flipbook
            </button>
          </div>
        </div>

        {/* Single Sleek "Punya Kode Room?" Join Bar (Adaptive card-tone-neutral for Night Mode!) */}
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
              Masuk dengan kode (Guest)
            </div>
            <div className="text-muted" style={{ fontSize: '0.82rem' }}>
              Masukkan kode dari temanmu untuk langsung bergabung ke kamera Duo sebagai Guest.
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
              id="guest-code-input"
              type="text"
              placeholder="Contoh: MMT-A24EF896B1"
              aria-label="Masukkan kode room"
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
              onClick={() => void handlePasteCode()}
            >
              📋 Tempel
            </button>
            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ minHeight: 42, padding: '8px 20px', fontSize: '0.86rem' }}
              disabled={!guestInputCode.trim() || Boolean(pending) || realtimeState.transport === 'connecting'}
              onClick={handleJoinGuest}
            >
              Gabung
            </button>
          </div>
        </div>

        {pending && <p role="status">{pending === 'host' ? 'Membuat room sebagai Host…' : 'Mencari room untuk Guest…'}</p>}
        {/* Subtle Realtime Transport Footer */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.76rem',
            opacity: 0.75,
            flexWrap: 'wrap',
          }}
        >
          <span>
            Sinyal Room:{' '}
            {realtimeState.transport === 'websocket'
              ? '🟢 Server Duo terhubung'
              : '🟡 Mode lokal di perangkat ini'}
          </span>
          {liveSnapshot && (
            <>
              <span>·</span>
              <span>
                Room Aktif: <strong>{liveSnapshot.code}</strong>
              </span>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
