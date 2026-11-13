# Rencana pembuktian dan backlog

Belum ada tes implementasi yang dilakukan dalam penyusunan dokumen ini. Semua item di bawah adalah **rencana**, bukan hasil lulus. Catat browser/versi, OS/perangkat, jaringan, langkah, waktu, hasil, bukti dan batas pada setiap uji.

## Spike yang perlu dilakukan

| ID | Pertanyaan dan pengujian | Hasil yang dicari |
|---|---|---|
| S1 Kamera | Izin diberikan/ditolak, kamera hilang/berganti, refresh dan background di desktop/Android/iPhone | Preview dapat dipulihkan atau error dan aksi berikutnya jelas; tentukan matriks dukungan. |
| S2 WebRTC | Dua perangkat dan jaringan berbeda; paksa TURN relay; ganggu koneksi | Video tersambung atau kegagalan tertangani; ukur relay, latency dan penggunaan bandwidth. |
| S3 Classic | Ready, countdown 3 detik, local capture di perangkat campuran dan kondisi lambat | Catat distribusi selisih estimasi, kegagalan dan pengalaman pengguna. 200–300 ms hanya ide uji, bukan syarat lulus yang disetujui. |
| S4 Transfer | Foto dua arah, ukuran berbeda, koneksi terputus dan timeout, DataChannel versus storage privat | Buktikan integritas, batas memori/waktu, dan ulang capture jika gagal. Pilih jalur yang mendukung target recovery. |
| S5 Rejoin | Refresh, tutup/buka, putus sebelum dan mendekati 5 menit; hapus data browser sebagai kasus negatif | Snapshot dan media pulih jika tersedia; tampilan jelas bila tidak. Uji server restart sebagai sesi baru. |
| S6 Editor | Bersamaan edit objek sama; hapus/edit; undo personal setelah edit pengguna lain; reconnect | Kedua dokumen konvergen, tidak kehilangan perubahan diam-diam, personal undo aman atau batasnya ditangani jelas. Validasi UX tanpa kewajiban lock. |
| S7 Lifecycle | Berakhir, manual delete, TTL satu jam, crash, lokal untuk edit pribadi | Tunjukkan cleanup server dan cakupan lokal; selesaikan aturan yang belum diputuskan sebelum menetapkan pass. |
| S8 Classic export | PNG/JPG snapshot, filter/crop, ganti layout, error dan retry, kedua perangkat | File valid dan konsisten pada versi sama; hasil lama terlindungi; uji resolusi/ukuran. |
| FLIP-TEST-01 | Setelah Classic: 3 s, 10 fps, 720 px sebagai titik awal; preset preview dan hasil; perangkat berbeda | Ukur frame drop, memory, durasi, sync, file size dan UX; revisi target sebelum final. |
| S10 Flipbook export | GIF dan MP4 di Chrome/Safari/Edge serta perangkat prioritas | Uji hasil nyata, codec, encoding, fallback MP4, durasi proses dan sumber daya; rencana tambahan bila tidak lolos. |
| S11 Kapasitas | Simulasikan 5–10 room bersamaan termasuk trafik TURN dan reconnect | Ukur konsumsi dan biaya; angka perencanaan bukan jaminan kapasitas. |

## Kriteria MVP yang harus dibuktikan

- Classic Solo: izin dan error kamera, 3/4 take, review, batas retake, original aman, template/editor, PNG/JPG valid, recovery dan aksesibilitas sesuai kebutuhan.
- Classic Duo: dua perangkat berbeda, kedua Ready, hanya Host mulai countdown 3 detik, foto lokal pada target bersama, transfer lengkap, retake Guest sesuai approval, gagal teknis tanpa penalti.
- Editor: perubahan real-time, konflik terselesaikan, undo personal, sinkronisasi terlihat, ekspor snapshot, hasil versi sama konsisten; pause/rejoin sampai 5 menit diuji.
- Privasi: waktu retensi dan delete yang sudah diputuskan benar-benar diterapkan dan diverifikasi; izin kamera dan informasi media sesuai implementasi; tanpa isi media dalam log.
- Flipbook: preset preview/capture, pose, burst, sequence, retry, GIF dan MP4 nyata serta fallback/browser target dibuktikan. Kriteria angka ditetapkan setelah FLIP-TEST-01.
- Jalankan pengujian aksesibilitas keyboard/focus, reduced motion, kontras, zoom, target sentuh, screen reader dan viewport; draft menyebut 320/390/768/1024/1440, termasuk portrait/landscape. Jangan menyebut lulus tanpa bukti.

## Backlog implementasi berurutan

| Tahap | Pekerjaan | Selesai jika |
|---|---|---|
| 0. Konsolidasi | Temukan sumber Tahap 1/master/design; review konflik dan pertanyaan pada dokumen 01; tetapkan aturan yang menghambat. | Sumber yang ditemukan tercatat, perubahan Locked ditangani dengan persetujuan, gap tetap eksplisit. |
| 1. Fondasi | Tentukan lokasi repo, setup toolchain, TypeScript, frontend/backend, shared contracts, lint/typecheck/build dan CI. | Proyek lokal dan staging dasar berjalan; tidak ada secret di Git. |
| 2. Classic Solo | Kamera, setup, capture, review/retake, template, editor, ekspor dan error. | Kriteria Solo dan uji relevan lulus. |
| 3. Kelayakan Duo | S1–S5: signaling, WebRTC, TURN, waktu, transfer dan rejoin. | Hasil dan keputusan storage tercatat; celah tidak ditutupi klaim. |
| 4. Classic Duo | Room, Host/Guest, state machine, capture, retake, recovery dan sinkronisasi. | Uji dua perangkat dan jaringan, kegagalan dan hak peran lulus. |
| 5. Editor kolaboratif | S6, state berversi, operasi/undo, snapshot, pasca-sesi personal dan lifecycle. | Konsistensi, konflik dan ekspor dibuktikan; gap lifecycle diselesaikan. |
| 6. Flipbook | FLIP-TEST-01 lalu preset, burst, pose, review/retry, GIF/MP4. | Angka disepakati berdasarkan bukti dan ekspor diuji lintas browser. |
| 7. Rilis uji privat | Hosting HTTPS, TURN, batas penggunaan, privacy, logs, aksesibilitas, monitoring dan capacity test. | Checklist dan bukti tersimpan; pengguna menyetujui kesiapan uji privat. |

Urutan spike dapat berjalan lebih awal jika membantu mengurangi risiko. Tidak ada klaim semua tugas harus selesai sebelum eksperimen teknis kecil, tetapi implementasi Flipbook mengikuti Classic First.

## Catatan review sebelum Tahap 3 dikunci

Tinjau pertanyaan pada `01-KONTEKS-DAN-KEPUTUSAN.md`, terutama retensi 1 jam, cakupan hapus, Guest timeout dan konflik editor versus draft lama. Periksa sumber yang hilang dan minta persetujuan pengguna atas perubahan terkait. Catat keputusan baru beserta tanggal, dampak, sumber dan status uji; Decision Log master tersedia di folder design-library/docs; catat revisi yang disetujui di sana setelah review, dan jangan mengklaim sudah diperbarui sebelum perubahan dilakukan.

