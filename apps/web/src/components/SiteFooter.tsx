import type { MouseEvent } from 'react';
import { publicPages, type PublicScreen } from '../app/publicPages';

// Isi data resmi MOMENTOS di sini ketika kontak dan akun sosial sudah tersedia.
const footerContent = {
  name: 'MOMENTOS',
  description: 'Photobooth online untuk foto sendiri atau berdua dari lokasi berbeda. Abadikan momenmu dengan Classic dan Flipbook.',
  email: '',
  instagramUrl: '',
  tiktokUrl: '',
  copyrightOwner: 'MOMENTOS',
};

const footerGroups = [
  { title: 'Jelajahi', links: [
    { screen: 'home', label: 'Beranda' },
    { screen: 'modes-info', label: 'Mode Solo & Duo' },
    { screen: 'studio-features', label: 'Fitur Studio' },
  ] },
  { title: 'Bantuan', links: [
    { screen: 'how-it-works', label: 'Cara Kerja' },
    { screen: 'privacy-info', label: 'Privasi' },
  ] },
] as const;

interface SiteFooterProps {
  onSelectScreen: (screen: PublicScreen) => void;
}

export function SiteFooter({ onSelectScreen }: SiteFooterProps) {
  const navigate = (event: MouseEvent<HTMLAnchorElement>, screen: PublicScreen) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelectScreen(screen);
    window.scrollTo(0, 0);
  };

  return (
    <footer id="footer" className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-about">
            <a className="site-footer-brand" href={publicPages.home.path} onClick={event => navigate(event, 'home')}>
              {footerContent.name}
            </a>
            <p>{footerContent.description}</p>
          </div>
          {footerGroups.map(group => (
            <nav key={group.title} aria-label={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map(({ screen, label }) => (
                  <li key={screen}><a href={publicPages[screen].path} onClick={event => navigate(event, screen)}>{label}</a></li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="site-footer-contact">
            <h2>Kontak &amp; Media Sosial</h2>
            <ul>
              <li>{footerContent.email ? <a href={'mailto:' + footerContent.email}>Email</a> : <span>Email · [alamat email]</span>}</li>
              <li>{footerContent.instagramUrl ? <a href={footerContent.instagramUrl}>Instagram</a> : <span>Instagram · [username]</span>}</li>
              <li>{footerContent.tiktokUrl ? <a href={footerContent.tiktokUrl}>TikTok</a> : <span>TikTok · [username opsional]</span>}</li>
            </ul>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} {footerContent.copyrightOwner}</span>
          <a href={publicPages['privacy-info'].path} onClick={event => navigate(event, 'privacy-info')}>Kebijakan Privasi</a>
        </div>
      </div>
    </footer>
  );
}
