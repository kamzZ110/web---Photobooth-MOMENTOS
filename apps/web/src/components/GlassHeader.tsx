import React from 'react';
import type { BoothMode, ScreenId } from '@momentos/shared';
import { MiniCameraStripIcon } from './InstantCameraRig';
import { ThemeSwitch } from './ThemeSwitch';

interface GlassHeaderProps {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  mode: BoothMode;
  isNight: boolean;
  onToggleNight: () => void;
}

const CENTER_INFO_PAGES: Array<{ id: ScreenId; label: string }> = [
  { id: 'how-it-works', label: 'Cara Kerja' },
  { id: 'modes-info', label: 'Mode Solo & Duo' },
  { id: 'studio-features', label: 'Fitur Studio' },
  { id: 'privacy-info', label: 'Privasi' },
];

const BOOTH_FLOW_TABS: Array<{ id: ScreenId; label: string }> = [
  { id: 'room', label: 'Room' },
  { id: 'camera', label: 'Kamera' },
  { id: 'review', label: 'Review' },
  { id: 'editor', label: 'Editor' },
  { id: 'export', label: 'Export' },
];

const STUDIO_SCREENS: ScreenId[] = ['room', 'camera', 'review', 'editor', 'export'];

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  activeScreen,
  onSelectScreen,
  isNight,
  onToggleNight,
}) => {
  const isStudioFlow = STUDIO_SCREENS.includes(activeScreen);

  return (
    <header className="top-header-full">
      <div className="top-header-inner">
        {/* KIRI UJUNG: Brand Momentos */}
        <div className="header-left">
          <div
            className="brand-group"
            onClick={() => {
              onSelectScreen('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectScreen('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <MiniCameraStripIcon size={36} variant={isNight ? 'retro' : 'white'} />
            <span className="brand-title">Momentos</span>
          </div>
        </div>

        {/* TENGAH: 4 Tombol Halaman Utama */}
        <nav className="header-center screen-nav" aria-label="Navigasi Utama">
          {CENTER_INFO_PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              className={`nav-link-clean ${activeScreen === page.id ? 'active' : ''}`}
              onClick={() => {
                onSelectScreen(page.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              {page.label}
            </button>
          ))}
        </nav>

        {/* KANAN UJUNG: Switch Night Mode + Tombol Mulai Booth */}
        <div className="header-right">
          {isStudioFlow && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {BOOTH_FLOW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`nav-link-clean ${activeScreen === tab.id ? 'active' : ''}`}
                  style={{ padding: '6px 11px', fontSize: '0.82rem' }}
                  onClick={() => onSelectScreen(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <ThemeSwitch isNight={isNight} onToggleNight={onToggleNight} />

          <button
            type="button"
            className="btn btn-primary-pop"
            style={{ minHeight: 40, padding: '8px 18px', fontSize: '0.86rem' }}
            onClick={() => {
              onSelectScreen('room');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Mulai Booth →
          </button>
        </div>
      </div>
    </header>
  );
};
