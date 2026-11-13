# Player QA FigCraft v0.8

Tanggal: 10 November 2026
File: `E:\WEB PHOTOBOOTH\WEB-ASELOLE-Classic-Stage3-v0.8.figcraft`

## Temuan dan perbaikan

v0.7 di player desktop berhenti pada `Solo prototype / CL03Taking / 1440` sampai kanvas diklik. Pemeriksaan node menemukan frame-level `onClick` pada countdown/capturing/syncing Solo dan Duo. v0.8 menggantinya dengan `afterDelay 800 ms` pada 16 frame sementara desktop/mobile. Pada dua frame Guest retake, trigger `onClick` dihapus dan `afterDelay` yang sudah ada dipertahankan. Pemeriksaan 18/18 frame memastikan satu delay dan tujuan valid. Penundaan ini hanya untuk playback prototype.

## Uji langsung di aplikasi FigCraft

| Jalur | Hasil yang diamati |
|---|---|
| Solo Desktop: Home → Booth Selection → Camera → countdown/capture | Transisi dari tombol “Mulai foto” berlanjut sendiri sampai state “Empat foto siap!” tanpa klik tambahan. |
| Solo Desktop: review → template → editor → preview → export | Navigasi berhasil. Loading export berubah menjadi success; copy “Sesi tetap terbuka” terlihat. Ini adalah simulasi prototype, tanpa file unduhan. |
| Duo Host Desktop: room → camera → Ready | Host Ready tampil; Guest Ready disimulasikan manual di player, kemudian kedua status Ready terlihat. |
| Duo Host Desktop: capture → review pasangan | Countdown/capturing/syncing maju sendiri ke state review pasangan tanpa klik tambahan. Dua preview Host/Guest tampil sebagai placeholder. |
| Solo Mobile: Home → Camera → capture | Layout 390 dibuka di player; countdown dan capture maju sendiri hingga “Empat foto siap!”. |
| Duo Guest Mobile: join → Ready → capture → review | Join dan Host Ready disimulasikan; countdown/capturing/syncing maju sendiri hingga review pasangan. |

Player desktop dari file v0.8 juga memperlihatkan paper grain lembut pada latar dan kartu; area kamera/editor tetap bersih dan teks/kontrol tajam. Uji ini bukan sesi usability peserta dan tidak memeriksa kamera fisik, perangkat kedua, jaringan, keyboard/pembaca layar, atau PNG/JPG sebenarnya. Mobile diperiksa hanya sebagai player pada frame 390, bukan sebagai browser/perangkat nyata.

## Batas gate

GATE-07 memperoleh bukti playback Solo Desktop dan Duo Host Desktop, tetapi masih parsial sampai peserta dan mobile flow diuji. GATE-01–06/08 tidak berubah dari handoff v0.7. Tidak ada AC runtime yang dinyatakan lulus.

