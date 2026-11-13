# WEB ASELOLE — Product Requirements Document

Versi draft 0.1 · 11 November 2026 · Status: siap ditinjau; bukan persetujuan baru. Pemilik keputusan: pengguna. Decision Log master: `design-library/docs/DECISION-LOG.md`. Acuan status sumber: `design-library/docs/13-stage2b-task1-source-audit.md`.

## 1. Tujuan dan batas

WEB ASELOLE adalah pengalaman photobooth web untuk membuat dan mengedit hasil foto Classic secara Solo atau bersama melalui Duo. Produk memprioritaskan pengalaman yang mudah dipahami, hasil foto yang tetap jelas, dan pemulihan ketika proses terganggu. Rumusan ini merangkum fungsi yang ada, bukan klaim riset pasar. Sasaran bisnis, metrik keberhasilan, target pengguna rinci dan jadwal rilis: [TBD].

Roadmap MAIN CHAT menempatkan desain dan dokumentasi pada Tahap 2/2B dan arsitektur/persiapan teknis pada Tahap 3. Nama file FigCraft historis Stage3 tidak mengubah roadmap. Keputusan UX/UI Specification Final v1 sebelumnya terkunci; kelengkapan dokumen, QA, dan persetujuan paket desain merupakan status terpisah.

## 2. Ruang lingkup

Classic First: selesaikan Solo, kemudian Duo. Cakup pemilihan booth, persiapan kamera, 3 atau 4 take (default 4), review dan retake, pemilihan template, editor, preview dan export PNG/JPG. Duo memiliki Host dan Guest, kesiapan kedua pihak, pasangan foto, approval retake Guest dan recovery. Strip/Grid serta variasi termasuk Polaroid polos tercatat pada audit sumber. Guided/Freestyle tercatat sebagai keputusan produk; rincian penerapannya [TBD: cocokkan sumber asli].

Flipbook memiliki konsep/flow dan delapan preset awal yang tercatat, tetapi high fidelity serta timing ditunda. FLIP-TEST-01 dilaksanakan setelah implementasi Classic; durasi, frame rate dan mekanisme capture belum ditentukan. Marketplace merupakan kemungkinan kemudian, bukan komitmen MVP. Tidak ada login, riwayat permanen, atau public share link dalam scope tercatat (LOCK-18).

## 3. Peran dan perjalanan utama

Solo: pengguna memulai, menyiapkan kamera, mengambil dan meninjau foto, memilih template, mengedit dan mengunduh. Duo: Host mengelola sesi; Host dan Guest bersiap, menghasilkan pasangan foto dan mengikuti alur review/edit. Detail urutan screen dan hak setiap aksi memerlukan pencocokan terhadap sumber flow asli. `ALUR-PRODUK.md` adalah ringkasan rekonstruksi, bukan salinan wireframe atau flow master yang hilang.

## 4. Kebutuhan fungsional

| ID | Kebutuhan | Acuan | Status |
|---|---|---|---|
| FR-01 | Sediakan alur Classic Solo dengan 3/4 take, default 4. | LOCK-14 | Keputusan terkunci; runtime belum diuji |
| FR-02 | Retake maksimal 3 per foto; kegagalan teknis tidak menggunakan kuota. Foto valid sebelumnya tetap aman pada recovery. | LOCK-14, LOCK-17 | Terkunci; runtime belum diuji |
| FR-03 | Duo mensyaratkan Ready kedua pihak dan mempertahankan 3/4 pasangan foto Host + Guest. | LOCK-15/16 | Prototype simulasi tersedia |
| FR-04 | Retake Guest memerlukan persetujuan Host; sesudah persetujuan, keduanya Ready ulang dan hanya Guest retake. | LOCK-15 | Prototype simulasi tersedia |
| FR-05 | Saat disconnect, edit bersama dijeda dan rejoin tersedia maksimal 5 menit. | LOCK-16 | Runtime belum diuji |
| FR-06 | Editor menyediakan pilihan template dan dekorasi; permukaan foto/canvas tetap netral. | LOCK-13; inventaris aset | Detail kontrol cocokkan sumber |
| FR-07 | Export PNG/JPG dengan snapshot awal dan retry; hasil valid sebelumnya aman; download tidak otomatis menutup sesi. | LOCK-17 | Prototype simulasi; file nyata belum diuji |
| FR-08 | Status, loading, error, disabled dan recovery yang relevan dijelaskan kepada pengguna. | LOCK-11, LOCK-20 | Review lengkap masih diperlukan |

Daftar ini baseline, bukan pengganti matriks requirement → acceptance criteria → test case pada Task 4. Detail ID P04/P05 belum ditemukan dan tidak boleh ditebak.

## 5. Privacy dan penanganan media

Yang tercatat: tidak ada login, riwayat permanen atau public share link; media bersifat sementara selama sesi dan pengguna menyimpan hasil melalui download. Hak pengguna terhadap izin kamera dan pemberitahuan pemrosesan harus dapat dijelaskan dalam rancangan. [TBD] teks dan bentuk consent, kondisi dan waktu retensi/penghapusan, perilaku saat tab ditutup, crash, disconnect atau export gagal, serta apakah dan media apa yang melewati server. Semua [TBD] harus diselesaikan melalui review produk dan penilaian teknis sebelum implementasi; tidak menyatakan jaminan privasi yang belum terbukti. Lokasi penyimpanan dan mekanisme teknis diputuskan pada tahap teknis.

## 6. Pengalaman dan aksesibilitas

Gunakan Warm Playful Retro; paper grain halus sebagai tekstur utama dan dot grid secukupnya. Blur hanya tekstur latar/kartu; teks, kontrol, kamera dan foto tetap tajam. Komposisi orisinal dan tidak meniru LensBooth. Kamera/editor bersih. Rincian tokens dan ukuran ada di `PANDUAN-DESAIN.md` dan sumber tokens proyek. Keyboard, focus visible, kontras, target sentuh, reduced motion dan pembaca layar perlu ditinjau; kelayakan runtime tidak dibuktikan oleh mockup.

## 7. Validasi dan risiko

Prototype FigCraft v0.8 memiliki bukti player Solo Desktop, Solo Mobile, Duo Host Desktop dan Duo Guest Mobile; Duo dan export merupakan simulasi. Usability peserta, seluruh ukuran layar, aksesibilitas dan sign-off GATE-01–08 belum selesai. Runtime kamera, dua perangkat, reconnect, retake, kehilangan data dan ekspor aktual diuji setelah implementasi. Lihat `design-library/qa/figcraft-v0.8-player-qa.md` dan `classic-usability-accessibility-v0.6.md`.

Risiko utama: sumber DOC-02/03/06 dan detail P04/P05 hilang; detail privacy belum ditetapkan; desain prototype belum membuktikan perilaku runtime; lisensi aset dan cakupan visual masih perlu review. Keputusan baru atau revisi Locked harus ditambahkan ke Decision Log dengan dampak dan persetujuan, bukan diam-diam mengubah baseline.

## 8. Pertanyaan terbuka dan kriteria draft

[TBD] metrik, rincian persona, consent dan lifecycle media, browser support, resolusi export, detail Guided/Freestyle, detail P04/P05, dan sumber asli alur/wireframe. Framework, database, storage, realtime/signaling dan performa merupakan pertanyaan tahap teknis. Draft ini selesai disusun jika sumber dapat dilacak dan gap tercatat; dokumen baru menjadi final setelah review pengguna dan penyelesaian gap yang diperlukan.

## 9. Matriks acceptance criteria dan test case Classic

Sumber ID: Bagian 10 pada percakapan `6ae239c7-29f0-83ec-9c56-df835fa587e4`, persetujuan turn `e555dc78-1293-4bb3-8312-1b7775ae158a`. Test case di bawah disusun untuk verifikasi, bukan hasil lulus. Prototype v0.8 bersifat simulasi. Jalankan kasus pada state normal, loading, disabled, error dan recovery yang relevan; simpan perangkat, langkah, hasil aktual dan bukti untuk tiap hasil.

| AC | Kondisi → hasil yang diwajibkan | Test case / bukti dibutuhkan |
|---|---|---|
| AC-CL-01 | Camera Setup → izin dan preview ditangani | Izinkan/tolak izin, coba kamera tidak ada dan pulihkan; runtime |
| AC-CL-02/03 | Default 4; pilihan 3 → 3 slot | Jalankan default dan pilihan 3, hitung slot dan foto; runtime |
| AC-CL-04 | Filter diganti → hanya take baru terpengaruh | Bandingkan take sebelum/sesudah penggantian; runtime |
| AC-CL-05/06/07 | Capture valid → Keep/Retake; maksimal 3 retake/foto; gagal teknis tanpa penalti | Uji batas 3, gagal teknis dan integritas hasil lama; runtime |
| AC-CL-08 | Semua take disetujui → gallery/editor tersedia | Review semua slot dan lanjut; prototype navigasi ada, validasi runtime menunggu |
| AC-ED-01/02 | Strip→Grid menjaga foto; Polaroid tetap satu komposisi 3/4 take | Ganti layout untuk 3 dan 4 foto, cocokkan semua slot. FigCraft Classic v0.9 menampilkan contoh 3/4 take pada kartu Strip, Grid, dan Polaroid. Perilaku penggantian layout dan integritas hasil tetap memerlukan uji aplikasi |
| AC-ED-03/04 | Sticker terikat mengikuti foto; dekorasi keluar canvas → Auto Adjust atau Undo | Ikat sticker, ganti layout; dorong dekorasi keluar lalu pulihkan; runtime |
| AC-ED-05/06 | Filter foto 2 menjaga foto lain/asli; drag menggambar hanya dalam Drawing Mode | Bandingkan foto dan source; lakukan drag dengan mode aktif/tidak aktif; runtime |
| AC-ED-07/08 | Undo/Redo aman mengikuti history personal; kembali dari preview menjaga editing dan hasil | Edit berurutan, undo/redo, preview lalu kembali; runtime |
| AC-DC-01/02 | Host mendapat link/kode; Guest mengikuti mode Host | Buat room dan gabung dari perangkat kedua; runtime |
| AC-DC-03 | Salah satu belum Ready → capture tidak mulai | Uji Host saja, Guest saja dan keduanya Ready; prototype simulasi, runtime menunggu |
| AC-DC-04/05/06 | Retake Guest menunggu Host; setuju → Ready ulang, Guest-only; tolak → foto valid tetap | Jalankan setuju/tolak, periksa kuota dan foto kedua pihak; prototype simulasi, runtime menunggu |
| AC-DC-07/08 | Satu elemen diedit satu pengguna; syncing/unsynced terlihat | Dua perangkat memilih objek sama dan tunda sinkron; runtime |
| AC-DC-09/10 | Disconnect → tahap/edit bersama dijeda; >5 menit → Duo berakhir sesuai aturan hasil selesai | Putuskan saat edit; coba rejoin sebelum/sesudah batas dan cek hasil; runtime; detail aturan hasil [TBD] |
| AC-EX-01/02/03 | PNG/JPG valid dari komposisi; export memakai snapshot awal | Unduh kedua format, edit ketika export berjalan, periksa isi file; runtime |
| AC-EX-04/05/06 | Gagal → retry; download tidak menutup sesi; Host menutup → kedua user diberi kesempatan simpan | Simulasi gagal, retry, unduh dan tutup room dengan dua user; runtime |

Flipbook AC-FB-01–14 tetap berlaku sesuai sumber: preset/preview, kompatibilitas efek, Guided/Freestyle, review/retake sequence, reconnect dan export GIF/MP4. Kriteria bergantung timing dan mekanisme menunggu FLIP-TEST-01 setelah implementasi Classic. Jangan menandai lulus sebelum pengujian. Responsif/aksesibilitas: portrait/landscape, tablet, 320/390/768/1024/1440, zoom 200%, keyboard/focus, screen reader, reduced motion, target sentuh dan kontras; lihat skrip `design-library/qa/classic-usability-accessibility-v0.6.md`.
## 10. Kasus uji Flipbook

Sumber AC mengikuti Bagian 10 yang dirujuk pada matriks Classic. Semua kasus menunggu fase Flipbook. FLIP-TEST-01 dilakukan setelah implementasi Classic untuk menentukan durasi dan mekanisme capture.

| AC | Kasus uji dan hasil yang diharapkan |
|---|---|
| AC-FB-01/02 | Buka galeri dan hitung delapan preset awal. Buka contoh preview dan pastikan capture tidak dimulai. |
| AC-FB-03/04 | Ganti preset di Explore dan periksa preview. Pilih efek tidak kompatibel dan periksa penanda serta arahan penyesuaian. |
| AC-FB-05/06 | Coba mulai saat preview belum siap. Ganti Guided/Freestyle dan periksa preset serta efek yang kompatibel tetap tersedia. |
| AC-FB-07/08 | Selesaikan capture valid dan buka Sequence Review. Retake harus merekam ulang seluruh sequence. |
| AC-FB-09/10 | Gagalkan replacement secara teknis dan periksa hasil valid serta kuota tetap utuh. Selesaikan retake valid kedua dan periksa batas retake serta ketersediaan hasil. |
| AC-FB-11 | Putuskan dan sambungkan ulang Duo. Periksa pemulihan status sesi serta Ready ulang sesuai kondisi. |
| AC-FB-12/13 | Selesaikan GIF dan gagalkan MP4, lalu periksa GIF tetap tersedia dan MP4 bisa Retry. Export kedua format dari sequence yang sama. |
| AC-FB-14 | Kembali ke Explore dan periksa hasil valid serta kuota tetap utuh. |
