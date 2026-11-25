import React, { useState } from 'react';
import type { BoothMode, ScreenId } from '@momentos/shared';
import { InstantCameraRig, MiniCameraStripIcon } from '../../components/InstantCameraRig';
import duoStripPhotoUrl from '@assets/Gemini_Generated_Image_1w8io41w8io41w8i.jpg';

interface InfoPageProps {
  mode: BoothMode;
  isNight?: boolean;
  onStartMode: (mode: BoothMode, targetScreen: ScreenId) => void;
  onSelectScreen: (screen: ScreenId) => void;
}

/**
 * 1. HALAMAN PENUH: CARA KERJA (how-it-works)
 */
export const HowItWorksPage: React.FC<InfoPageProps> = ({
  mode,
  isNight = false,
  onStartMode,
  onSelectScreen,
}) => {
  return (
    <div className="page-stack">
      <section>
        <div className="page-intro">
          <span className="eyebrow-text">Panduan Lengkap · Cara Kerja</span>
          <h1 className="heading-display" style={{ marginBottom: 16 }}>
            Empat langkah menuju <span className="font-upright-serif">cetakan</span> kenanganmu.
          </h1>
          <p className="text-muted" style={{ fontSize: '1.05rem' }}>
            Dirancang agar siapa saja bisa langsung mengambil foto sendiri maupun
            berdua lintas kota tanpa perlu instal aplikasi atau membuat akun.
          </p>
        </div>

        <div className="grid-2" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              {
                num: '01',
                title: 'Pilih Mode Solo atau Buat Room Duo',
                desc: 'Untuk foto sendiri, kamu bisa langsung melompat ke layar kamera. Untuk foto berdua, Host membuat Room privat lalu membagikan kode undangan kepada 1 Guest.',
                bg: '#FCEEF3',
              },
              {
                num: '02',
                title: 'Atur Kamera, Filter & Tekan Ready',
                desc: 'Pilih jumlah pose (1 sampai 8 take) dan filter warna. Pada Mode Duo, kedua peserta menekan tombol Ready agar aba-aba hitung mundur berjalan serentak.',
                bg: '#EBF4FD',
              },
              {
                num: '03',
                title: 'Bidik Lokal, Review & Kuota 3× Retake',
                desc: 'Kamera menangkap frame asli langsung dari perangkat masing-masing (bukan screenshot video). Jika ada pose yang kurang pas, gunakan kuota hingga 3× retake.',
                bg: '#FAF7F2',
              },
              {
                num: '04',
                title: 'Hias di Kanvas Putih & Unduh PNG/JPG',
                desc: 'Pilih layout Strip, Grid 2×2, atau Polaroid. Tempel stiker bersama dengan fitur Personal Undo, lalu unduh hasilnya langsung ke perangkatmu.',
                bg: '#ECF3ED',
              },
            ].map((step) => (
              <div key={step.num} className="clean-card interactive">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                  <div
                    className="squircle-icon"
                    style={{ background: step.bg, marginBottom: 0, flexShrink: 0 }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h2 className="heading-h2" style={{ marginBottom: 6 }}>
                      {step.title}
                    </h2>
                    <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <InstantCameraRig mode={mode} isNight={isNight} useSamplePhotoStrip />
            <p className="text-muted" style={{ fontSize: '0.88rem', textAlign: 'center', maxWidth: 300 }}>
              Contoh hasil cetakan strip yang keluar langsung dari kamera setelah sesi selesai.
            </p>
          </div>
        </div>
      </section>

      {/* Perbandingan Alur Solo vs Duo */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Detail Alur</span>
          <h2 className="heading-h1">
            Bagaimana sinkronisasi <span className="font-upright-serif">bekerja</span> di balik layar?
          </h2>
        </div>

        <div className="grid-3">
          <div className="clean-card">
            <h3 className="heading-h2" style={{ marginBottom: 10 }}>
              Target Waktu Bersama
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Saat Host dan Guest sama-sama siap, aba-aba 3..2..1 dijadwalkan pada
              target waktu yang disepakati agar ekspresi keduanya tertangkap serentak.
            </p>
          </div>

          <div className="clean-card">
            <h3 className="heading-h2" style={{ marginBottom: 10 }}>
              Kualitas Frame Lokal
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Video preview dipakai untuk melihat temanmu secara langsung, sementara
              hasil foto diambil dari sensor kamera lokal masing-masing agar tetap tajam.
            </p>
          </div>

          <div className="clean-card">
            <h3 className="heading-h2" style={{ marginBottom: 10 }}>
              Tahan Putus 5 Menit
            </h3>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Jika jaringan salah satu peserta terganggu di tengah sesi, room otomatis
              menahan progres selama 5 menit untuk pemulihan koneksi.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Penutup Halaman */}
      <section className="clean-card" style={{ textAlign: 'center', background: '#FFFFFF' }}>
        <h2 className="heading-h1" style={{ marginBottom: 12 }}>
          Siap mencoba alurnya langsung?
        </h2>
        <p className="text-muted" style={{ maxWidth: 520, margin: '0 auto 24px' }}>
          Pilih mode yang paling pas untuk sesi fotomu hari ini.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary-pop"
            onClick={() => onStartMode('solo', 'camera')}
          >
            Mulai Mode Solo
          </button>
          <button
            type="button"
            className="btn btn-secondary-pop"
            onClick={() => onStartMode('duo', 'room')}
          >
            Buka Room Duo
          </button>
          <button
            type="button"
            className="btn btn-lift"
            onClick={() => onSelectScreen('home')}
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </section>
    </div>
  );
};

/**
 * 2. HALAMAN PENUH: MODE SOLO & DUO (modes-info)
 */
export const ModesInfoPage: React.FC<InfoPageProps> = ({
  onStartMode,
  onSelectScreen,
}) => {
  return (
    <div className="page-stack">
      <section>
        <div className="page-intro">
          <span className="eyebrow-text">Pilihan Sesi · Solo &amp; Duo</span>
          <h1 className="heading-display" style={{ marginBottom: 16 }}>
            Satu studio untuk foto <span className="font-upright-serif">sendiri</span> maupun berdua.
          </h1>
          <p className="text-muted" style={{ fontSize: '1.05rem' }}>
            Momentos mengutamakan pengalaman Classic Photobooth yang ringan: mulai dari
            Solo yang instan hingga Duo untuk pasangan, sahabat, dan keluarga jarak jauh.
          </p>
        </div>

        <div className="grid-2">
          {/* Kartu Detail Solo */}
          <div className="clean-card interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span className="pill-tag">1 Peserta · Tanpa Ruang Tunggu</span>
                <MiniCameraStripIcon size={54} variant="white" />
              </div>
              <h2 className="heading-h1" style={{ marginBottom: 12 }}>
                Classic Solo Booth
              </h2>
              <p className="text-muted" style={{ marginBottom: 20 }}>
                Begitu memilih Mode Solo, kamu langsung diarahkan ke viewfinder kamera
                tanpa perlu membuat kode room. Sangat pas untuk swafoto estetik,
                mencoba berbagai filter, dan mencetak strip personal.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span>✓ Langsung buka kamera dalam 1 klik</span>
                <span>✓ Pilihan 1 sampai 8 pose beruntun</span>
                <span>✓ Kuota hingga 3× foto ulang (retake) mandiri</span>
                <span>✓ Bebas hias stiker, warna kertas, dan teks caption</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary-pop"
              style={{ width: '100%' }}
              onClick={() => onStartMode('solo', 'camera')}
            >
              Mulai Sesi Solo Sekarang
            </button>
          </div>

          {/* Kartu Detail Duo */}
          <div className="clean-card interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span className="pill-tag">2 Peserta · Host + Guest Sinkron</span>
                <MiniCameraStripIcon size={54} variant="retro" />
              </div>
              <h2 className="heading-h1" style={{ marginBottom: 12 }}>
                Classic Duo Booth
              </h2>
              <p className="text-muted" style={{ marginBottom: 20 }}>
                Dirancang khusus untuk dua orang dari dua perangkat berbeda. Host
                membuat kode undangan privat, Guest bergabung, lalu kalian berpose
                bersama dan menghias strip di satu kanvas kolaboratif.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span>✓ Kode room privat dengan batas tegas maksimal 2 peserta</span>
                <span>✓ Tombol Ready Check bersama sebelum hitung mundur</span>
                <span>✓ Persetujuan Host saat Guest meminta retake pose</span>
                <span>✓ Editor kolaboratif dengan Personal Undo masing-masing</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary-pop"
              style={{ width: '100%' }}
              onClick={() => onStartMode('duo', 'room')}
            >
              Buat atau Gabung Room Duo
            </button>
          </div>
        </div>
      </section>

      {/* Kapan Menggunakan Solo vs Duo */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Cocok Untuk Setiap Momen</span>
          <h2 className="heading-h1">
            Dibuat untuk <span className="font-upright-serif">kedekatan</span> tanpa batas jarak.
          </h2>
        </div>

        <div className="grid-2">
          <div className="clean-card">
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Pasangan &amp; Sahabat Jarak Jauh (LDR)
            </h3>
            <p className="text-muted">
              Rayakan ulang tahun, hari jadi, atau sekadar ngobrol malam dengan
              mengambil strip foto berdua meski terpisah kota atau negara.
            </p>
          </div>

          <div className="clean-card">
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Dokumentasi Pribadi &amp; Cetakan Jurnal
            </h3>
            <p className="text-muted">
              Simpan perkembangan gaya harianmu dalam format strip klasik atau
              polaroid yang siap dicetak untuk ditempel di buku jurnal maupun dinding.
            </p>
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          className="btn btn-lift"
          onClick={() => onSelectScreen('home')}
        >
          ← Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};

/**
 * 3. HALAMAN PENUH: FITUR STUDIO (studio-features)
 */
export const StudioFeaturesPage: React.FC<InfoPageProps> = ({
  onStartMode,
  onSelectScreen,
}) => {
  return (
    <div className="page-stack">
      <section>
        <div className="page-intro">
          <span className="eyebrow-text">Fitur Studio &amp; Editor</span>
          <h1 className="heading-display" style={{ marginBottom: 16 }}>
            Kanvas bersih untuk <span className="font-upright-serif">kreasi</span> yang tajam.
          </h1>
          <p className="text-muted" style={{ fontSize: '1.05rem' }}>
            Dari pemilihan template hingga pengeditan bersama, setiap alat di studio
            Momentos dirancang agar tidak menghalangi kualitas asli fotomu.
          </p>
        </div>

        {/* Showcase Visual Strip Asli + Penjelasan */}
        <div className="grid-2" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                maxWidth: 320,
                borderRadius: 20,
                overflow: 'hidden',
                border: '1.5px solid #18181B',
                background: '#FFFFFF',
                boxShadow: '0 20px 40px -15px rgba(24,24,27,0.16)',
              }}
            >
              <img
                src={duoStripPhotoUrl}
                alt="Contoh Strip Kolase Pasangan Momentos"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="clean-card">
              <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                Tiga Format Tata Letak Utama
              </h2>
              <p className="text-muted" style={{ fontSize: '0.94rem' }}>
                Pilih antara <strong>Strip Klasik 1×3 / 1×4</strong>,{' '}
                <strong>Kolase Grid 2×2</strong> untuk pasangan Duo, atau{' '}
                <strong>Bingkai Polaroid</strong> dengan ruang catatan tanggal dan
                pesan di bagian bawah.
              </p>
            </div>

            <div className="clean-card">
              <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                Kanvas Kerja Putih Netral (#FFFFFF)
              </h2>
              <p className="text-muted" style={{ fontSize: '0.94rem' }}>
                Saat kamu masuk ke layar Editor, area kanvas kerja selalu dijaga putih
                bersih tanpa efek blur atau tekstur pengganggu agar warna kulit dan
                tone filter terlihat akurat.
              </p>
            </div>

            <div className="clean-card">
              <h2 className="heading-h2" style={{ marginBottom: 8 }}>
                Kolaborasi Tanpa Lock &amp; Personal Undo
              </h2>
              <p className="text-muted" style={{ fontSize: '0.94rem' }}>
                Host dan Guest dapat menempelkan stiker secara bersamaan tanpa saling
                mengunci layar. Menekan tombol Undo hanya akan membatalkan perubahan
                milikmu sendiri.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Spesifikasi Teknis Studio */}
      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Spesifikasi Hasil</span>
          <h2 className="heading-h1">
            Dirancang agar siap disimpan maupun dicetak.
          </h2>
        </div>

        <div className="grid-3">
          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#FCEEF3' }}>
              🎨
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              5 Pilihan Kertas Frame
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Sesuaikan warna pinggiran kertas strip mulai dari Putih Bersih, Cream
              Hangat, Berry Soft, Sky Mist, hingga Sage Green.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              🖼️
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Ekspor PNG &amp; JPG
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Gunakan format PNG tanpa kompresi untuk kualitas cetak terbaik, atau JPG
              untuk ukuran file yang lebih ringan saat dibagikan lewat chat.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#ECF3ED' }}>
              ⚡
            </div>
            <h3 className="heading-h2" style={{ marginBottom: 8 }}>
              Snapshot Final Konsisten
            </h3>
            <p className="text-muted" style={{ fontSize: '0.92rem' }}>
              Masing-masing peserta Duo bisa mengunduh foto dari editor. Tunggu sampai perubahan temanmu terlihat sebelum mengunduh versi yang sama.
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary-pop"
          onClick={() => onStartMode('solo', 'editor')}
        >
          Coba Langsung Layar Editor
        </button>
        <button
          type="button"
          className="btn btn-lift"
          onClick={() => onSelectScreen('home')}
        >
          ← Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};

/**
 * 4. HALAMAN PENUH: PRIVASI (privacy-info)
 */
export const PrivacyInfoPage: React.FC<InfoPageProps> = ({
  onStartMode,
  onSelectScreen,
}) => {
  const [openFaq, setOpenFaq] = useState<string | null>('01');

  const PRIVACY_FAQS = [
    {
      num: '01',
      q: 'Mengapa Momentos tidak menyediakan fitur akun atau riwayat foto?',
      a: 'Agar kamu bisa langsung berfoto tanpa menyerahkan alamat email, nomor telepon, atau data pribadi. Unduh foto yang ingin kamu simpan sebelum meninggalkan sesi.',
    },
    {
      num: '02',
      q: 'Apakah ada link share publik yang bisa diakses orang asing?',
      a: 'Tidak ada. Kami secara tegas meniadakan fitur public share link dan galeri publik. Hanya peserta yang berada di dalam room aktif yang dapat mengunduh hasil fotonya.',
    },
    {
      num: '03',
      q: 'Berapa lama data sesi sementara disimpan untuk kebutuhan reconnect?',
      a: 'Peserta punya waktu hingga 5 menit untuk tersambung kembali. Server menyimpan data room di memori dan membersihkan room kedaluwarsa secara berkala, dengan batas sesi satu jam.',
    },
    {
      num: '04',
      q: 'Bagaimana keamanan kode undangan Room Duo?',
      a: 'Setiap Room menggunakan kode acak dan membatasi kapasitas maksimal 2 peserta (1 Host dan 1 Guest). Percobaan masuk dari peserta ke-3 akan langsung ditolak.',
    },
  ];

  return (
    <div className="page-stack">
      <section>
        <div className="page-intro">
          <span className="eyebrow-text">Komitmen Privasi &amp; Keamanan</span>
          <h1 className="heading-display" style={{ marginBottom: 16 }}>
            Momen pribadimu tetap menjadi <span className="font-upright-serif">milikmu</span>.
          </h1>
          <p className="text-muted" style={{ fontSize: '1.05rem' }}>
            Tidak ada pendaftaran akun, tidak ada galeri publik, dan tidak ada tautan
            berbagi terbuka. Semua dirancang untuk kenyamanan sesi fotomu.
          </p>
        </div>

        <div className="grid-3">
          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#ECF3ED' }}>
              🔒
            </div>
            <h2 className="heading-h2" style={{ marginBottom: 8 }}>
              Tanpa Akun &amp; Login
            </h2>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Kami tidak mengumpulkan profil pengguna, kata sandi, atau daftar kontak
              untuk menjalankan sesi photobooth.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#FCEEF3' }}>
              🚫
            </div>
            <h2 className="heading-h2" style={{ marginBottom: 8 }}>
              Tanpa Galeri Publik
            </h2>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Hasil foto tidak pernah dipajang di halaman publik dan tidak dibuatkan
              URL publik yang bisa ditebak orang lain.
            </p>
          </div>

          <div className="clean-card">
            <div className="squircle-icon" style={{ background: '#EBF4FD' }}>
              ⏳
            </div>
            <h2 className="heading-h2" style={{ marginBottom: 8 }}>
              Siklus Sesi Sementara
            </h2>
            <p className="text-muted" style={{ fontSize: '0.94rem' }}>
              Foto Duo dikirim langsung antarpeserta saat kanal P2P tersedia. Jika kanal belum siap, server dapat menyimpan foto sementara di memori room untuk menyinkronkan kedua perangkat.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-header-center">
          <span className="eyebrow-text">Tanya Jawab Privasi</span>
          <h2 className="heading-h1">Penjelasan transparan seputar data sesi.</h2>
        </div>

        <div className="faq-list">
          {PRIVACY_FAQS.map((item) => {
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
                <div className="faq-body" hidden={!isOpen}>{item.a}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary-pop"
          onClick={() => onStartMode('solo', 'camera')}
        >
          Mulai Sesi Privat Sekarang
        </button>
        <button
          type="button"
          className="btn btn-lift"
          onClick={() => onSelectScreen('home')}
        >
          ← Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};
