# Alur produk — ringkasan kerja

Status: rekonstruksi dari audit dan Decision Log, bukan salinan DOC-02/03/06 asli yang belum ditemukan. Sumber: `design-library/docs/13-stage2b-task1-source-audit.md` dan `DECISION-LOG.md`. Periksa detail dan urutan terhadap sumber asli sebelum final. P04/P05 tetap [TBD].

## Solo Classic

Home → pilih Solo/Classic → persiapan kamera dan 3/4 foto → capture → review/retake → template → editor → preview → export. Default 4; maksimal 3 retake per foto dan kegagalan teknis tidak mengurangi kuota. Hasil sebelumnya tetap aman saat kegagalan. Jalur prototype desktop telah dimainkan sampai export sukses simulasi; mobile sampai review. Seluruh perangkat dan recovery belum diuji dengan peserta.

## Duo Classic

Host membuat/mengelola sesi; Guest bergabung → kedua pihak Ready → capture menghasilkan pasangan Host dan Guest → review → editor/preview/export. Retake Guest meminta approval Host; jika disetujui kedua pihak Ready ulang dan hanya Guest retake. Saat disconnect editing bersama dijeda; rejoin maksimal 5 menit. Status sinkron dan recovery harus terlihat. Prototipe menggunakan status pihak lain yang disimulasikan; tidak membuktikan jaringan atau dua perangkat.

## Recovery dan batas hasil

Jelaskan error dan tindakan pemulihan; pertahankan foto/hasil valid sebelumnya pada retake dan export gagal. Export PNG/JPG memiliki snapshot awal dan retry; unduh tidak otomatis menutup sesi. Detail siklus media, kondisi penyimpanan dan penutupan sesi [TBD]. Jangan menyatakan sesi benar-benar dipulihkan sebelum uji implementasi.

## Flipbook

Konsep dan preset awal tercatat dalam sumber. Alur master empat mode dan rincian aslinya belum ditemukan. High fidelity/prototype dan FLIP-TEST-01 mengikuti implementasi Classic; durasi dan mekanisme belum ditentukan.

## Pekerjaan lanjutan

Susun diagram DOC-02 dan swimlane DOC-03 dengan aktor, state, cabang, recovery dan tautan ke keputusan. Verifikasi screen inventory dan wireframe DOC-06 dari sumber primer. Tandai cabang yang belum memiliki bukti [TBD] dan kirim untuk review, bukan mengarang keputusan.

## Alur dan swimlane kerja Classic — 11 November 2026

Berikut rekonstruksi dari Bagian 10 percakapan sumber `6ae239c7-29f0-83ec-9c56-df835fa587e4`, disetujui pada turn `e555dc78-1293-4bb3-8312-1b7775ae158a`; bukan salinan diagram asli. P01 Home, P02 Booth Selection, P03 Duo Room, P06 Help dan CL-01–07 mengikuti `04-handoff-open-questions.md`. P04/P05 dan detail wireframe asli tetap [TBD].

| Tahap | Pengguna Solo / Host | Guest | Sistem dan recovery |
|---|---|---|---|
| Masuk | Pilih Classic Solo; atau Host buat room dan berikan link/kode | Masuk melalui undangan, mengikuti mode Host | Status waiting, join error dan connected ditampilkan; format kode [TBD] |
| Kamera | Pilih 3/4 take (default 4), filter dan persiapan | Menyiapkan kamera pada mode Host | Izin/preview dan error ditangani; perubahan filter hanya untuk take berikutnya |
| Ready | Solo mulai; Host Ready pada Duo | Guest Ready | Duo tidak mulai jika satu pihak belum Ready |
| Capture/review | Keep/retake foto; max 3 retake per foto | Meminta retake kepada Host | Kegagalan teknis tidak mengurangi kuota; foto valid sebelumnya tetap aman |
| Keputusan retake | Host menyetujui atau menolak | Tunggu keputusan; jika setuju, Ready ulang bersama dan hanya Guest retake | Penolakan mempertahankan foto Guest valid; jaga pasangan Host/Guest |
| Template/editor | Pilih Strip/Grid/Polaroid dan edit | Berpartisipasi dalam editor Duo | Foto tetap ada saat ganti layout; sticker terikat mengikuti foto; konflik elemen memakai occupied, perubahan tertunda ditandai syncing/unsynced |
| Disconnect | Editing bersama dijeda | Coba rejoin | Status reconnect; lebih dari 5 menit Duo berakhir sesuai aturan hasil selesai. Detail penyelamatan hasil [TBD sumber] |
| Preview/export | Pilih PNG/JPG atau kembali edit; Host dapat menutup sesi | Menyimpan hasil siap | Export menggunakan snapshot awal, retry saat gagal, unduh tidak menutup sesi. Saat Host menutup, kedua pengguna diberi kesempatan menyimpan hasil siap |

Screen state yang harus ditinjau per desktop/mobile: P03 join default/loading/error, waiting/connected/reconnecting/ended; CL-01 permission/preview/error; CL-02 not-ready/one-ready/both-ready; CL-03 countdown/capturing/failure; CL-04 keep/retake/limit/approval/reject; CL-05 pilihan template; CL-06 active/selected/occupied/unsynced/reconnecting; CL-07 default/loading/error/success/retry. Daftar ini merupakan sasaran review, bukan pernyataan semua state berfungsi.

Responsive awal: mobile <768 px, tablet 768–1199 px, desktop ≥1200 px; diuji dan disesuaikan saat high fidelity. Editor mobile memerlukan zoom/pan dan panel yang menjaga konteks preview; tablet canvas dominan dengan properties yang bisa diciutkan. Perlu alternatif posisi objek selain drag, focus keyboard, dan reduced motion sesuai keputusan 9.4.
