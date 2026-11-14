import React, { useState } from 'react';
import type { BoothMode, ScreenId } from '@momentos/shared';
import { InstantCameraRig, MiniCameraStripIcon } from '../../components/InstantCameraRig';

interface HomeScreenProps {
  mode: BoothMode;
  isNight: boolean;
  onStartMode: (mode: BoothMode, targetScreen: ScreenId) => void;
  onSelectScreen: (screen: ScreenId) => void;
}

const FAQ_ITEMS = [
  {
    num: '01',
    q: 'Apakah harus buat akun atau login dulu sebelum foto?',
    a: 'Tidak sama sekali. Kamu bisa langsung membuka kamera untuk Mode Solo atau membuat kode Room untuk Mode Duo tanpa registrasi dan tanpa menyimpan riwayat publik.',
  },
  {
    num: '02',
    q: 'Bagaimana cara kerja Mode Duo kalau kami berada di kota yang berbeda?',
    a: 'Host membuat Room lalu membagikan kode ke 1 teman (Guest). Setelah keduanya terhubung dan menekan Ready, countdown berjalan sinkron dan kedua perangkat mengambil frame lokal pada target waktu yang sama.',
  },
  {
    num: '03',
    q: 'Berapa kali kami boleh mengulang pose (Retake)?',
    a: 'Setiap sesi mendapatkan kuota maksimal 3× retake. Pada Mode Duo, jika Guest meminta foto ulang pada frame tertentu, Host akan menerima notifikasi persetujuan sebelum kamera menghitung mundur ulang.',
  },
  {
    num: '04',
    q: 'Apa yang terjadi kalau koneksi salah satu peserta tiba-tiba putus?',
    a: 'Sistem menahan sesi selama maksimal 5 menit agar peserta yang terputus bisa masuk kembali (rejoin) tanpa kehilangan hasil foto yang sudah diambil.',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  mode,
  isNight,
  onStartMode,
  onSelectScreen,
}) => {
  const [openFaq, setOpenFaq] = useState<string | null>('01');

  const navigateTop = (screen: ScreenId) => {
    onSelectScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page-stack">
      {/* 1. HERO CENTERED LAYOUT: Teks Lebar di Atas -> Kamera HD & Strip Animasi di Tengah -> Tombol Solo & Duo di Bawah */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingTop: 6,
        }}
      >
        <div className="pill-tag" style={{ marginBottom: 18 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#7A9E7E',
              display: 'inline-block',
            }}
          />
          <span>Web Photobooth untuk Solo &amp; Duo Jarak Jauh</span>
        </div>

        {/* Judul & Subjudul Lebar ("Ujung ke Ujung") — Font Aksen Annabel (Opsi B) */}
        <h1 className="heading-display hero-headline-wide" style={{ marginBottom: 18 }}>
          Abadikan setiap{' '}
          <span className="font-upright-serif">cerita dan tawa</span> bersama,
          dari mana saja.
        </h1>

        <p
          className="text-muted hero-subtitle-wide"
          style={{ fontSize: '1.08rem', marginBottom: 34 }}
        >
          Buka kamera langsung di browser, ambil 3–4 pose sinkron bersama teman
          atau sendiri, hias strip di kanvas kolaboratif, lalu cetak ke perangkatmu.
        </p>

        {/* Kamera HD di Tengah (antara Teks & Tombol Mulai) + Animasi Roller & Film Develop */}
        <InstantCameraRig
          mode={mode}
          isNight={isNight}
          useSamplePhotoStrip
          showConnectionWings
        />

        {/* Tombol Solo & Duo di Bawah Kamera */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 14,
            marginTop: 28,
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            className="btn btn-primary-pop"
            style={{ minHeight: 52, padding: '12px 28px', fontSize: '0.98rem' }}
            onClick={() => onStartMode('solo', 'camera')}
          >
            📸 Mulai Mode Solo
          </button>

          <button
            type="button"
            className="btn btn-secondary-pop"
            style={{ minHeight: 52, padding: '12px 28px', fontSize: '0.98rem' }}
            onClick={() => onStartMode('duo', 'room')}
          >
            👩‍💻🧑‍💻 Mulai Mode Duo
          </button>
        </div>

        <div
          style={{
            fontSize: '0.86rem',
            fontWeight: 350,
            opacity: 0.78,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px 16px',
          }}
        >
          <span>Solo &amp; Duo</span>
          <span>·</span>
          <span>Tanpa Daftar / Login</span>
          <span>·</span>
          <span>Maks 2 Peserta per Room</span>
          <span>·</span>
          <span>Bebas Watermark</span>
        </div>
      </section>

      {/* 2. RINGKASAN CARA KERJA (+ Link ke Halaman Penuh Cara Kerja) */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Ringkasan · Cara Kerja</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Empat langkah sederhana menuju{' '}
            <span className="font-upright-serif">strip</span> fotomu.
          </h2>
          <p className="text-muted">
            Langsung jalan di browser laptop maupun ponsel tanpa perlu mengunduh aplikasi.
          </p>
        </div>

        <div className="grid-2" style={{ marginBottom: 28 }}>
          <div className="clean-card interactive">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              01
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Pilih Mode Solo atau Buat Room Duo
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Mulai foto sendiri seketika, atau bagikan kode undangan privat ke 1 teman
              untuk masuk ke Waiting Room bersama.
            </p>
          </div>

          <div className="clean-card interactive">
            <div className="squircle-icon" style={{ background: '#FCEEF3' }}>
              02
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Siapkan Kamera &amp; Tekan Ready
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Pilih 3 atau 4 jumlah pose, atur filter warna favoritmu, lalu pastikan
              kalian berdua siap sebelum countdown dimulai.
            </p>
          </div>

          <div className="clean-card interactive">
            <div className="squircle-icon" style={{ background: '#FAF7F2' }}>
              03
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Pose, Review &amp; Retake Seperlunya
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Kurang puas dengan satu pose? Manfaatkan kuota hingga 3× retake dengan
              persetujuan Host saat sesi Duo.
            </p>
          </div>

          <div className="clean-card interactive">
            <div className="squircle-icon" style={{ background: '#ECF3ED' }}>
              04
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Hias Bersama &amp; Unduh Hasilnya
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Pilih layout Strip, Grid 2×2, atau Polaroid di kanvas putih netral,
              tambahkan stiker dan caption, lalu simpan sebagai PNG atau JPG.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-lift"
            onClick={() => navigateTop('how-it-works')}
          >
            Pelajari Detail Cara Kerja →
          </button>
        </div>
      </section>

      {/* 3. RINGKASAN PILIH MODE SOLO & DUO */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Ringkasan · Mode Solo &amp; Duo</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Sendiri atau <span className="font-upright-serif">berdua</span>, hasilnya tetap seimbang.
          </h2>
        </div>

        <div className="grid-2" style={{ marginBottom: 28 }}>
          <div className="clean-card interactive">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 className="heading-h2">Classic Solo Booth</h3>
              <MiniCameraStripIcon size={46} variant="white" />
            </div>
            <p className="text-muted" style={{ marginBottom: 24, fontSize: '0.95rem' }}>
              Langsung masuk ke studio kamera tanpa ruang tunggu. Cocok untuk foto cepat,
              eksperimen pose, dan cetak strip instan.
            </p>
            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ width: '100%' }}
              onClick={() => onStartMode('solo', 'camera')}
            >
              Mulai Sesi Solo →
            </button>
          </div>

          <div className="clean-card interactive">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 className="heading-h2">Classic Duo Booth</h3>
              <MiniCameraStripIcon size={46} variant="classic" />
            </div>
            <p className="text-muted" style={{ marginBottom: 24, fontSize: '0.95rem' }}>
              Satu Host dan satu Guest terhubung lewat kode room privat. Lengkap dengan
              pemulihan koneksi 5 menit dan editor kolaboratif.
            </p>
            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ width: '100%' }}
              onClick={() => onStartMode('duo', 'room')}
            >
              Buka Room Duo →
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-lift"
            onClick={() => navigateTop('modes-info')}
          >
            Bandingkan Mode Solo &amp; Duo Selengkapnya →
          </button>
        </div>
      </section>

      {/* 4. RINGKASAN FITUR STUDIO */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Ringkasan · Fitur Studio</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Satu sesi foto, berbagai <span className="font-upright-serif">gaya</span> cetakan.
          </h2>
          <p className="text-muted">
            Semua layout diedit di atas kanvas putih bersih (#FFFFFF) agar warna foto
            tetap akurat saat diunduh.
          </p>
        </div>

        <div className="grid-3" style={{ marginBottom: 28 }}>
          <div className="clean-card interactive">
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Strip Klasik 1×3 / 1×4
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Format strip vertikal ikonik yang keluar langsung dari celah kamera instan.
            </p>
          </div>

          <div className="clean-card interactive">
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Kolase Grid 2×2
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Cocok untuk 4 pose berpasangan agar ekspresi kalian terlihat berdampingan.
            </p>
          </div>

          <div className="clean-card interactive">
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Polaroid Frame
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Bingkai klasik dengan ruang catatan tanggal dan caption di bagian bawah.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-lift"
            onClick={() => navigateTop('studio-features')}
          >
            Jelajahi Semua Fitur Studio →
          </button>
        </div>
      </section>

      {/* 5. RINGKASAN PRIVASI & FAQ */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Ringkasan · Privasi &amp; FAQ</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Privat sejak awal, <span className="font-upright-serif">tanpa galeri publik</span>.
          </h2>
        </div>

        <div className="faq-list" style={{ marginBottom: 28 }}>
          {FAQ_ITEMS.map((item) => {
            const isOpen = openFaq === item.num;
            return (
              <div key={item.num} className="faq-item">
                <button
                  type="button"
                  className="faq-trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : item.num)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span className="faq-num">{item.num}</span>
                    <span>{item.q}</span>
                  </span>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && <div className="faq-body">{item.a}</div>}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-lift"
            onClick={() => navigateTop('privacy-info')}
          >
            Baca Halaman Privasi Selengkapnya →
          </button>
        </div>
      </section>

      {/* 6. SOLID INK FOOTER */}
      <footer className="solid-footer">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 24,
            paddingBottom: 32,
            borderBottom: '1px solid rgba(255,255,255,0.16)',
          }}
        >
          <div>
            <h2 className="heading-h1" style={{ color: '#FFFFFF', marginBottom: 8 }}>
              Siap abadikan <span className="font-upright-serif">momenmu</span> hari ini?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.96rem' }}>
              Tanpa akun, tanpa galeri publik, langsung dari browser.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ borderColor: '#FFFFFF' }}
              onClick={() => onStartMode('solo', 'camera')}
            >
              Mulai Solo →
            </button>
            <button
              type="button"
              className="btn btn-secondary-pop"
              onClick={() => navigateTop('room')}
            >
              Masuk Room Duo
            </button>
          </div>
        </div>

        <div
          style={{
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: '0.84rem',
            color: 'rgba(255,255,255,0.68)',
          }}
        >
          <span>
            <strong style={{ color: '#FFFFFF' }}>Momentos</strong> — Classic First
            Photobooth (Solo &amp; Duo)
          </span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', font: 'inherit' }}
              onClick={() => navigateTop('how-it-works')}
            >
              Cara Kerja
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', font: 'inherit' }}
              onClick={() => navigateTop('modes-info')}
            >
              Mode Solo &amp; Duo
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', font: 'inherit' }}
              onClick={() => navigateTop('studio-features')}
            >
              Fitur Studio
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', font: 'inherit' }}
              onClick={() => navigateTop('privacy-info')}
            >
              Privasi
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
