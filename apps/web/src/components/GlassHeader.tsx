import React from 'react';
import type { BoothMode, ScreenId } from '@momentos/shared';
import { MiniCameraStripIcon } from './InstantCameraRig';

interface GlassHeaderProps {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  mode: BoothMode;
}

const BOOTH_FLOW_TABS: Array<{ id: Exclude<ScreenId, 'home'>; label: string }> = [
  { id: 'room', label: 'Mode & Room' },
  { id: 'camera', label: 'Kamera' },
  { id: 'review', label: 'Review' },
  { id: 'editor', label: 'Editor' },
  { id: 'export', label: 'Export' },
];

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  activeScreen,
  onSelectScreen,
  mode,
}) => {
  const isHome = activeScreen === 'home';

  return (
    <header className="top-header-full">
      <div className="top-header-inner">
        {/* Brand Mark (Klik untuk kembali ke Beranda / Landing Page) */}
        <div
          className="brand-group"
          onClick={() => onSelectScreen('home')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelectScreen('home');
          }}
        >
          <MiniCameraStripIcon
            accentColor={mode === 'duo' ? '#7AB3EF' : '#C93B6B'}
            size={34}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="brand-title">Momentos</span>
              <span className="brand-badge">Tanpa Login</span>
            </div>
          </div>
        </div>

        {/* Navigasi Bersih Tanpa Nomor & Tanpa Item "Beranda" */}
        {isHome ? (
          <nav className="screen-nav" aria-label="Navigasi Informasi Beranda">
            <a className="nav-link-clean" href="#cara-kerja">
              Cara Kerja
            </a>
            <a className="nav-link-clean" href="#pilih-mode">
              Mode Solo &amp; Duo
            </a>
            <a className="nav-link-clean" href="#fitur-studio">
              Fitur Studio
            </a>
            <a className="nav-link-clean" href="#privasi">
              Privasi
            </a>
            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ minHeight: 38, padding: '6px 16px', fontSize: '0.84rem' }}
              onClick={() => onSelectScreen('room')}
            >
              Mulai Booth →
            </button>
          </nav>
        ) : (
          <nav className="screen-nav" aria-label="Alur Studio Photobooth">
            {BOOTH_FLOW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`nav-link-clean ${activeScreen === tab.id ? 'active' : ''}`}
                onClick={() => onSelectScreen(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};
