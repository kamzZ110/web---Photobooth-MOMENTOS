# Paket uji usability dan aksesibilitas Classic v0.6

Tanggal: 10 November 2026
File desain: E:\WEB PHOTOBOOTH\WEB-ASELOLE-Classic-Stage3-v0.6.figcraft
Status: skrip uji siap; sesi dengan peserta dan uji aplikasi nyata belum dijalankan.

## Pemeriksaan visual yang sudah dilakukan

Sampel dari file v0.6: qa/previews/solo-camera-desktop-v0.6.png, solo-editor-mobile-v0.6.png, dan duo-reconnect-mobile-v0.6.png. Ketiganya menunjukkan paper grain halus pada latar, dengan dot grid sebagai aksen. Teks, tombol, kamera, dan area foto tampak tajam; kamera dan canvas editor memakai bidang netral. Layout dan aksen visual dibuat untuk WEB ASELOLE. Audit ini tidak membandingkan aset LensBooth satu per satu, sehingga klaim orisinalitas final tetap memerlukan review aset sebelum publikasi.

Pemeriksaan token menunjukkan kontras Espresso terhadap Linen 13,07:1, White 14,61:1, Sand 10,87:1, dan Lavender 10,01:1. Teks sekunder #625B56 terhadap Linen 5,96:1 dan White 6,67:1. Kombinasi teks sekunder pada Pink #F4C9D3 sekitar 4,49:1, sangat dekat tetapi sedikit di bawah 4,5:1; jangan gunakan pasangan itu untuk teks kecil sampai warna/ukuran pada komponen spesifik ditinjau. Kontras fokus, foto nyata, dan semua state perlu dicek pada prototype yang dirender dengan font aslinya.

## Skenario uji prototype bersama peserta

| ID | Tugas peserta | Yang diamati | Bukti yang dicatat |
|---|---|---|---|
| UT-01 | Mulai Solo Classic dari Home, pilih 3 atau 4 foto, siapkan kamera | Apakah tujuan CTA dan pilihan jumlah foto jelas | Rekaman jalur, titik ragu, komentar |
| UT-02 | Selesaikan capture dan pilih foto | Pemahaman progres, izin kamera, dan foto valid | Langkah yang dicapai, salah klik, komentar |
| UT-03 | Ambil ulang satu foto; coba jalur gagal dan batas retake | Apakah foto lama dianggap aman dan kuota dipahami | Urutan tombol, pemahaman copy recovery |
| UT-04 | Pilih Strip/Grid/Polaroid dan lanjut ke editor | Selected state, ekspektasi susunan 3/4 foto | Pilihan, alasan, titik ragu |
| UT-05 | Tambahkan satu dekorasi, ubah posisi, Undo, lalu Preview | Pemisahan foto dan tools, affordance editor | Langkah, kesalahan, komentar |
| UT-06 | Pilih PNG/JPG, unduh; coba error lalu retry dan kembali mengedit | Kejelasan status, keyakinan hasil sebelumnya aman | Jalur, file aktual bila aplikasi ada |
| UT-07 | Duo Host dan Guest masuk dari dua perangkat; Ready, retake Guest, approve/reject, reconnect | Peran, status sinkron, jeda edit, pemulihan | Rekaman kedua perangkat dan urutan state |

Mulai UT-01 sampai UT-06 di desktop dan mobile. Jalankan UT-07 dengan dua orang/perangkat setelah ada aplikasi yang menghubungkan sesi. Prototype lokal saat ini dapat menunjukkan state, tetapi tidak dapat membuktikan kamera, sinkronisasi, atau file unduhan sungguhan.

## Pemeriksaan aksesibilitas dan responsif

| ID | Pemeriksaan | Kriteria review | Status |
|---|---|---|---|
| AX-01 | Keyboard: Tab, Shift+Tab, Enter/Space, Escape | Urutan fokus logis; tidak terjebak; fokus kembali setelah dialog | Menunggu prototype player/runtime |
| AX-02 | Focus visible pada CTA, pilihan, field, dan tool | Outline terlihat pada Linen/White/Lavender dan tidak tertutup shadow | Menunggu interaksi visual |
| AX-03 | Screen reader | Nama dan state kontrol, status loading/error/recovery, label input | Menunggu runtime |
| AX-04 | Reduced motion | Transisi UI ringan punya fallback; capture/Flipbook tidak diasumsikan dari timing prototype | Menunggu runtime |
| AX-05 | Zoom 200% dan lebar 320/390/768/1024/1440 | Isi tetap terbaca, aksi tidak tertutup, tanpa overflow horizontal | 390/1440 sampel statis; sisanya menunggu runtime |
| AX-06 | Kamera/foto/editor | Tekstur dan blur hanya di latar/kartu; konten utama tetap tajam | Lulus pada tiga sampel visual; layar lain menunggu review |
| AX-07 | Target sentuh | Kontrol penting minimal sekitar 44 px | 193 kontrol klik prototype diperiksa: tidak ada yang lebih kecil dari 44 px |
| AX-08 | Teks dan warna | Kontras pasangan aktual dan tidak bergantung pada warna saja | Token utama dihitung; kombinasi sekunder pada Pink perlu ditinjau |
| AX-09 | Recovery | Hasil valid tidak hilang saat retake/export/reconnect gagal | Copy prototype ditinjau; runtime menunggu |

## Form catatan tiap sesi

- Peserta/kode: 
- Perangkat, browser, lebar layar, input: 
- Skenario dan hasil: 
- Titik ragu/kesalahan: 
- Kutipan peserta singkat: 
- Temuan aksesibilitas: 
- Prioritas perbaikan dan screen: 
- Bukti video/screenshot/file: 
- Review ulang setelah perbaikan: 

QA Tahap 3 masih terbuka sampai sesi peserta, interaksi keyboard/screen reader, dan validasi perangkat dilakukan. Uji kamera nyata, dua perangkat Duo, dan export PNG/JPG memerlukan implementasi Classic; catat itu sebagai gate implementasi, bukan hasil desain.

