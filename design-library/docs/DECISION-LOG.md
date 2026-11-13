# Decision Log master WEB ASELOLE

Tanggal inisialisasi 30 Oktober 2026. Dokumen ini merupakan sumber pencatatan keputusan dan perubahan untuk paket kerja sekarang. Status Locked pada baris di bawah berasal dari persetujuan pengguna dalam percakapan, bukan hasil QA file. Dokumen ini belum merupakan transkripsi lengkap Tahap 1–2.

Sumber utama: percakapan `6ae239c7-29f0-83ec-9c56-df835fa587e4`. Pesan persetujuan 9.5: `0eee42d1-0d25-4982-a4d2-ad9d6b44b65d`. Penutupan Tahap 2: `e555dc78-1293-4bb3-8312-1b7775ae158a`. Permulaan Tahap 3: `1a89e5fd-b922-4151-9a39-a7b984f83b36`. Identitas ini menunjuk turn sumber, bukan ID file Figma.

| ID log | Keputusan / batasan | Status dan sumber | Dampak library |
|---|---|---|---|
| LOCK-01 | Tahap 1 dan Tahap 2 UX/UI Specification Final v1 tetap terkunci | Instruksi pengguna dan penutupan Tahap 2 | Tidak mendesain ulang aturan produk |
| LOCK-02 | Classic First: Solo → Duo; Flipbook menyusul | Penutupan Tahap 2 | Hanya library Classic yang diprioritaskan |
| LOCK-03 | Linen #F5F2EB, Sand #E5DEC9, Lavender #DDD0F3 CTA, Terracotta #C06C54, Olive #7F8C72, Pink #F4C9D3, Espresso #2C2825, White #FFFFFF | Permintaan pengguna saat ini; Warm Playful Retro disetujui 9.2 | Nilai primitive dipertahankan |
| LOCK-04 | Teks sekunder #625B56; divider ringan #CFC7BD; error surface #F9E4DF | Usulan 9.5 yang kemudian disetujui seluruhnya | Warna pendukung dan peran semantik |
| LOCK-05 | Primitive → Semantic → Component | Persetujuan 9.5 | 3 lapisan alias; bukan pilihan library/framework |
| LOCK-06 | Fredoka heading, DM Sans body/UI | Persetujuan 9.2/9.5 | 13 gaya desktop/mobile; body utama 16 px |
| LOCK-07 | Display 52/36, H1 36/30, H2 28/24, H3 22/20; body 18/16/14/12; button 16 | Persetujuan 9.5 | Heading 600, H3 500, body 400, button 600 |
| LOCK-08 | Spacing kelipatan 4, rentang 4–64; radius 4/8/12/16/24/pill | Persetujuan 9.5 | Skala lengkap dalam token |
| LOCK-09 | Border 1 px surface; 2 px CTA/selected; shadow neobrutal pendek 3–4 px, tidak untuk seluruh subpanel | Persetujuan 9.5 | Espresso sebagai batas penting |
| LOCK-10 | Button 36/44/52; target kontrol penting ≥44; input 48; card padding 16–24; dialog desktop sekitar 360–480 dan responsif | Persetujuan 9.5 | Small dilarang untuk kontrol penting di handoff |
| LOCK-11 | Default/hover/focus/pressed/selected/disabled/loading/error/success sesuai jenis komponen; loading mencegah double action | Persetujuan 9.5 | State matrix dan focus overlay |
| LOCK-12 | Motion UI 120/180/200/240 ms; reduced motion | Persetujuan 9.5 | Bukan countdown, recording atau Flipbook |
| LOCK-13 | Editor netral; tool aktif berbeda dari objek dipilih/diedit; occupied dan unsynced terlihat | Persetujuan 9.5 | Palet brand tidak diterapkan sebagai filter foto |
| LOCK-14 | Classic 3/4 take, default 4; maksimal 3 retake per foto; gagal teknis tidak memakai kuota | Penutupan Tahap 2 dan AC-CL | State review/capture dan copy pemulihan |
| LOCK-15 | Duo Host/Guest: Ready berdua; Guest retake menunggu Host; setelah disetujui Ready ulang berdua dan hanya Guest retake | AC-DC-03–06 yang disetujui Bagian 10 | Varian approval menurut role; tidak berlaku di Solo |
| LOCK-16 | Duo menjaga 3/4 pasangan foto Host + Guest; reconnect maksimal 5 menit; edit bersama dijeda saat disconnect | Bagian 10 AC-DC dan screen inventory | Tidak menghilangkan foto salah satu pihak |
| LOCK-17 | Export Classic PNG/JPG; snapshot awal; retry; hasil valid sebelumnya aman; download tidak otomatis menutup sesi | AC-EX dan persetujuan Bagian 10 | State export dan dialog keluar |
| LOCK-18 | Tanpa login/history permanen/public share link; hasil disimpan user melalui download | Ringkasan penutupan Tahap 2 | Tidak menambahkan layanan akun/penyimpanan |
| LOCK-19 | FLIP-TEST-01 setelah implementasi Classic selesai; durasi/mekanisme Flipbook belum ditentukan | Instruksi pengguna dan penutupan Tahap 2 | Nilai durasi `null`; halaman deferred |
| LOCK-20 | DOC-01–DOC-10, satu Decision Log, revisi Locked wajib dicatat; GATE-01–08 | Persetujuan Bagian 10 | Indeks dokumen dan gate dengan bukti, tanpa lulus otomatis |

Pemetaan kerja 3.1 yang tidak mengubah keputusan produk: nama token, tiga collection native, sepuluh kelompok operasional, nama halaman Figma, 13 Text Styles, angka line-height dalam rentang yang sudah disetujui, dan ikon UI original. Nama sepuluh kelompok ini disusun untuk paket kerja karena daftar nama lengkap terdahulu tidak tersedia dalam hasil pembacaan sumber; tidak diklaim sebagai salinan nama kelompok Figma lama.

Interpretasi aksesibilitas: gunakan Espresso pada background terang; Terracotta/Olive sebagai aksen, dengan label Espresso di permukaan netral. Jangan menganggap warna brand otomatis memenuhi kontras. Status Success/Warning/Error ditandai ikon dan teks; tidak menambah warna brand baru untuk memaksakan semantik.

| Catatan perubahan | Tanggal | Isi dan dampak | Persetujuan |
|---|---|---|---|
| CHG-3.1-001 | 30 Oktober 2026 | Inisialisasi paket lokal, token, library specimen, struktur Figma, ikon, audit bukti dan generator. Tidak merevisi keputusan Locked. | Tercakup permintaan pengguna saat ini |
| CHG-3.1-002 | 30 Oktober 2026 | Membuat native library pada file Figma kosong yang dibuka pengguna: 10 halaman, 104 variables, 13 Text Styles, 2 Effect Styles, 23 component sets, 227 varian dan 20 ikon. Audit native 15 pemeriksaan lulus; source/report dan URL node dicatat. | Permintaan lanjutan pengguna untuk langsung mengisi Figma |
| CHG-3.1-003 | 30 Oktober 2026 | Menambahkan caption 227 varian di luar komponen produk serta specimen spacing/radius/shadow. Memperbaiki caption ikon agar muat dalam ruang baris. Audit native akhir 17/17 lulus. Tidak mengubah aturan produk Locked. | Penyelesaian library dan review native dalam permintaan yang sama |

Setiap perubahan berikutnya pada keputusan Locked harus ditambahkan sebagai baris perubahan yang menyebut keputusan lama, usulan baru, alasan, screen terdampak dan hasil persetujuan. Jangan mengubah status Locked hanya karena file belum diproduksi.
# Pembaruan 31 Oktober 2026 — CHG-3.2.001

Pengguna meminta melanjutkan tahap berikutnya. Dibuat 25 shared-screen draft high-fidelity di halaman 03 Shared Screens: Home, Booth Selection, Join, Duo Waiting Room dan Bantuan; 11 desktop, 11 mobile, 3 tablet. Menggunakan 88 instance tombol library. Audit geometri native 8/8 lulus setelah perbaikan sumbu Auto Layout. Detail dan node ID di `06-shared-screens-handoff.md`. Draft komposisi/copy belum Locked. Tidak ada keputusan teknologi, format room-code, resolusi export atau durasi Flipbook baru. Prototype masih 0 flow.

# CHG-3.3A.001 — Arahan visual tambahan, 31 Oktober 2026

Pengguna meminta playful/retro/minimal, fine paper texture dan dot grid, identitas orisinal tanpa meniru LensBooth, serta kamera/editor bersih. Arah diperinci melalui chat “Pilih gaya visual Photoboost”. Batch berikut dibatasi pilot Home, CL-01 dan CL-06 desktop/mobile untuk review sebelum melanjutkan seluruh Solo. Detail di `07-visual-direction-solo-pilot.md`. Tidak mengubah keputusan Locked produk, palet, typography, framework/database atau milestone Flipbook.

# CHG-3.3A.002 — Material seluruh tampilan, 31 Oktober 2026

Pengguna menerima arah pilot dengan revisi material: paper grain utama, dot grid secukupnya, blur tipis hanya tekstur; terapkan pada seluruh tampilan Figma yang ada. Aktual: 31 screen, 23 board dan 24 master kartu template; 122 penempatan material, 113 grain/9 dot grid. Tujuh pemeriksaan native lulus; 44 zona foto/preview tetap tajam dan 1.630 layer konten menjaga properti sebelumnya. Parameter material v0.3 dicatat terpisah dari token Locked. Detail di `08-soft-materials-v0.3.md`. Tidak menambah klaim penyelesaian flow Solo/prototype, keputusan teknologi, atau timing Flipbook.


# CHG-3.4.001 — Duo Classic prototype dan status Tahap 3, 10 November 2026

Membuat versi lokal FigCraft v0.4 dari v0.3.2 tanpa menimpa sumber: jalur retake Guest-only, titik awal flow Host approval/rejection desktop/mobile, dan state Duo export desktop/mobile. Retake mempertahankan foto Host valid; export prototype menyimulasikan Loading/Error/Success serta retry tanpa koneksi file/backend. Delay 800 ms hanya untuk transisi presentasi prototype, bukan timing produk dan bukan nilai Flipbook. Rincian dan bukti ada di docs/09-stage3-batch-v0.4.md. Tidak ada keputusan Locked Tahap 1–2 yang diubah; FLIP-TEST-01 tetap setelah implementasi Classic.



# CHG-3.5.001 — Solo Classic prototype dan aset lokal, 10 November 2026

Dibuat file FigCraft v0.5 dengan jalur Solo desktop/mobile, state pemulihan retake/export, serta pilihan template. Starter pack aset Classic tersedia sebagai 12 template SVG, 3 frame, 8 sticker, dan 2 ilustrasi. Tidak mengubah keputusan Locked Tahap 1–2. Timing 800 ms hanya simulasi prototype Classic; FLIP-TEST-01 tetap ditunda. Detail dan bukti ada di `docs/10-stage3-batch-v0.5.md`. QA produk, sinkronisasi cloud, dan Gate-01–08 belum diklaim lulus.



# CHG-3.5.002 — Perbaikan QA prototype, 10 November 2026

File FigCraft v0.6 memperbaiki titik awal flow yang tersimpan di halaman salah serta dua interaksi Duo yang ganda. Keputusan produk Locked tidak berubah. Bukti dan batas QA ada di qa/figcraft-v0.6-qa.md; GATE-01 sampai GATE-08 belum dinyatakan lulus.


# CHG-3.6.001 — Handoff dan board QA v0.7, 10 November 2026

Dari v0.6 dibuat FigCraft v0.7 tanpa menimpa checkpoint: halaman 08 QA Handoff diberi board GATE-01–08, status parsial/siap review, dan daftar bukti yang masih diperlukan. Render board, handoff Classic, dan manifest SHA-256 disimpan di E:\WEB PHOTOBOOTH. FigCraft MCP melaporkan Fredoka dan DM Sans tersedia pada file yang dibuka. Review visual board dilakukan; prototype player, sesi pengguna, kamera, sinkronisasi dua perangkat, keyboard/screen reader, dan export runtime belum lulus. Tidak ada keputusan Locked Tahap 1–2 yang diubah. Framework/database tetap terbuka; FLIP-TEST-01 tetap setelah implementasi Classic.

# CHG-3.6.002 — Perbaikan playback Classic v0.8, 10 November 2026

Uji langsung di FigCraft desktop menemukan countdown/capture/sync pada prototype v0.7 memerlukan klik kanvas tambahan. Pada v0.8, 16 state sementara Solo/Duo desktop/mobile memakai afterDelay 800 ms menuju frame semula; dua state Guest retake mempertahankan afterDelay yang sudah ada dan kehilangan trigger klik ganda. Delapan belas frame dicek punya satu tujuan valid. Solo Desktop diuji dari Home sampai export success simulasi, dan Duo Host Desktop dari room sampai review pasangan. Delay hanya untuk presentasi prototype, tidak menetapkan timing capture produk atau Flipbook. Nama internal file diperbarui. Tidak ada keputusan Locked Tahap 1–2 yang diubah; gate final tetap menunggu bukti eksternal.

# CHG-3.6.003 — QA player mobile v0.8, 10 November 2026

File desain v0.8 tidak diubah. Flow Solo Mobile 390 dan Duo Guest Mobile 390 diuji di player FigCraft: state capture sementara maju otomatis hingga completion/review. Join room dan status Host pada Duo adalah simulasi, bukan koneksi dua perangkat. Bukti ditambahkan ke qa/figcraft-v0.8-player-qa.md dan handoff final. GATE-07 tetap parsial sampai sesi peserta dan uji aksesibilitas/perangkat.

# CHG-4.0-001 — Redesign Visual Direction & Design System, 13 November 2026

Perubahan disetujui pengguna dalam sesi brainstorming redesign UI/UX (13 November 2026) untuk menghilangkan kesan template dan membuat tampilan lebih modern, lega, dan interaktif (terinspirasi nuansa *zero-friction* & *interactive-first*):

- **Revisi `LOCK-03` & `LOCK-04` (Palet 6 Warna):** Mengganti palet lama (Linen/Sand/Lavender/Terracotta/Olive/Pink/Espresso) menjadi 6 warna terbatas:
  - **Cream** `#FAF7F2` (kanvas utama)
  - **Putih** `#FFFFFF` (surface card, base *glassmorphism*, canvas editor netral)
  - **Ink / Dark Charcoal** `#18181B` (teks utama, border, garis grid, shadow)
  - **Crisp Berry** `#C93B6B` (aksen utama: CTA & fokus aktif)
  - **Sky Mist** `#7AB3EF` (aksen sekunder: highlight, mode Duo, hover CTA sekunder, daun)
  - **Sage Green** `#7A9E7E` (status positif Ready/Aman & daun)
- **Revisi `LOCK-06` (Tipografi):** Mengganti `Fredoka` + `DM Sans` menjadi **`Outfit`** (Display/Heading) + **`Plus Jakarta Sans`** (Body/UI/Tombol).
- **Revisi `LOCK-09` & Material v0.3 (Latar, Glassmorphism & Interaksi Tombol):**
  - Latar belakang memakai **garis grid tebal** (`#18181B`, ketebalan ~`2 px` dengan blur halus ~`1 px`) di atas kanvas Cream, menggantikan paper grain & dot grid lama.
  - **Glassmorphism** diterapkan pada *floating header*, status pill, dan toolbar kamera/editor yang mengambang.
  - **Neobrutalism Modern (Flat-to-Lift & Forward Pop):** Tombol dan kartu **rata (flat, tanpa shadow)** saat diam. Tombol penting (Primary/Secondary CTA, Shutter, Export) **timbul ke depan tipis** (`scale` + shadow lembut) dan **berubah warna** saat hover; kartu preview & elemen sekunder terangkat ringan saat hover.
- **Tambahan Beranda (Seasonal Ambient):** Menambahkan efek musiman di halaman beranda menggunakan `falling-leaves/react` (`<FallingLeaves fullScreen />`) / `react-snowfall` sesuai bulan, dengan warna menyatu dengan palet, `pointer-events: none`, dan nonaktif otomatis untuk `prefers-reduced-motion`.
- **Tidak berubah:** Seluruh aturan produk (`LOCK-01`, `LOCK-02`, `LOCK-14`–`LOCK-20`: Classic First Solo → Duo, tanpa login/history permanen/public share link, 3/4 take, max 3 retake, reconnect 5 menit, editor netral, FLIP-TEST-01 setelah Classic).
