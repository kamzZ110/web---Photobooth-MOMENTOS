# Konteks produk dan keputusan

## Produk dan cakupan

WEB ASELOLE adalah photobooth web untuk pengguna sendiri (Solo) atau dua orang di lokasi berbeda (Duo). Classic: kamera, beberapa foto, review/retake, template, editor, hasil strip/grid/variasi dan ekspor. Flipbook: preset sebelum capture, live preview efek, instruksi pose, burst, sequence, review/retry, GIF/MP4 dan preview animasi. Draft mencatat Guided/Freestyle dan delapan preset awal; rincian sumber aslinya belum tersedia. Tidak ada login, riwayat permanen atau public share link dalam baseline draft. Link/kode undangan room sementara bukan public share link hasil.

## Keputusan pengguna Tahap 3

| Area | Keputusan |
|---|---|
| Dukungan | Semua kategori perangkat termasuk desktop/laptop, Android dan iPhone; kombinasi berbeda didukung. Chrome, Safari, Edge prioritas, browser lain diupayakan. Tidak ada minimum versi/spesifikasi yang sudah ditetapkan. |
| Solo dan Duo | Classic First: Solo lalu Duo. Duo maksimal Host dan Guest. |
| Classic | Pilihan 3/4 take, default 4; Host menentukan untuk Duo. Satu take Duo terdiri dari foto masing-masing peserta. |
| Ready dan capture | Kedua peserta Ready; Host memulai countdown 3 detik Classic dan capture lokal dijadwalkan pada waktu bersama. Ini target sinkronisasi, bukan jaminan sensor identik. |
| Retake | Maksimal 3 retake per foto; gagal teknis tidak mengurangi kuota. Guest meminta persetujuan Host; bila setuju keduanya Ready lagi dan hanya Guest retake. Hasil valid lama dipertahankan sampai pengganti valid. |
| Peran | Host menentukan jumlah foto, filter capture, template dan layout; filter capture sama untuk kedua kamera, perubahan berlaku pada take berikutnya. Keduanya mengedit dekorasi bersama dan download sendiri. |
| Editor | Kolaboratif seperti Canva: tidak mensyaratkan pengguna menunggu objek dilepas; perubahan langsung tanpa approval, undo/redo personal. Konflik serentak dan jaminan konsistensi perlu desain dan uji. Setelah sesi berakhir masing-masing boleh lanjut edit pribadi dari bahan yang tersedia. |
| Ekspor Classic | PNG/JPG; snapshot saat memulai ekspor, retry saat gagal, download tidak menutup sesi. Hasil ekspor dari versi tersinkron yang sama harus konsisten; ekspor pada versi berbeda bisa berbeda. |
| Transfer | Kedua capture lokal disinkronkan menjadi pasangan. Jika transfer gagal atau terlalu lama, ulang pasangan foto bersama tanpa penalti teknis; take valid sebelumnya aman. Batas waktu belum ditetapkan. |
| Reconnect | Disconnect saat countdown/capture membatalkan attempt; editor bersama dijeda. Rejoin maksimal 5 menit; tanpa transfer peran Host. Jika Host tidak kembali, Duo berakhir. Pengguna menegaskan Guest keluar setelah 5 menit; penutupan Duo dan hak simpan Host perlu konfirmasi (lihat daftar terbuka). |
| Refresh/tutup tab | Target rejoin dan pemulihan bahan pada browser/perangkat yang sama selama sesi tersedia dan periode rejoin belum habis. Keberhasilan bergantung penyimpanan dan pengujian; jangan menjanjikan untuk perangkat baru atau data browser terhapus. |
| Penutupan | Host mengakhiri dengan konfirmasi dan memberi keduanya kesempatan menyimpan hasil siap. Sesi setelah server restart/down dibuat ulang dari awal. Bahan lokal yang masih tersedia dapat menjadi dasar edit pribadi; detail lifecycle perlu diselesaikan. |
| Storage/privacy | Media boleh melewati atau tersimpan sementara pada server jika diperlukan; retensi server maksimum awal 1 jam, hapus saat sesi selesai dengan cleanup cadangan. Salinan lokal untuk edit pribadi berbeda dari data server. Penjelasan sebelum izin kamera, ringkasan dan tautan privacy, penghapusan manual dengan konfirmasi. Media dibatasi ketat; angka belum ditetapkan. |
| Flipbook | Host memilih preset sama bagi keduanya; efek preview dan hasil; countdown/waktu mulai burst bersama; keduanya retry seluruh burst. GIF dan MP4 target MVP; preview animasi di halaman; tanpa audio. Fallback MP4 lintas browser perlu dibuktikan. |
| Operasional | Uji privat; target perencanaan awal 5–10 room bersamaan, kapasitas belum dibuktikan; biaya rendah; alamat sementara; pemilik mengelola awal. Sesi boleh berakhir saat deployment. Log teknis seperlunya tanpa isi foto/video/dekorasi. **MVP tidak memerlukan panel admin khusus**; gunakan alat operasional penyedia layanan. Keputusan ini disetujui pengguna setelah pembahasan Tahap 3. |

## Target untuk diuji, bukan jaminan

- Classic: target awal foto sisi panjang sekitar 1280 px jika tersedia; hasil strip sisi panjang sekitar 2400 px, menyesuaikan template. Angka bukan jaminan kualitas atau cetak.
- Flipbook: mulai FLIP-TEST-01 dengan 3 detik, 10 fps, sisi panjang sekitar 720 px. Ini merevisi status 'belum ada target' dalam draft, bukan penetapan timing final. Uji performa dan kecocokan UX sebelum mengunci.
- Sinkronisasi capture: upaya agar terasa bersamaan. Perkiraan 200–300 ms sempat diusulkan sebagai target uji, belum disetujui sebagai acceptance threshold. Waktu aktual sensor tidak dijamin atau selalu bisa diukur secara langsung.

## Perbedaan dan pertanyaan sebelum implementasi terkait

1. **Editor occupied:** draft AC-DC-07 menyebut satu elemen diedit satu pengguna/occupied; pengguna kemudian meminta pengalaman seperti Canva tanpa harus menunggu objek dilepas. Ini potensi revisi Locked, bukan bukti cara Canva bekerja. Desain resolusi konflik dan catat perubahan master setelah sumber dan persetujuan diverifikasi.
2. **Penghapusan vs edit pribadi:** hapus media server saat sesi berakhir tidak boleh otomatis diklaim menghapus semua salinan lokal. Tombol hapus: siapa boleh menghapus, cakupan, apakah mengakhiri sesi, dan dampak ke perangkat lain belum diputuskan.
3. **Batas 1 jam:** belum diputuskan apakah sesi dihentikan pada batas, apakah umur dihitung dari pembuatan atau upload, dan apakah perpanjangan diizinkan. Jangan diam-diam membuat retensi lebih dari 1 jam; definisikan sebelum implementasi storage.
4. **Guest melewati 5 menit:** Guest keluar sudah diputuskan; usulan asisten bahwa Duo juga berakhir dan Host dapat menyimpan belum disetujui eksplisit.
5. **3 menit room kosong:** disetujui untuk room baru yang ditinggalkan; 5 menit rejoin sesi aktif dipertahankan. Kapan timer mulai dan apa yang terjadi jika pengguna masih berada di room belum ditentukan.
6. **Tutup tab/background:** pengguna berkata 'seperti sebelumnya, diberi waktu yang sama'; sumber aturan sebelumnya tidak ditemukan. Jangan menyamakan background/layar terkunci dengan disconnect otomatis tanpa verifikasi. Browser dapat menangguhkan kamera/timer.
7. **Host retake, status review, kuota Flipbook, retry yang ditolak, transfer timeout, manual delete dan resolusi konflik editor** perlu spesifikasi; jangan mengarang.
8. **Pasca-sesi edit:** retensi lokal, akses kembali setelah tutup tab, kapan kesempatan simpan selesai, dan perilaku setelah 1 jam belum disepakati. Bedakan target dari jaminan.
9. **Dukungan browser:** matriks minimum, perangkat uji, aksesibilitas, persyaratan ekspor/cetak, dan fallback MP4 belum final.
10. Decision Log, audit sumber, aset dan FigCraft v0.10 tersedia dalam folder Persiapan Web di drive E. Transkrip lengkap Tahap 1 dan DOC-02/03/06 tidak serta-merta lengkap; periksa audit, P04/P05, sumber flow Flipbook, status review desain, lisensi dan rincian Guided/Freestyle sebelum menyimpulkan.

