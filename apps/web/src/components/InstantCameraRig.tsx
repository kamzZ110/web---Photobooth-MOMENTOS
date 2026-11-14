import React, { useEffect, useRef, useState } from 'react';
import type { BoothMode } from '@momentos/shared';
import camNightFlashUrl from '@assets/cam1.png';
import camDayWhiteUrl from '@assets/cam2.png';
import camClassicLandUrl from '@assets/cam3.png';
import duoStripPhotoUrl from '@assets/Gemini_Generated_Image_1w8io41w8io41w8i.jpg';

export type CameraVariant = 'white' | 'retro' | 'classic';

interface InstantCameraRigProps {
  mode: BoothMode;
  caption?: string;
  badgeText?: string;
  cameraVariant?: CameraVariant;
  isNight?: boolean;
  useSamplePhotoStrip?: boolean;
  showConnectionWings?: boolean;
  frames?: Array<{
    id: number;
    label: string;
    hostPose: string;
    guestPose?: string;
    bg: string;
  }>;
  onTriggerShutter?: () => void;
}

/**
 * Unit Kamera Instan HD menggunakan aset cam1 / cam2 / cam3 dari folder /assets.
 * - Mode Siang: cam2.png (Polaroid Putih Now+)
 * - Mode Malam (Night Mode): cam1.png (Polaroid 1000 Land Camera dengan Q-Light Flash)
 * - Classic Land: cam3.png (Polaroid 1000 Land Camera klasik)
 * - Animasi ala LensBooth: remote connection wings, shutter recoil, flash burst lokal,
 *   strip keluar bertahap dari celah hitam kamera (roller feed + instant-film develop).
 */
export const InstantCameraRig: React.FC<InstantCameraRigProps> = ({
  mode,
  caption = 'Nov 14, 2026 12:02pm',
  cameraVariant,
  isNight = false,
  useSamplePhotoStrip = true,
  showConnectionWings = false,
  frames,
  onTriggerShutter,
}) => {
  const [printCycle, setPrintCycle] = useState(1);
  const [flashOn, setFlashOn] = useState(false);
  const [shutterAnimating, setShutterAnimating] = useState(false);
  const prevNightRef = useRef(isNight);

  useEffect(() => {
    if (prevNightRef.current !== isNight) {
      prevNightRef.current = isNight;
      setPrintCycle((c) => c + 1);
    }
  }, [isNight]);

  const effectiveVariant: CameraVariant =
    cameraVariant ?? (isNight ? 'retro' : 'white');

  const cameraSrc =
    effectiveVariant === 'retro'
      ? camNightFlashUrl
      : effectiveVariant === 'classic'
        ? camClassicLandUrl
        : camDayWhiteUrl;

  const handleCameraClick = () => {
    setFlashOn(true);
    setShutterAnimating(false);
    window.requestAnimationFrame(() => {
      setShutterAnimating(true);
    });
    setPrintCycle((c) => c + 1);
    window.setTimeout(() => setFlashOn(false), 340);
    window.setTimeout(() => setShutterAnimating(false), 380);
    onTriggerShutter?.();
  };

  return (
    <div className="instant-camera-stage">
      {flashOn && <div className="camera-flash-burst" aria-hidden="true" />}

      {/* Sayap Kiri: Koneksi Jarak Jauh ala LensBooth */}
      {showConnectionWings && (
        <div className="camera-wing camera-wing-left" aria-hidden="true">
          <div className="camera-wing-node">
            <span className="wing-pin" title="Lokasi Host">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z"
                  stroke="#C93B6B"
                  strokeWidth="2"
                />
                <circle cx="12" cy="10" r="2.3" fill="#C93B6B" />
              </svg>
            </span>
            <div className="wing-avatar wing-avatar-host">H</div>
            <div className="wing-label">
              <strong>Jakarta</strong>
              <span>Host · Terhubung</span>
            </div>
          </div>
          <svg
            className="camera-wing-svg"
            viewBox="0 0 110 28"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M4 14 Q 55 4 106 14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeDasharray="5 5"
            />
            <circle cx="104" cy="14" r="3" fill="#7A9E7E" />
          </svg>
        </div>
      )}

      {/* Kolom Kamera Tengah + Strip Eject */}
      <div className="instant-camera-rig">
        <div
          className={`camera-asset-container clickable variant-${effectiveVariant} ${
            shutterAnimating ? 'shutter-recoil' : ''
          }`}
          onClick={handleCameraClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCameraClick();
            }
          }}
          title="Klik kamera untuk simulasi flash & cetak strip foto"
          aria-label="Kamera Polaroid Momentos — Klik untuk cetak strip"
        >
          {flashOn && (
            <span
              className={`camera-unit-flash variant-${effectiveVariant}`}
              aria-hidden="true"
            />
          )}
          <img
            src={cameraSrc}
            alt={
              effectiveVariant === 'retro'
                ? 'Momentos Retro Flash Camera (Night Mode)'
                : effectiveVariant === 'classic'
                  ? 'Momentos Classic Land Camera'
                  : 'Momentos Instant Camera (Day Mode)'
            }
            className="camera-asset-img"
          />
        </div>

        {/* Strip Foto Keluar Bertahap dari Celah Hitam Kamera & Mengembang Warna */}
        <div className={`ejecting-strip-wrapper slot-${effectiveVariant}`}>
          <div className="ejecting-strip-viewport">
            <div key={printCycle} className="ejecting-strip-card printing">
              {useSamplePhotoStrip && !frames ? (
                <div
                  className="ejecting-photo-frame"
                  style={{
                    width: 168,
                    borderRadius: '0 0 12px 12px',
                    overflow: 'hidden',
                    boxShadow: isNight
                      ? '0 20px 38px -10px rgba(0, 0, 0, 0.65)'
                      : '0 16px 32px -10px rgba(24, 24, 27, 0.24)',
                    border: '1px solid rgba(24, 24, 27, 0.14)',
                    background: '#FFFFFF',
                  }}
                >
                  <img
                    src={duoStripPhotoUrl}
                    alt="Contoh Hasil Strip Photobooth Momentos"
                    className="ejecting-strip-photo"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              ) : (
                <div className="ejecting-strip-static" style={{ color: '#18181B' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(
                      frames ?? [
                        {
                          id: 1,
                          label: 'POSE 01',
                          hostPose: '😊✌️',
                          guestPose: '😄✨',
                          bg: '#FCEEF3',
                        },
                        {
                          id: 2,
                          label: 'POSE 02',
                          hostPose: '😎🔥',
                          guestPose: '🥳🫶',
                          bg: '#EBF4FD',
                        },
                        {
                          id: 3,
                          label: 'POSE 03',
                          hostPose: '🤩📸',
                          guestPose: '😆✌️',
                          bg: '#ECF3ED',
                        },
                      ]
                    ).map((frame) => (
                      <div
                        key={frame.id}
                        style={{
                          background: frame.bg,
                          border: '1px solid rgba(24,24,27,0.2)',
                          borderRadius: 8,
                          padding: '10px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: '0.68rem', fontWeight: 400 }}>
                          {frame.label}
                        </span>
                        <span style={{ fontSize: '1.15rem' }}>
                          {mode === 'duo'
                            ? `${frame.hostPose} | ${frame.guestPose ?? '😄✨'}`
                            : frame.hostPose}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 6,
                      borderTop: '1px dashed rgba(24,24,27,0.18)',
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 350,
                      color: '#52525B',
                    }}
                  >
                    {caption}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <span className="camera-click-hint">
          Klik kamera untuk foto &amp; cetak ulang strip
        </span>
      </div>

      {/* Sayap Kanan: Koneksi Jarak Jauh ala LensBooth */}
      {showConnectionWings && (
        <div className="camera-wing camera-wing-right" aria-hidden="true">
          <svg
            className="camera-wing-svg"
            viewBox="0 0 110 28"
            fill="none"
            preserveAspectRatio="none"
          >
            <circle cx="6" cy="14" r="3" fill="#7AB3EF" />
            <path
              d="M4 14 Q 55 24 106 14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeDasharray="5 5"
            />
          </svg>
          <div className="camera-wing-node">
            <span className="wing-pin" title="Lokasi Guest">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z"
                  stroke="#C93B6B"
                  strokeWidth="2"
                />
                <circle cx="12" cy="10" r="2.3" fill="#C93B6B" />
              </svg>
            </span>
            <div className="wing-avatar wing-avatar-guest">G</div>
            <div className="wing-label">
              <strong>Bandung</strong>
              <span>Guest · Sinkron</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Ikon Kamera Mini menggunakan aset kamera HD asli.
 */
export const MiniCameraStripIcon: React.FC<{
  accentColor?: string;
  size?: number;
  variant?: CameraVariant;
}> = ({ size = 40, variant = 'white' }) => {
  const src =
    variant === 'retro'
      ? camNightFlashUrl
      : variant === 'classic'
        ? camClassicLandUrl
        : camDayWhiteUrl;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'inline-block',
      }}
    />
  );
};
