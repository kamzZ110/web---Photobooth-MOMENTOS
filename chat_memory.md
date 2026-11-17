# Chat Memory — Proyek Momentos Photobooth

Dokumen ini berisi rangkuman lengkap konteks, keputusan desain, fitur yang sudah dibangun, dan rencana lanjutan untuk proyek **Momentos Photobooth** (`E:\web---Photobooth-MOMENTOS`).

---

## 1. Informasi Proyek & Arsitektur

- **Lokasi Proyek:** `E:\web---Photobooth-MOMENTOS`
- **Struktur Monorepo:**
  - `apps/web` (`@momentos/web`) — Frontend React + TypeScript + Vite
  - `apps/server` (`@momentos/server`) — Backend HTTP + WebSocket RFC 6455 native Node.js (*stateless / in-memory*, **0 database permanen**)
  - `packages/shared` (`@momentos/shared`) — Kontrak tipe bersama, preset template, preset filter, aset stiker, dan protokol pesan WebSocket
- **Perintah Utama:**
  - `npm run dev` — Menjalankan frontend Vite (`http://localhost:5173`)
  - `npm run dev:server` / `npm run start:server` — Menjalankan backend WebSocket (`:4000`)
  - `npm run typecheck` — Pemeriksaan TypeScript (`tsc --noEmit`) pada `@momentos/web` dan `@momentos/server`
  - `npm run build` — Build produksi frontend ke `apps/web/dist/`

---

## 2. Aturan Desain & Prinsip Produk (Wajib Dipertahankan)

1. **Tema & Identitas Visual:**
   - *Warm Editorial Daylight* (Siang) dan *Cozy Starlight Night* (Malam) dengan aksen *Berry* (`#BC4374`), *Amber* (`#B6834D`), *Sage* (`#6E7F55`), *Sky* (`#7AB3EF`), dan garis tegas tinta (`#18181B`).
   - Animasi latar musiman ([SeasonalAmbient.tsx](apps/web/src/components/SeasonalAmbient.tsx)) di halaman info & beranda.
   - **Jangan mengubah template/preset/filter/stiker utama** kecuali diminta secara spesifik.
2. **Privasi & Tanpa Akun:**
   - Tidak memakai database permanen, tidak ada login/registrasi, tidak ada input nama pengguna, dan tidak ada galeri publik.
   - Sesi room Duo disimpan sementara di memori server dengan pembersihan otomatis (*TTL sweep*).

---

## 3. Ringkasan Fitur & Tahap yang Sudah Selesai

### A. Tahap 1 – 3: Fondasi UI, Preset, Kamera Asli & Render Canvas 2D
- **6 Preset Classic (`CLASSIC_TEMPLATE_PRESETS`):** *Strip 1x4*, *Grid 2x2*, *Polaroid Duo*, *Vintage Ticket*, *35mm Film Roll*, dan *Scrapbook Journal*.
- **8 Preset Filter Warna (`PHOTO_FILTER_PRESETS`):** *Natural*, *Warm Cream*, *Mono Ink*, *Soft Berry*, *Kodak Golden*, *Cool Fuji*, *Faded Matte*, dan *Purikura Pop*.
- **12 Aset Dekorasi (`DEFAULT_STICKER_LIBRARY`):** Kategori *Stiker*, *Emotikon*, *Stempel*, dan *Washi Tape*.
- **Kamera & Ekspor Nyata ([mediaEngine.ts](apps/web/src/lib/mediaEngine.ts)):**
  - Menggunakan `navigator.mediaDevices.getUserMedia` dengan fallback simulasi otomatis bila kamera tidak tersedia.
  - Kompositor Canvas 2D beresolusi tinggi untuk mengunduh file nyata `.PNG` & `.JPG` (Mode Classic) serta `.GIF` & `.MP4`/`.WEBM` (Mode Flipbook).

### B. Tahap 4 – 6: Backend Realtime, WebRTC Duo & Editor Kolaboratif
- **Realtime Room ([roomStore.ts](apps/server/src/roomStore.ts), [index.ts](apps/server/src/index.ts), [realtimeClient.ts](apps/web/src/lib/realtimeClient.ts)):**
  - Kode room unik `MMT-XXXX`, batas ketat **2 peserta** (`1 Host + 1 Guest`, peserta ke-3 ditolak dengan `ROOM_FULL`).
  - Token *rejoin* independen dengan jendela pemulihan **5 menit** (`REJOIN_WINDOW_MS`).
  - Sinkronisasi jam server (`clock:ping` / `clock:pong`) & *fallback* otomatis multi-tab lokal melalui `BroadcastChannel`.
  - Mendukung auto-join Guest lewat parameter link `?room=MMT-XXXX`.
- **WebRTC P2P & Capture Ganda:**
  - Negosiasi `RTCPeerConnection` (`offer`, `answer`, `ice`) dengan dukungan STUN dan toggle **Force TURN Relay**.
  - Saat *countdown* selesai, Host dan Guest mengambil frame resolusi tinggi dari kamera lokal masing-masing, lalu bertukar foto dalam potongan **16KB (`RTCDataChannel`)** agar tampil berdampingan **50:50 kiri-kanan** di preview & hasil cetak.
  - Alur permintaan *retake* oleh Guest dan persetujuan *real-time* oleh Host (kuota 3× per sesi).
- **Editor Kolaboratif & Personal Undo:**
  - State editor ber-versi (`editorVersion`) dengan penjagaan idempotensi `opId`.
  - **Personal Undo (`↩ Undo Host` / `↩ Undo Guest`):** Hanya membatalkan aksi milik peserta yang menekan Undo.
  - **Safe Pause on Disconnect (`pausedByDisconnect`):** Kanvas otomatis dijeda saat salah satu peserta terputus hingga kembali *rejoin*.

### C. Tahap 7: Hardening, Mobile Responsive, A11y & Deployment
- **Responsivitas & Aksesibilitas ([global.css](apps/web/src/styles/global.css), [App.tsx](apps/web/src/app/App.tsx)):**
  - Penyesuaian layout untuk tablet/HP (`<= 900px`, `<= 760px`, `<= 560px`), tautan lompat cepat `.skip-link`, dan dukungan `@media (prefers-reduced-motion: reduce)`.
- **Hardening & Dokumentasi Produksi:**
  - Batas buffer WebSocket `MAX_WS_BUFFER_BYTES = 4 MB`, *immutable room snapshots*, graceful shutdown `SIGINT`/`SIGTERM`, variabel lingkungan di [.env.example](.env.example), dan panduan deployment di [DEPLOYMENT.md](DEPLOYMENT.md).

### D. Penyempurnaan Alur Classic 4 Langkah & Perbaikan UI
- **Alur 4 Langkah Fokus:**
  1. `01. Pilih Mode` ([RoomScreen.tsx](apps/web/src/features/room/RoomScreen.tsx)): 3 kartu bersih (Solo, Duo langsung jadi Host tanpa input nama, Flipbook) + 1 baris *"Punya Kode Undangan Room?"* (fix kontras *Night Mode* memakai `card-tone-neutral`).
  2. `02. Pilih Frame` ([FrameSelectScreen.tsx](apps/web/src/features/classic/FrameSelectScreen.tsx)): Carousel *Photo Strips* & daftar *Instant & Kolase* + pilihan `3 Pose` / `4 Pose`.
  3. `03. Kamera` ([CameraScreen.tsx](apps/web/src/features/camera/CameraScreen.tsx)): Viewfinder tunggal/split 50:50 di tengah, thumbnail vertikal di kanan, tombol `🪞 Mirror` & popover `✨ Filter` (tanpa tombol `Webcam | Simulasi` dan tanpa ganti frame di kamera), serta tombol **Salin Kode** & **Salin Link Undangan** saat Duo.
  4. `04. Hasil & Edit` ([EditorScreen.tsx](apps/web/src/features/editor/EditorScreen.tsx)): Strip foto bersih *full-bleed* tanpa label `▶ 01A` / `POSE 01`, rasio foto tetap (`3:2` untuk strip, `4:3` untuk Polaroid/Grid/Scrapbook), panel **Customize Frame** dipisah menjadi 5 tab (`🎨 Warna`, `🖼️ Frame`, `✨ Stiker`, `✍️ Caption`, `🎞️ Filter`), serta stiker interaktif (`PlacedSticker`) yang bisa digeser, diubah ukuran, diputar, dan dihapus.

---

## 4. Rencana Pembenahan & Fitur Lanjutan (Belum Dieksekusi)

Berdasarkan diskusi terakhir, berikut poin-poin yang siap dikerjakan pada sesi berikutnya **tanpa mengubah template desain utama**:

1. **Hapus Pill Duplikat di Navbar Atas ([GlassHeader.tsx](apps/web/src/components/GlassHeader.tsx)):**
   - Menghapus `BOOTH_FLOW_TABS` (`01. Mode`, `02. Frame`, `03. Kamera`, `04. Hasil & Edit`, `Flipbook ✨`) dari pojok kanan atas header agar navbar tetap sebaris dan tidak bertumpuk dengan stepper halaman.
2. **Handle Tarik Sudut pada Stiker ala Canva ([EditorScreen.tsx](apps/web/src/features/editor/EditorScreen.tsx)):**
   - Menambahkan *drag corner handle* langsung di kotak stiker yang terpilih pada kanvas photostrip untuk *resize* interaktif langsung di atas foto (melengkapi *drag-to-move*, slider, dan hapus `×`).
   - Pastikan browser di-**Hard Refresh (`Ctrl + Shift + R`)** saat menguji agar cache versi lama hilang.
3. **Page Khusus & Alur 6 Langkah Mode Flipbook ([FlipbookScreen.tsx](apps/web/src/features/flipbook/FlipbookScreen.tsx) & [mediaEngine.ts](apps/web/src/lib/mediaEngine.ts)):**
   - **Langkah 1 — Cara Kerja & Showcase Contoh Efek:** Tutorial singkat + kartu efek interaktif; saat diklik langsung memutar preview contoh flipbook dari efek tersebut.
   - **Langkah 2 — Pilih Mode (Solo / Duo):** Konsisten dengan Classic (Host dengan Salin Kode & Link, Guest join tanpa input nama).
   - **Langkah 3 — Pilih Tema Buku, Efek & Filter Warna** sebelum masuk kamera.
   - **Langkah 4 — Take Flipbook:** Kamera bersih hanya dengan `🪞 Mirror`, merekam **`60 frame` selama `10 detik` (`6 FPS`, `~166 ms`/frame)** pada resolusi **`420 × 315` px**.
   - **Langkah 5 — Preview & Take Ulang:** Pemutar loop + slider halaman manual + batas **maksimal 3× uji coba ulang**.
   - **Langkah 6 — Unduh `.GIF` Buka Buku Cepat:**
     - Frame pembuka berupa **Cover Buku tanpa gambar foto** (desain sampul tema + jilid spiral kiri + judul tema + `MOMENTOS FLIPBOOK • 2026`).
     - Dilanjutkan animasi membuka buku cepat membalik **Frame 1 s/d Frame 60** di kecepatan **~12 FPS (`85 ms`/halaman)**.
     - Encoding LZW `.GIF` dibuat **async bertahap** dengan indikator progres `%` agar tab browser tidak *freeze*.
