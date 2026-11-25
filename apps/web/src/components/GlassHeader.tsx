import { publicPages, type PublicScreen } from '../app/publicPages';
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

const CENTER_INFO_PAGES: Array<{ id: PublicScreen; label: string }> = [
  { id: 'how-it-works', label: 'Cara Kerja' },
  { id: 'modes-info', label: 'Mode Solo & Duo' },
  { id: 'studio-features', label: 'Fitur Studio' },
  { id: 'privacy-info', label: 'Privasi' },
];

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  activeScreen,
  onSelectScreen,
  isNight,
  onToggleNight,
}) => {
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, page: PublicScreen) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelectScreen(page);
    window.scrollTo({ top: 0 });
  };
  return (
    <header className="top-header-full">
      <div className="top-header-inner">
        {/* KIRI UJUNG: Brand Momentos */}
        <div className="header-left">
          <a href="/" className="brand-group" aria-label="MOMENTOS, beranda" onClick={event => navigate(event, 'home')}>
            <MiniCameraStripIcon size={36} variant={isNight ? 'retro' : 'white'} />
            <span className="brand-title">Momentos</span>
          </a>
        </div>

        {/* TENGAH: 4 Tombol Halaman Utama */}
        <nav className="header-center screen-nav" aria-label="Navigasi Utama">
          {CENTER_INFO_PAGES.map((page) => (
            <a
              key={page.id}
              href={publicPages[page.id].path}
              aria-current={activeScreen === page.id ? "page" : undefined}
              className={`nav-link-clean ${activeScreen === page.id ? 'active' : ''}`}
              onClick={event => navigate(event, page.id)}
            >
              {page.label}
            </a>
          ))}
        </nav>

        {/* KANAN UJUNG: Switch Night Mode + Tombol Mulai Booth */}
        <div className="header-right">
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
            Mulai Booth
          </button>
        </div>
      </div>
    </header>
  );
};
