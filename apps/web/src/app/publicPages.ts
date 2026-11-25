import type { ScreenId } from '@momentos/shared';

export const publicPages = {
  home: { path: '/', title: 'MOMENTOS | Photobooth Online Solo dan Duo Jarak Jauh', description: 'Ambil foto sendiri atau berdua dari lokasi berbeda lewat browser. Buat strip foto Classic, hias hasilnya, atau rekam Flipbook animasi tanpa membuat akun.' },
  'how-it-works': { path: '/cara-kerja/', title: 'Cara Pakai Photobooth Online | MOMENTOS', description: 'Ikuti langkah mengambil foto Classic, mengundang teman ke room Duo, memilih pose, dan menyimpan hasil photobooth di perangkatmu.' },
  'modes-info': { path: '/mode-solo-duo/', title: 'Foto Solo atau Duo Jarak Jauh | MOMENTOS', description: 'Bandingkan sesi Solo dengan room Duo untuk dua orang. Pelajari peran Host dan Guest sebelum memulai foto bersama dari dua perangkat.' },
  'studio-features': { path: '/fitur-studio/', title: 'Filter, Frame dan Editor Photobooth | MOMENTOS', description: 'Kenali pilihan filter kamera, layout strip, grid, Polaroid, dan stiker untuk menghias foto Classic sebelum mengunduh PNG atau JPG.' },
  'privacy-info': { path: '/privasi/', title: 'Privasi Foto dan Room Duo | MOMENTOS', description: 'Pelajari bagaimana kamera, transfer foto Duo, data sesi sementara, dan unduhan pribadi bekerja di MOMENTOS.' },
} as const;
export type PublicScreen = keyof typeof publicPages;
export const isPublicScreen = (id: ScreenId): id is PublicScreen => Object.hasOwn(publicPages, id);
export function screenForPath(path: string): ScreenId {
  const normalized = path.replace(/\/+$/, '') + '/';
  return (Object.keys(publicPages) as PublicScreen[]).find(id => publicPages[id].path === normalized) ?? 'room';
}
