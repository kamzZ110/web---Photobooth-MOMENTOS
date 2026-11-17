import React, { useState } from 'react';
import type { BoothMode, CapturedFrame, ScreenId } from '@momentos/shared';
import { InstantCameraRig } from '../../components/InstantCameraRig';
import {
  realtimeClient,
  type RealtimeClientState,
} from '../../lib/realtimeClient';

interface ReviewScreenProps {
  mode: BoothMode;
  isNight?: boolean;
  takeCount: number;
  frames: CapturedFrame[];
  retakesRemaining: number;
  onRetakeFrame: (frameId: number) => void;
  realtimeState?: RealtimeClientState;
  onNavigate: (screen: ScreenId) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  mode,
  isNight = false,
  takeCount,
  frames,
  retakesRemaining,
  onRetakeFrame,
  realtimeState,
  onNavigate,
}) => {
  const [guestRetakeRequestFrame, setGuestRetakeRequestFrame] = useState<number | null>(
    mode === 'duo' ? 2 : null
  );

  const visibleFrames = frames.slice(0, takeCount);
  const livePrompt = realtimeState?.snapshot?.retakePrompt;
  const activeRole = realtimeState?.role ?? 'host';

  const effectivePromptFrame =
    livePrompt && livePrompt.status === 'pending'
      ? livePrompt.frameId
      : guestRetakeRequestFrame;

  return (
    <div className="page-stack">
      <section>
        {/* Centered Clean Intro */}
        <div className="page-intro">
          <span className="eyebrow-text">Review &amp; Retake (Tahap 5)</span>
          <h1 className="heading-h1" style={{ marginBottom: 12 }}>
            Periksa setiap pose sebelum masuk ke Editor.
          </h1>
          <p className="text-muted">
            Kuota retake tersisa: <strong>{retakesRemaining} dari 3</strong>. Pada Mode Duo,
            foto Host (kiri) dan Guest (kanan) disatukan otomatis di setiap frame.
          </p>
        </div>

        {mode === 'duo' && effectivePromptFrame === null && (
          <div className="demo-state-strip">
            <button
              type="button"
              className="btn btn-lift"
              style={{ minHeight: 32, padding: '4px 12px', fontSize: '0.76rem' }}
              onClick={() => {
                setGuestRetakeRequestFrame(2);
                realtimeClient.requestRetake(2);
              }}
            >
              🙋 Simulasikan Guest Minta Retake Pose #2
            </button>
          </div>
        )}

        {/* Banner Persetujuan Host saat Guest Meminta Retake di Mode Duo */}
        {mode === 'duo' && effectivePromptFrame !== null && (
          <div
            className="clean-card surface-light"
            style={{
              background: '#EBF4FD',
              marginBottom: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <span className="eyebrow-text" style={{ marginBottom: 4 }}>
                Permintaan Retake Guest (Real-Time Sync)
              </span>
              <h3 className="heading-h2">
                Guest ingin mengulang Pose #{effectivePromptFrame}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary-pop"
                disabled={retakesRemaining <= 0}
                onClick={() => {
                  if (livePrompt) {
                    realtimeClient.decideRetake(livePrompt.requestId, true);
                  }
                  onRetakeFrame(effectivePromptFrame);
                  setGuestRetakeRequestFrame(null);
                }}
              >
                Setujui &amp; Foto Ulang
              </button>
              <button
                type="button"
                className="btn btn-lift"
                onClick={() => {
                  if (livePrompt) {
                    realtimeClient.decideRetake(livePrompt.requestId, false);
                  }
                  setGuestRetakeRequestFrame(null);
                }}
              >
                Tolak
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.45fr) minmax(290px, 0.85fr)',
            gap: 32,
            alignItems: 'start',
          }}
        >
          <div className="grid-2">
            {visibleFrames.map((frame) => (
              <div key={frame.id} className="clean-card interactive" style={{ padding: 22 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <strong>{frame.label}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#52525B', fontWeight: 600 }}>
                    {frame.retakeCount > 0 ? `Diulang ${frame.retakeCount}×` : 'Asli'}
                  </span>
                </div>

                <div
                  className="surface-light"
                  style={{
                    position: 'relative',
                    height: 170,
                    borderRadius: 14,
                    border: '1.5px solid #18181B',
                    background: frame.accentBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.6rem',
                    marginBottom: 16,
                    overflow: 'hidden',
                  }}
                >
                  {mode === 'duo' && frame.imageDataUrl && frame.guestImageDataUrl ? (
                    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                      <div style={{ position: 'relative', width: '50%', height: '100%' }}>
                        <img
                          src={frame.imageDataUrl}
                          alt={`${frame.label} Host`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            left: 6,
                            background: 'rgba(24,24,27,0.75)',
                            color: '#FFFFFF',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 999,
                          }}
                        >
                          HOST
                        </span>
                      </div>
                      <div
                        style={{
                          position: 'relative',
                          width: '50%',
                          height: '100%',
                          borderLeft: '2px solid rgba(255,255,255,0.8)',
                        }}
                      >
                        <img
                          src={frame.guestImageDataUrl}
                          alt={`${frame.label} Guest`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            right: 6,
                            background: 'rgba(24,24,27,0.75)',
                            color: '#FFFFFF',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 999,
                          }}
                        >
                          GUEST
                        </span>
                      </div>
                    </div>
                  ) : frame.imageDataUrl ? (
                    <img
                      src={frame.imageDataUrl}
                      alt={frame.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : mode === 'duo' ? (
                    `${frame.hostPose} ⚡ ${frame.guestPose}`
                  ) : (
                    frame.hostPose
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-lift"
                  style={{ width: '100%' }}
                  disabled={retakesRemaining <= 0}
                  onClick={() => {
                    if (mode === 'duo' && activeRole === 'guest') {
                      realtimeClient.requestRetake(frame.id);
                      setGuestRetakeRequestFrame(frame.id);
                    } else {
                      realtimeClient.requestRetake(frame.id);
                      onRetakeFrame(frame.id);
                    }
                  }}
                >
                  {retakesRemaining <= 0
                    ? 'Kuota Retake Habis'
                    : mode === 'duo' && activeRole === 'guest'
                    ? `Ajukan Retake ${frame.label} ke Host`
                    : `Foto Ulang ${frame.label}`}
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <InstantCameraRig
              mode={mode}
              isNight={isNight}
              badgeText="REVIEW STRIP"
              caption="SIAP MASUK EDITOR"
              frames={visibleFrames.map((fr) => ({
                id: fr.id,
                label: fr.label,
                hostPose: fr.hostPose,
                guestPose: fr.guestPose,
                bg: fr.accentBg,
                imageDataUrl: fr.imageDataUrl,
              }))}
            />

            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ width: '100%' }}
              onClick={() => onNavigate('editor')}
            >
              Lanjut ke Template &amp; Editor →
            </button>
            <button
              type="button"
              className="btn btn-lift"
              style={{ width: '100%' }}
              onClick={() => onNavigate('camera')}
            >
              ← Kembali ke Kamera
            </button>
          </div>
        </div>
      </section>

      {/* Aturan Retake */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Aturan Retake</span>
          <h2 className="heading-h1">Foto ulang tanpa mengorbankan pose yang sudah bagus.</h2>
        </div>

        <div className="grid-2">
          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#FCEEF3' }}>
              3×
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Maksimal 3 Kali per Sesi
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Kamu bebas memilih frame mana saja yang ingin diulang hingga total 3 kali
              retake, tanpa perlu mengulang seluruh sesi dari awal.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              🤝
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Persetujuan Host pada Mode Duo
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Guest dapat mengajukan permintaan retake untuk frame tertentu, lalu Host
              menyetujuinya agar kedua kamera siap menghitung mundur bersama.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
