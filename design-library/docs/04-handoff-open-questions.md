# Handoff library dan pekerjaan terbuka

Paket 3.1 menyediakan fondasi dan komponen Classic lokal serta native Figma. Status terbaru adalah **native dibuat dan 17 pemeriksaan library lulus**; lihat `05-native-figma-handoff.md`. Handoff ini tidak menyatakan high-fidelity, prototype, implementasi Classic, usability testing, atau keseluruhan Tahap 3 sudah selesai.

| Inventaris sumber | Screen yang harus dibuat pada fase berikutnya |
|---|---|
| Shared | P01 Home; P02 Booth Selection; P03 Duo Room; P06 Help |
| Supporting | SUP-01 Camera Permission/Error; SUP-02 Reconnect/Session Ended |
| CL-01 | Camera Setup: preview, filter, 3/4 take |
| CL-02 | Duo Ready Check |
| CL-03 | Countdown & Capture: retry teknis, progress |
| CL-04 | Photo Review: Keep/Retake/Host approval |
| CL-05 | Template Gallery: Strip/Grid/Polaroid |
| CL-06 | Editor: tools/canvas/properties dan kolaborasi |
| CL-07 | Final Preview & Export: PNG/JPG, Back to Editor |
| FB-01–FB-07 | Dicatat untuk tahap Flipbook; belum dibuat dan tidak menetapkan durasi |

Detail asli sitemap P04/P05 dan wireframe lengkap tidak muncul pada percakapan yang dapat dibaca. Jangan menetapkan pemetaan baru hanya untuk mengisi kekosongan. Semua screen memerlukan desktop/mobile dan state relevan sebelum dianggap selesai.

| Referensi acceptance criteria Locked | Cakupan sumber library 3.1 | Bukti produk yang masih diperlukan |
|---|---|---|
| AC-CL-01–08 | Permission/error, 3/4 default 4 pada aturan, capture/review, kuota dan retry | Kamera nyata, capture valid, batas retake dan recovery |
| AC-ED-01–08 | Tool/object/properties, canvas netral, occupied/unsynced dan copy recovery | Pergantian layout tanpa kehilangan foto, photo-attached decoration, auto-adjust/undo, original/filter, drawing, personal undo dan kembali dari preview |
| AC-DC-01–10 | RoomCode, Ready Host/Guest, approval, status Duo, voice dan reconnect | Dua perangkat nyata, room invite, host authority, paired photos, lock, sync, recovery dan batas 5 menit |
| AC-EX-01–06 | Format PNG/JPG dan Default/Loading/Error/Success | File valid, snapshot awal, retry, hasil lama aman, sesi tetap terbuka setelah download |
| AC-FB-01–14 | Hanya dicatat sebagai kebutuhan berikutnya | Prototype Flipbook dan FLIP-TEST-01 setelah implementasi Classic |

Tidak satu pun acceptance criterion produk dinyatakan lulus hanya karena specimen ada.

| Quality gate | Status berdasarkan bukti saat ini | Yang belum terpenuhi |
|---|---|---|
| GATE-01 Tidak ada kontradiksi | Diperiksa terhadap ringkasan Locked yang tersedia | Review menyeluruh dengan sumber Tahap 1 dan wireframe asli |
| GATE-02 Semua screen Classic punya normal/error/recovery | Belum terpenuhi | Screen high-fidelity belum dibuat |
| GATE-03 Wireframe desktop/mobile dan responsivitas | Belum terverifikasi sebagai file | Wireframe asli dan pengujian screen nyata |
| GATE-04 Referensi komponen/tokens | Referensi lokal/native tersedia; audit struktur dan binding lulus | Review resize pada screen nyata masih mengikuti produksi high-fidelity |
| GATE-05 Acceptance criteria dapat diuji | Referensi AC tersedia di sumber | Test cases produk lengkap dan execution belum dilakukan |
| GATE-06 Aset prototype tersedia | Sebagian: font dan ikon UI | Template, decoration, frame/background dan screen |
| GATE-07 Prototype utama ditinjau | Belum terpenuhi | Solo/Duo prototype dan review |
| GATE-08 Isu teknis terbuka tercatat | Tercatat di bawah | Penyelesaian pada tahap teknis sesuai kebutuhan; tidak dipaksa sekarang |

| ID tetap terbuka | Topik | Waktu penyelesaian |
|---|---|---|
| OPEN-01 | Framework frontend/backend | Perencanaan teknis |
| OPEN-02 | Database dan session storage | Perencanaan teknis |
| OPEN-03 | Realtime Duo/voice | Perencanaan teknis |
| OPEN-04 | Durasi dan mekanisme capture Flipbook | FLIP-TEST-01 setelah implementasi Classic selesai |
| OPEN-05 | Nama/desain/parameter delapan preset | Produksi aset dan prototype Flipbook |
| OPEN-06 | Varian template Classic lengkap | Produksi aset Classic |
| OPEN-07 | Ukuran final canvas/resolusi export | Prototype visual dan validasi kualitas |
| OPEN-08 | Performa, perangkat dan browser support | Perencanaan teknis dan QA |
| OPEN-09 | Copywriting, ilustrasi dan Help final | High-fidelity/content |

Prioritas lanjutan: verifikasi native library 3.1, shared screens 3.2, Solo Classic 3.3, Duo Classic 3.4, aset 3.5, prototype 3.6, usability/accessibility/handoff 3.7. FLIP-TEST-01 tetap sesudah implementasi Classic, bukan sesudah file design library selesai.

Pemeriksaan lokal meliputi token/alias, warna persis, nilai Locked, sintaks, aset/font dan kontrak generator terisolasi. Laporan QA harus menyatakan mana yang otomatis, mana yang diperiksa visual di browser, dan mana yang belum diuji di Figma atau produk.


## Status batch 3.5 — 10 November 2026

Prototype Solo Classic desktop/mobile dan starter pack aset Classic tersedia di FigCraft v0.5. Dua paket Tahap 3 yang tersisa adalah usability/accessibility/responsive/product QA dan penyelesaian handoff DOC, acceptance criteria, backup/sync evidence, serta GATE-01–08. Rincian dan bukti: `docs/10-stage3-batch-v0.5.md`. Framework/database tetap open question; FLIP-TEST-01 belum boleh dilakukan sebelum implementasi Classic selesai.

