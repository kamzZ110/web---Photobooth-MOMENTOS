import React, { useState } from 'react';
import type { BoothMode } from '@momentos/shared';

interface InstantCameraRigProps {
  mode: BoothMode;
  caption?: string;
  badgeText?: string;
  frames?: Array<{
    id: number;
    label: string;
    hostPose: string;
    guestPose?: string;
    bg: string;
  }>;
  onTriggerShutter?: () => void;
  shutterLabel?: string;
}

/**
 * Unit Kamera Instan Interaktif + Strip Foto yang keluar dari celah printer bawah.
 * Dipakai pada Hero Beranda, Layar Kamera, dan Layar Final Export.
 */
export const InstantCameraRig: React.FC<InstantCameraRigProps> = ({
  mode,
  caption = 'MOMENTOS • NOV 2026',
  badgeText = 'INSTANT BOOTH CAM',
  frames,
  onTriggerShutter,
  shutterLabel = 'Klik tombol merah kamera untuk simulasi cetak strip',
}) => {
  const [ejectBurst, setEjectBurst] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const defaultFrames =
    frames ??
    [
      {
        id: 1,
        label: 'TAKE 01',
        hostPose: '😊✌️',
        guestPose: '😄✨',
        bg: '#FCEEF3',
      },
      {
        id: 2,
        label: 'TAKE 02',
        hostPose: '😎🔥',
        guestPose: '🥳🫶',
        bg: '#EBF4FD',
      },
      {
        id: 3,
        label: 'TAKE 03',
        hostPose: '🤩📸',
        guestPose: '😆✌️',
        bg: '#ECF3ED',
      },
    ];

  const handleShutterClick = () => {
    setFlashActive(true);
    setEjectBurst(false);
    window.setTimeout(() => setEjectBurst(true), 25);
    window.setTimeout(() => setFlashActive(false), 260);
    window.setTimeout(() => setEjectBurst(false), 740);
    onTriggerShutter?.();
  };

  return (
    <div className="instant-camera-rig">
      {/* Bodi Kamera Instan di Bagian Atas */}
      <div className="camera-body">
        {flashActive && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.85)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          />
        )}

        <div className="camera-top-bar">
          {/* Unit Flash */}
          <div className="camera-flash" title="Xenon Flash Unit" />

          {/* Status LED Ready */}
          <div className="camera-led-group">
            <span className="camera-led" />
            <span>{badgeText}</span>
          </div>

          {/* Tombol Shutter Fisik */}
          <button
            type="button"
            className="camera-shutter-btn"
            onClick={handleShutterClick}
            title={shutterLabel}
            aria-label="Tombol Shutter Kamera"
          >
            ●
          </button>
        </div>

        {/* Garis Pita 3 Warna Palet (Berry, Sky, Sage) */}
        <div className="camera-stripe-band" />

        {/* Lensa Optik Tengah + Viewfinder Kecil */}
        <div className="camera-lens-stage">
          {/* Viewfinder Sudut */}
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 10,
              width: 34,
              height: 26,
              borderRadius: 7,
              border: '2px solid #18181B',
              background: '#EBF4FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 800,
            }}
          >
            {mode === 'duo' ? '2P' : '1P'}
          </div>

          <div className="camera-lens-outer">
            <div className="camera-lens-inner">
              <div className="camera-lens-glint" />
              <div style={{ textAlign: 'center', zIndex: 2 }}>
                <div style={{ fontSize: '1.35rem' }}>
                  {mode === 'duo' ? '👩‍💻⚡🧑‍💻' : '🤳✨'}
                </div>
                <div
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    marginTop: 2,
                    color: '#EBF4FD',
                  }}
                >
                  {mode === 'duo' ? 'DUO SYNC' : 'SOLO LIVE'}
                </div>
              </div>
            </div>
          </div>

          {/* Badge Klik Shutter */}
          <button
            type="button"
            onClick={handleShutterClick}
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '4px 8px',
              borderRadius: 999,
              border: '1.5px solid #18181B',
              background: '#FCEEF3',
              color: '#18181B',
              cursor: 'pointer',
            }}
          >
            ⚡ Cetak Strip
          </button>
        </div>

        {/* Celah Slot Printer Kamera di Bawah */}
        <div className="camera-printer-slot" />
      </div>

      {/* Kertas Strip Foto yang Keluar dari Celah Bawah Kamera */}
      <div className="ejecting-strip-wrapper">
        <div className={`ejecting-strip ${ejectBurst ? 'eject-burst' : ''}`}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.64rem',
              fontWeight: 800,
              marginBottom: 8,
              color: '#52525B',
            }}
          >
            <span>{mode === 'duo' ? 'DUO STRIP 1×3' : 'SOLO STRIP 1×3'}</span>
            <span style={{ color: '#C93B6B' }}>● LIVE PRINT</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {defaultFrames.map((frame) => (
              <div
                key={frame.id}
                style={{
                  background: frame.bg,
                  border: '1.5px solid #18181B',
                  borderRadius: 8,
                  padding: '10px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: '#FFFFFF',
                    border: '1px solid #18181B',
                  }}
                >
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
              borderTop: '1.5px dashed rgba(24,24,27,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.66rem',
              fontWeight: 800,
              fontFamily: 'var(--primitive-font-heading)',
            }}
          >
            <span>{caption}</span>
            <span style={{ color: '#7A9E7E' }}>✓ TAJAM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Ikon Kamera Mini + Strip Keluar untuk Header Brand, Cara Kerja, dan Kartu Mode.
 */
export const MiniCameraStripIcon: React.FC<{
  accentColor?: string;
  size?: number;
}> = ({ accentColor = '#C93B6B', size = 38 }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: size,
      }}
      aria-hidden="true"
    >
      {/* Mini Camera Body */}
      <div
        style={{
          width: size,
          height: Math.round(size * 0.72),
          background: '#FFFFFF',
          border: '2px solid #18181B',
          borderRadius: 8,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            right: 4,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: accentColor,
          }}
        />
        <div
          style={{
            width: Math.round(size * 0.36),
            height: Math.round(size * 0.36),
            borderRadius: '50%',
            border: '2px solid #18181B',
            background: accentColor,
          }}
        />
      </div>
      {/* Mini Ejecting Strip */}
      <div
        style={{
          width: Math.round(size * 0.62),
          height: Math.round(size * 0.38),
          marginTop: -2,
          background: '#FAF7F2',
          border: '1.5px solid #18181B',
          borderRadius: '0 0 5px 5px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          padding: '2px 3px',
        }}
      >
        <div style={{ height: 3, background: accentColor, borderRadius: 2 }} />
        <div style={{ height: 3, background: '#7AB3EF', borderRadius: 2 }} />
      </div>
    </div>
  );
};
