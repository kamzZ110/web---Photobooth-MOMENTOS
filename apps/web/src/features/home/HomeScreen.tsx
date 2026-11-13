import React, { useState } from 'react';
import type { BoothMode, ScreenId } from '@momentos/shared';
import { InstantCameraRig, MiniCameraStripIcon } from '../../components/InstantCameraRig';

interface HomeScreenProps {
  mode: BoothMode;
  onStartMode: (mode: BoothMode, targetScreen: ScreenId) => void;
  onSelectScreen: (screen: ScreenId) => void;
}

const FAQ_ITEMS = [
  {
    num: '01',
    q: 'Apakah harus buat akun atau login dulu sebelum foto?',
    a: 'Tidak sama sekali. Kamu bisa langsung membuka kamera untuk Mode Solo atau membuat kode Room untuk Mode Duo tanpa registrasi, tanpa password, dan tanpa menyimpan riwayat publik.',
  },
  {
    num: '02',
    q: 'Bagaimana cara kerja Mode Duo kalau kami berada di kota yang berbeda?',
    a: 'Host membuat Room lalu membagikan kode 1-klik ke 1 teman (Guest). Setelah keduanya terhubung dan menekan Ready, countdown berjalan sinkron dan kedua perangkat mengambil frame lokal berkualitas tajam pada target waktu yang sama.',
  },
  {
    num: '03',
    q: 'Berapa kali kami boleh mengulang pose (Retake)?',
    a: 'Setiap sesi mendapatkan kuota maksimal 3× retake. Pada Mode Duo, jika Guest meminta foto ulang pada frame tertentu, Host akan menerima notifikasi persetujuan sebelum kamera menghitung mundur ulang.',
  },
  {
    num: '04',
    q: 'Apa yang terjadi kalau koneksi salah satu peserta tiba-tiba putus?',
    a: 'Sistem menahan sesi selama maksimal 5 menit agar peserta yang terputus bisa masuk kembali (rejoin) tanpa kehilangan hasil foto yang sudah diambil. Jika putus saat di Editor, kanvas dijeda sementara untuk mencegah konflik.',
  },
  {
    num: '05',
    q: 'Apakah foto saya aman dan tersimpan di galeri publik?',
    a: 'Aman. Tidak ada galeri publik dan tidak ada tautan share publik permanen. Semua aset bersifat sementara selama sesi berlangsung dan hasil akhir diunduh langsung ke perangkat masing-masing (PNG atau JPG).',
  },
  {
    num: '06',
    q: 'Bagaimana cara kerja stiker dan Undo di Editor Kolaboratif?',
    a: 'Host dan Guest dapat menghias strip secara bersamaan di kanvas putih netral (#FFFFFF) tanpa saling mengunci objek. Tombol Undo bersifat personal: hanya membatalkan perubahan milikmu sendiri tanpa mengganggu hiasan temanmu.',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  mode,
  onStartMode,
  onSelectScreen,
}) => {
  const [openFaq, setOpenFaq] = useState<string | null>('01');

  return (
    <div className="page-stack">
      {/* 1. HERO SECTION — Cardless, Open Canvas */}
      <section
        className="grid-2"
        style={{
          alignItems: 'center',
          paddingTop: 12,
        }}
      >
        <div>
          <div className="pill-tag" style={{ marginBottom: 20 }}>
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

          <h1 className="heading-display" style={{ marginBottom: 20 }}>
            Abadikan{' '}
            <span style={{ color: '#C93B6B', fontStyle: 'italic' }}>momen</span>{' '}
            bersama, dari mana saja.
          </h1>

          <p
            className="text-muted"
            style={{ fontSize: '1.1rem', maxWidth: 500, marginBottom: 32 }}
          >
            Buka kamera langsung di browser, ambil 3–4 pose sinkron bersama teman
            atau sendiri, hias strip di kanvas kolaboratif, lalu cetak ke perangkatmu.
          </p>

          {/* Tombol Solo & Duo di Beranda */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ minHeight: 54, padding: '12px 28px', fontSize: '1rem' }}
              onClick={() => onStartMode('solo', 'camera')}
            >
              📸 Mulai Mode Solo
            </button>

            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ minHeight: 54, padding: '12px 28px', fontSize: '1rem' }}
              onClick={() => onStartMode('duo', 'room')}
            >
              👩‍💻🧑‍💻 Mulai Mode Duo
            </button>
          </div>

          <div
            style={{
              fontSize: '0.86rem',
              fontWeight: 600,
              color: '#52525B',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 16px',
            }}
          >
            <span>Solo &amp; Duo</span>
            <span>·</span>
            <span>Tanpa Daftar / Login</span>
            <span>·</span>
            <span>Maks 2 Peserta per Room</span>
            <span>·</span>
            <span>Unduh PNG &amp; JPG</span>
          </div>
        </div>

        {/* Instant Camera + Ejecting Strip (Terbuka di atas canvas, tanpa kotak pembungkus) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <InstantCameraRig
            mode={mode}
            caption="MOMENTOS • CLASSIC STRIP"
            badgeText={mode === 'duo' ? 'DUO SYNC' : 'SOLO CAM'}
          />
        </div>
      </section>

      {/* 2. MEET MOMENTOS (3 Pilar Simpel — Tanpa Nested Badges) */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Kenapa Momentos</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Photobooth simpel yang langsung jalan di browser.
          </h2>
          <p className="text-muted">
            Tidak perlu pasang aplikasi atau buat akun. Buka halaman, izinkan kamera,
            dan langsung mulai sesi fotomu dalam hitungan detik.
          </p>
        </div>

        <div className="grid-3">
          <div className="clean-card interactive">
            <div className="squircle-icon" style={{ background: '#FCEEF3' }}>
              ⚡
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Langsung di Browser
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Berjalan mulus di browser laptop maupun ponsel tanpa perlu unduh aplikasi
              tambahan atau login.
            </p>
          </div>

          <div className="clean-card interactive">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              🌐
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Sinkronisasi Jarak Jauh
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Mode Duo menghubungkan tepat 2 peserta dengan aba-aba sinkron sehingga
              hasil foto tetap tajam di kedua sisi.
            </p>
          </div>

          <div className="clean-card interactive">
            <div className="squircle-icon" style={{ background: '#ECF3ED' }}>
              🔒
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Privat &amp; Sementara
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Tidak ada galeri publik atau link sebar permanen. Foto hanya diunduh
              langsung ke perangkat masing-masing.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CARA KERJA (4 Langkah Simpel 2x2) */}
      <section id="cara-kerja" style={{ scrollMarginTop: 90 }}>
        <div className="section-header-center">
          <span className="eyebrow-text">Cara Kerja</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Empat langkah sederhana dari buka browser sampai cetak strip.
          </h2>
        </div>

        <div className="grid-2">
          <div className="clean-card interactive">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              1
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
              2
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
              3
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
              4
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
      </section>

      {/* 4. PILIH MODE (Solo vs Duo) */}
      <section id="pilih-mode" style={{ scrollMarginTop: 90 }}>
        <div className="section-header-center">
          <span className="eyebrow-text">Pilih Mode</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Sendiri atau berdua, hasilnya tetap seimbang.
          </h2>
        </div>

        <div className="grid-2">
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
              <MiniCameraStripIcon accentColor="#C93B6B" size={40} />
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
              <MiniCameraStripIcon accentColor="#7AB3EF" size={40} />
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
      </section>

      {/* 5. FORMAT YANG BISA DIBUAT (Open Clean Showcase) */}
      <section id="fitur-studio" style={{ scrollMarginTop: 90 }}>
        <div className="section-header-center">
          <span className="eyebrow-text">Format &amp; Editor</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Satu sesi foto, berbagai gaya cetakan.
          </h2>
          <p className="text-muted">
            Semua layout diedit di atas kanvas putih bersih (#FFFFFF) agar warna foto
            tetap akurat saat diunduh.
          </p>
        </div>

        <div className="grid-3">
          <div className="clean-card interactive">
            <div
              style={{
                height: 120,
                borderRadius: 14,
                background: '#FAF7F2',
                border: '1.5px solid #18181B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 92,
                  background: '#FFFFFF',
                  border: '1.5px solid #18181B',
                  borderRadius: 6,
                  padding: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ flex: 1, background: '#FCEEF3', borderRadius: 3 }} />
                <div style={{ flex: 1, background: '#EBF4FD', borderRadius: 3 }} />
                <div style={{ flex: 1, background: '#ECF3ED', borderRadius: 3 }} />
              </div>
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 6 }}>
              Strip Klasik 1×3 / 1×4
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Format strip vertikal ikonik yang keluar langsung dari slot kamera instan.
            </p>
          </div>

          <div className="clean-card interactive">
            <div
              style={{
                height: 120,
                borderRadius: 14,
                background: '#FAF7F2',
                border: '1.5px solid #18181B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 82,
                  height: 82,
                  background: '#FFFFFF',
                  border: '1.5px solid #18181B',
                  borderRadius: 8,
                  padding: 6,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 5,
                }}
              >
                <div style={{ background: '#FCEEF3', borderRadius: 4 }} />
                <div style={{ background: '#EBF4FD', borderRadius: 4 }} />
                <div style={{ background: '#ECF3ED', borderRadius: 4 }} />
                <div style={{ background: '#FAF7F2', borderRadius: 4 }} />
              </div>
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 6 }}>
              Kolase Grid 2×2
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Cocok untuk 4 pose berpasangan agar ekspresi kalian terlihat seimbang.
            </p>
          </div>

          <div className="clean-card interactive">
            <div
              style={{
                height: 120,
                borderRadius: 14,
                background: '#FAF7F2',
                border: '1.5px solid #18181B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 86,
                  background: '#FFFFFF',
                  border: '1.5px solid #18181B',
                  borderRadius: 6,
                  padding: '6px 6px 18px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#EBF4FD',
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 6 }}>
              Polaroid Frame
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Bingkai lebar klasik dengan ruang catatan khusus di bagian bawah foto.
            </p>
          </div>
        </div>
      </section>

      {/* 6. PRIVASI & FAQ ACCORDION (Pill Bars Bersih seperti Lensbooth) */}
      <section id="privasi" style={{ scrollMarginTop: 90 }}>
        <div className="section-header-center">
          <span className="eyebrow-text">Pertanyaan Umum &amp; Privasi</span>
          <h2 className="heading-h1" style={{ marginBottom: 12 }}>
            Ada pertanyaan? Ini jawabannya.
          </h2>
        </div>

        <div className="faq-list">
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
      </section>

      {/* 7. SOLID INK FOOTER */}
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
              Siap abadikan momenmu hari ini?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.96rem' }}>
              Tanpa akun, tanpa watermark paksa, langsung dari browser.
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
              onClick={() => onSelectScreen('room')}
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
          <span>Sesi Sementara • Unduh PNG &amp; JPG • Tanpa Galeri Publik</span>
        </div>
      </footer>
    </div>
  );
};
