# WEB ASELOLE — Handoff Tahap 1–3 untuk AI dan developer

Status: **paket kerja untuk review pengguna**, 12 November 2026. Keputusan dalam percakapan sudah disetujui pengguna; rancangan implementasi dan target uji belum terbukti. Paket ini tidak menyatakan seluruh sumber Tahap 1–2 lengkap atau seluruh keputusan lama telah diaudit.

## Mulai dari sini

1. Baca file ini dan [01-KONTEKS-DAN-KEPUTUSAN.md](01-KONTEKS-DAN-KEPUTUSAN.md).
2. Baca [02-ARSITEKTUR.md](02-ARSITEKTUR.md) dan [03-ALUR-DAN-KONTRAK.md](03-ALUR-DAN-KONTRAK.md).
3. Gunakan [04-VALIDASI-DAN-BACKLOG.md](04-VALIDASI-DAN-BACKLOG.md) untuk urutan kerja dan bukti pengujian.
4. Sebelum implementasi visual baca [panduan desain](../task2-draft/PANDUAN-DESAIN.md), [PRD draft](../task2-draft/PRD-MASTER.md), dan [alur draft](../task2-draft/ALUR-PRODUK.md). Ikuti juga instruksi AGENTS.md yang berlaku di direktori kerja.
5. Untuk demo dan rancangan pemicu Flipbook, baca [05-EFEK-GESTUR-FLIPBOOK.md](05-EFEK-GESTUR-FLIPBOOK.md).

## Instruksi penting untuk AI berikutnya

- WEB ASELOLE adalah photobooth web Solo dan Duo, bukan aplikasi video call umum. Prioritas: Classic Solo → Classic Duo → FLIP-TEST-01 → Flipbook. Jangan mengklaim fitur sudah dibuat atau diuji.
- Perlakukan keputusan baru dalam paket ini sebagai **keputusan pengguna dalam chat Tahap 3**, bukan sebagai bukti implementasi. Rancangan teknis adalah usulan; target uji bukan jaminan.
- Percakapan terbaru mengoreksi usulan lama: editor bersama tanpa kewajiban menunggu objek dilepas; Host/Guest masing-masing boleh download; transfer gagal/terlalu lama menyebabkan ulang pasangan foto; restart/down server menyebabkan sesi dibuat ulang.
- Jangan diam-diam menimpa keputusan lama yang bertanda Locked. Perbedaan dan dampak ada pada daftar terbuka; cocokkan dengan sumber master dan minta keputusan bila perubahan semantik benar-benar diperlukan.
- Jangan menganggap semua browser/perangkat terjamin berfungsi. Chrome, Safari, Edge prioritas; browser lain diupayakan; dukungan dan fallback dibuktikan melalui pengujian.
- Jangan mengunci durasi, frame rate atau mekanisme Flipbook sebagai spesifikasi final: 3 detik/10 fps/720 px hanya target FLIP-TEST-01.
- Jangan membangun fitur atau mengubah desain hanya karena paket ini ada. Periksa instruksi pengguna terbaru, source code, aset, dan keadaan repo terlebih dahulu.

## Status dan sumber

| Sumber | Keadaan yang terverifikasi di workspace ini |
|---|---|
| `task2-draft/PRD-MASTER.md` | Draft kompilasi, bukan sign-off produk. Memuat ringkasan konteks sebelumnya dan acceptance criteria Classic. |
| `task2-draft/ALUR-PRODUK.md` | Rekonstruksi; bukan salinan flow master asli. |
| `task2-draft/PANDUAN-DESAIN.md` | Rujukan arah visual; review visual menyeluruh belum selesai. |
| `task2-draft/AGENTS.md` | Panduan di dalam folder draft; referensinya ke sumber master perlu diverifikasi. |
| Chat Tahap 3 saat ini | Sumber keputusan dan revisi terbaru yang dirangkum dalam paket ini. |
| Decision Log, audit sumber dan desain FigCraft v0.10 | Ditemukan dalam folder Persiapan Web di drive E setelah paket awal disusun: lihat `../design-library/docs/DECISION-LOG.md`, `../design-library/docs/13-stage2b-task1-source-audit.md` dan `../WEB-ASELOLE-Classic-v0.10.figcraft`. Audit menyebut transkrip lengkap awal serta DOC-02/03/06 dan P04/P05 masih memiliki gap. |

Prototype sebelumnya dilaporkan sebagai simulasi; tidak membuktikan WebRTC, sinkronisasi, recovery, atau ekspor file nyata. Detail UX, aksesibilitas, lisensi aset dan sign-off terdahulu tetap perlu diverifikasi.

## Urutan prioritas saat ada perbedaan

Instruksi pengguna terbaru → keputusan Tahap 3 yang relevan dan terdokumentasi → keputusan lama yang dapat diverifikasi → draft rekonstruksi → usulan teknis. Jika sumber Locked lama dan keputusan baru berbeda, catat dampak dan minta konfirmasi sebelum mengubah keputusan master; jangan menyatakan sumber lama telah diperbarui.

