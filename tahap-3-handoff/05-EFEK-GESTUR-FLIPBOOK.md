# Efek gestur Flipbook MOMENTOS

Rancangan interaksi dan demo visual, 20 November 2026. Kategori demo Solo dan Duo tersedia di **Cara Kerja & Efek** dan **Take Flipbook**. Demo memakai tombol simulasi. Pengujian kamera, sinkronisasi dua perangkat dan ekspor efek mengikuti [FLIP-TEST-01](04-VALIDASI-DAN-BACKLOG.md) setelah implementasi Classic. Durasi capture, ambang deteksi dan toleransi waktu masih `[TBD]`.

## Efek Solo

| Efek | Aksi dan deteksi yang diusulkan | Urutan visual | Kasus yang perlu dibuktikan |
|---|---|---|---|
| Comic Boom | Pengguna membuka mulut seperti kaget. Gunakan sinyal bukaan rahang dari pelacak wajah dan cek perubahan dari pose netral. | Ekspresi kaget → garis kejut → ledakan kuning dengan tulisan **BOOM!** dan partikel komik. Letakkan teks di atas kepala. | Bicara atau bukaan mulut singkat tidak memicu efek terlalu sering. |
| Wink Spark | Pengguna mengedipkan satu mata. Bandingkan skor kedua mata dan tunggu mata terbuka kembali sebelum efek bisa dipicu ulang. | Kilau berawal di mata → melesat diagonal → berpecah menjadi bintang lilac dan kuning pucat. | Bedakan wink dari kedipan dua mata. Cek hasil setelah preview kamera dicerminkan. |
| Bunny Peace | Pengguna membuat tanda peace di samping kepala. Gabungkan kategori `Victory` dengan posisi tangan relatif ke wajah. | Telinga putih dan pink muncul di atas kepala → kelinci kecil melompat di bagian bawah. | Tanda peace di luar area kepala dan tangan yang keluar dari frame. |
| Nope Shake | Pengguna menggeleng. Cari perubahan arah rotasi wajah pada beberapa frame berurutan. | Kepala bergerak kiri-kanan → tulisan **NOPE!** muncul dengan garis gerak koral → panel kembali stabil. | Bedakan menoleh ke satu arah dan menggeser badan dari gelengan. |

## Efek Duo

Setiap efek Duo membutuhkan dua orang yang berkontribusi pada animasi dan masuk dalam hasil. Pengguna bisa melihat demo Duo walau memulai dari Solo. Untuk rancangan capture Duo online, peserta kedua bergabung terlebih dahulu. Cara merekam dua orang melalui satu kamera masih `[TBD]`.

| Efek | Aksi dan deteksi yang diusulkan | Urutan visual | Kasus yang perlu dibuktikan |
|---|---|---|---|
| Kiss Relay | A mengerucutkan bibir. Setelah A terdeteksi, B membuka telapak tangan untuk menangkap. | Hati berry muncul dekat A → melintas di antara dua kamera → mendarat dekat telapak B → pecah menjadi hati kecil. | B membuka telapak terlalu cepat, terlalu lambat atau di luar frame. |
| Magic Wipe | A mendekatkan telapak ke kamera. B menyibakkan telapak ke samping. Gunakan rangkaian landmark tangan menuju lensa dan perubahan posisi telapak B. | Sisi A tertutup → garis sapuan ungu melintas → topi sulap dan bintang muncul di kedua sisi. | Tangan A hilang saat lensa tertutup, ruangan gelap, atau B belum melakukan sapuan. |
| Power-Up Duo | A dan B masing-masing memberi jempol. Gabungkan dua status `Thumb_Up` pada percobaan yang sama. | Aura hijau tumbuh di sekitar masing-masing peserta → dua percikan bertemu menjadi satu ledakan kecil di tengah. | Satu peserta belum siap, status terlambat, gestur dilepas atau event datang dua kali. |
| Color Trail Wave | A dan B melambaikan tangan ke tengah. Lacak posisi telapak dan perubahan arah dari beberapa frame. | Garis berry dan biru tumbuh dari masing-masing tangan → bertemu di tengah → berubah menjadi kembang api kecil. | Jejak terputus ketika tangan hilang atau jejak sampai terlalu jauh karena video dicerminkan. |

**Duo Heart** yang menyatukan dua setengah hati adalah ide terpisah dari Kiss Relay. Penempatan efek tersebut dalam daftar produksi dan cara mengenali pose setengah hati masih `[TBD]`.

## Dari demo ke kamera

1. Pilih tema buku pada **Tema Sampul**. Di **Take Flipbook**, pengguna dapat mengatur filter, aksesori, overlay dan panduan pose sebelum merekam. Demo gestur dapat dibuka pada layar kamera atau melalui tutorial.
2. Uji deteksi lokal pada kamera. Gunakan pelacak wajah untuk Comic Boom, Wink Spark, Nope Shake dan sisi pengirim Kiss Relay. Gunakan pelacak tangan untuk efek lain dan sisi penerima Kiss Relay. Evaluasi MediaPipe sebagai kandidat. Tentukan ambang, cara menahan status, kapan status kedaluwarsa, dan cara memicu ulang dari hasil uji. Jika dibutuhkan, uji tombol cadangan per peserta dengan syarat Duo yang sama.
3. Untuk Duo online, sambungkan status gestur ke percobaan rekam di room. Rancangan awal mengirim jenis gestur dan waktu terdeteksi. Untuk efek berurutan, tunggu aksi penerima setelah aksi pengirim. Untuk efek bersama, gabungkan dua status yang masih berlaku. Abaikan status dari percobaan lama saat ulang atau sambung kembali. Jadwal efek dan toleransinya perlu dibuktikan di dua perangkat.
4. Gambar animasi berdasarkan waktu dan posisi peserta di kanvas komposisi. Gunakan komposisi yang sama sebagai acuan preview dan frame rekaman agar hasil ekspor memuat efek yang terlihat saat capture. Posisi kiri/kanan pada komposisi harus konsisten untuk kedua peserta meskipun preview lokal dicerminkan.
5. Pada FLIP-TEST-01, cek apakah satu gestur Duo saja masih menunggu, keduanya bisa memicu tepat sekali, percobaan ulang bersih, instruksi mudah diikuti, dan animasi muncul dalam GIF/MP4. Mulai dari **Power-Up Duo** sebagai kandidat pilot karena kedua peserta menggunakan kategori gestur yang sama.

Demo saat ini menggambar ilustrasi dan animasi dengan TypeScript dan Canvas 2D. Pemicu demo adalah tombol, sedangkan langkah kamera, pertukaran status dan ekspor di atas adalah pekerjaan implementasi berikutnya. Waktu putar demo hanya berlaku pada tutorial.

## Aksesori Kamera

Topi Natal, Telinga Kucing, Kacamata Bintang, dan Hidung Badut digambar dengan Canvas 2D. Tutorial memakai landmark ilustrasi untuk demonstrasi menoleh, memiringkan kepala, dan mendekat. Di **Take Flipbook → Aksesori Kamera**, Solo memilih satu opsi, termasuk **Tanpa Aksesori**. Host memilih terpisah untuk sisi kiri (Host) dan sisi kanan (Guest). Room menyimpan ID pilihan, sedangkan landmark diproses di browser masing-masing dengan video yang tersedia pada perangkat itu. Preview kamera dan frame rekaman memakai renderer aksesori dan overlay yang sama.

Layar **Take Flipbook** menempatkan filter di kiri, kamera di tengah, overlay di kanan, dan aksesori di bawah kamera. Ketiganya memakai thumbnail foto berbentuk lingkaran. Di layar sempit, filter dan overlay berada di bawah kamera dalam dua panel yang dapat digeser. Preview dan komposisi Flipbook memakai 16:9 (640 × 360 px). Halaman GIF mempertahankan rasio foto ketika menambahkan jilid.

Layar kamera **Classic Solo dan Duo** memakai susunan dan thumbnail yang sama. Classic Solo mengambil foto 960 × 540 px. Di Duo, Host di kiri dan Guest di kanan, dengan foto 480 × 540 px per peserta sesuai potongan preview. Host menentukan filter dan overlay bersama serta aksesori tiap peserta. Pilihan efek Classic Duo disimpan terpisah dari pilihan aksesori Flipbook Duo.

Pelacak memakai [MediaPipe Face Landmarker untuk web](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker?tab=Web) dalam mode `VIDEO` dengan satu instance per kamera yang memakai aksesori. Browser memuat JavaScript dan WASM versi 0.10.35 dari jsDelivr dan model versi 1 dari penyimpanan Google. Inferensi berjalan di tab pada salinan video yang diperkecil. Posisi landmark dinormalisasi sebelum diproyeksikan oleh [renderer aksesori](../apps/web/src/lib/cameraAccessories.ts) ke crop yang sama dengan rekaman. Pemrosesan untuk fitur aksesori tidak mengirim landmark atau frame ke penyedia model.

Untuk koleksi selanjutnya, gunakan anchor dahi atau pelipis atas untuk Topi Ulang Tahun, Mahkota Piksel, dan Antena Alien. Gunakan pusat mata untuk Kacamata Piksel dan tambahkan anchor area bibir atau pipi untuk Kumis Kartun dan Stiker Pipi. Tentukan anchor Cincin Saturnus sesuai desainnya. Sarung Tangan Robot membutuhkan landmark tangan.

### Bukti verifikasi dan pekerjaan tersisa

| Cakupan | Hasil |
|---|---|
| Build dan pemeriksaan tipe | `npm run build` dan `npm run typecheck` lulus. |
| Canvas pada Edge | Uji dengan landmark dan video sintetis mencakup keempat aksesori, posisi, ukuran, kemiringan, pencerminan, keluar dan kembali ke frame, kliping kedua sisi Duo, serta opsi membiarkan satu sisi polos. Delapan demo gestur dan komposisi overlay rekaman diperiksa. |
| GIF dan MP4 | File hasil encoder dibaca kembali di Edge dan piksel aksesori terdeteksi pada kedua format. Input uji memakai video dan landmark sintetis. |
| Room Duo | Uji `RoomStore` memeriksa pilihan terpisah, batas peran Host, penolakan ID tak dikenal, dan pemulihan pilihan setelah rejoin. |
| Alur Solo dari UI sampai review | Belum terverifikasi menyeluruh. Preview lokal di browser interaktif tidak terhubung dan dua percobaan lanjutan dengan Edge headless berhenti sebelum menghasilkan hasil uji UI. |
| Kamera fisik dan Duo lintas perangkat | Inisialisasi model aktual, akurasi dan performa pada wajah nyata, serta panggilan Duo lintas perangkat masih perlu uji. Lingkungan pengujian memblokir akses aset CDN dan preview lokal di browser interaktif tidak terhubung. |

[Backlog Tahap 3](04-VALIDASI-DAN-BACKLOG.md) menempatkan FLIP-TEST-01 setelah Classic. Implementasi Classic Solo dan Duo tersedia di kode proyek, sementara bukti uji Classic Duo lintas perangkat dan hasil FLIP-TEST-01 belum tercatat. Pengujian aksesori di atas tidak menutup gate itu. Rekaman Duo Flipbook masih dimulai per perangkat. Timing rekaman tetap memakai nilai prototipe yang ada dan belum ditetapkan sebagai standar produk.
