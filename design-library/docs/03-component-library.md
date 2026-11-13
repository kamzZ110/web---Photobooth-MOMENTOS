# Spesifikasi komponen Classic first

Library sumber versi 0.1 berisi 10 kelompok operasional, 23 keluarga dan 227 kombinasi varian yang valid. Sumber berada di `figma/library-model.json`; referensi visual berada di `preview/index.html`. Angka ini menghitung specimen desain, bukan screen produk, native component sets yang telah dibuat, atau skenario uji produk yang lulus.

| Kelompok | Keluarga | Axes dan state yang disiapkan |
|---|---|---|
| Actions | Button | Primary/Secondary/Danger × Small/Medium/Large × Default/Hover/Focus/Pressed/Disabled/Loading |
| Actions | IconButton | Camera/Mic/Undo/Close × Default/Hover/Focus/Pressed/Disabled/Loading |
| Forms | RoomCode | Default/Hover/Focus/Filled/Disabled/Loading/Error/Success |
| Forms | Choice | Default/Hover/Focus/Pressed/Selected/Disabled |
| Selection | TemplateCard | Strip/Grid/Polaroid × Default/Hover/Focus/Pressed/Selected/Disabled/Loading/Error |
| Navigation | Tab | Default/Hover/Focus/Pressed/Selected/Disabled |
| Navigation | Step | Default/Current/Complete/Disabled; indikator status, bukan tombol navigasi otomatis |
| Feedback | Banner | Info/Success/Warning/Error × Default/Loading |
| Feedback | DuoStatus | Connected/Syncing/Reconnecting/Occupied/Unsynced |
| Feedback | SessionRecovery | Reconnecting/Recovered/Ended/Unsynced |
| Feedback | Toast | Info/Success/Error |
| Overlays | Dialog | Retake/Leave/Error × Default/Loading/Error |
| Camera | CameraControl | Default/Off/Disabled/Loading/Error |
| Camera | VoiceControl | Off/On/Focus/Disabled/Loading/Error |
| Camera | ReadyCheck | Host/Guest × NotReady/Ready/Waiting/Reconnecting |
| Camera | CaptureProgress | Ready/Capturing/Loading/Error |
| Review | PhotoReview | Solo/Duo × Default/RetakeRequested/LimitReached/Loading/Error; RetakeRequested hanya Duo |
| Review | RetakeApproval | Host/Guest × Pending/Loading/Error/Approved/Rejected |
| Editor | Tool | Default/Hover/Focus/Pressed/Selected/Disabled |
| Editor | Object | Default/Selected/Editing/Occupied/Unsynced |
| Editor | Properties | Default/Disabled/Occupied |
| Export | Format | PNG/JPG × Default/Hover/Focus/Pressed/Selected/Disabled |
| Export | ExportStatus | Default/Loading/Error/Success |

State dipilih sesuai jenis komponen. Success/Error tombol ditempatkan pada feedback terkait; tombol aksi tidak menjadi tombol selected. Focus adalah lapisan interaksi yang dapat bersamaan dengan Selected, Error atau Loading pada implementasi. Specimen eksklusif di galeri tidak berarti state riil harus saling meniadakan. Properties memerlukan input posisi yang memakai pola input/focus standar ketika diimplementasikan.

## Foundations yang diterapkan

Primitive warna disalin persis dari palet pengguna. Semantic memetakan canvas→Linen, surface→White, muted/disabled→Sand, primary/selected→Lavender, teks/border penting/focus→Espresso. Teks sekunder #625B56 dan error surface #F9E4DF mengikuti persetujuan 9.5. Border #CFC7BD hanya pembatas dekoratif; ia tidak cukup kontras untuk menjadi satu-satunya batas kontrol.

Primary memakai Lavender, Espresso, border 2 px dan shadow 3 px. Hover dapat mengubah offset menjadi 4 px; Pressed menghilangkan shadow. Secondary White lebih netral. Danger memakai error surface dengan Espresso, label tindakan eksplisit dan dialog konfirmasi; tidak memakai teks putih kecil pada Terracotta. Selected memakai border 2 px dan centang/label. Disabled tetap terbaca, tidak menerima aksi, dan menyediakan alasan ketika diperlukan. Loading mengganti label dengan proses yang jelas dan menolak aksi berulang.

Spacing tersedia setiap 4 px dari 4 sampai 64. Radius control 12, card 16, dialog 24; skala lain 4/8/pill tersedia. Surface netral border 1 px. Card padding 16–24; contoh generator 24. Dialog contoh sekitar 384 px; screen mobile harus mengalirkan isi dan aksi. Icon target 44 × 44; ikon visual dapat 20/24 px. Input tinggi 48. Button Small 36 hanya untuk aksi sekunder nonkritis; Medium 44; Large 52 untuk CTA/mobile.

Typography: Fredoka 600 untuk display/H1/H2, 500 untuk H3; DM Sans 400 body dan 600 button. Body utama 16/24 px; caption 12 px hanya metadata. Display 52/36; H1 36/30; H2 28/24; H3 22/20 untuk desktop/mobile. Line height dipilih di rentang yang telah disetujui: heading sekitar 1,2–1,3, body 1,5, button 1,25. Tidak menambah tracking dekoratif.

## Kontrak perilaku saat implementasi

| Area | Perilaku yang wajib dipertahankan |
|---|---|
| Keyboard | Semua aksi punya label; urutan focus logis; focus 2 px Espresso dengan offset 4 px, tidak tertutup shadow |
| Dialog | Focus masuk dialog, tetap di dialog, kembali ke pemicu setelah ditutup. Escape/back tidak boleh membuang hasil diam-diam. Dialog panjang dapat discroll |
| Loading | Guard menolak aksi ganda; label proses dan `aria-busy` relevan. Penempatan focus tetap stabil |
| Disabled | Alasan terlihat atau dapat diakses sesuai konteks; state bukan sekadar opacity rendah |
| Input | Label permanen; placeholder bukan label. Error inline terhubung ke input, `aria-invalid` dan penjelasan pemulihan. Format/panjang room code belum ditetapkan oleh specimen |
| Selected | Centang/label, border 2 px, dan semantik pilihan yang benar; keyboard focus tetap dapat terlihat di atas Selected |
| Status | Ikon + judul + penjelasan + aksi relevan. `role=status` untuk update biasa; error mendesak dapat alert. Hindari pengumuman progress setiap detik |
| Camera | Solid background sebagai fallback glass. Tidak mengubah kontras mengikuti foto secara asumtif. Label kamera/mic berubah mengikuti status |
| Editor | Tool aktif berbeda dari objek dipilih/diedit. Occupied menjelaskan peran partner dan alternatif. Canvas White netral; palet UI tidak memfilter foto |
| Touch editing | Area penting ≥44 px; zoom/pan tidak mengubah resolusi hasil. Kontrol posisi/tombol arah menjadi alternatif drag; drawing hanya pada Drawing Mode |
| Motion | UI 120/180/200/240 ms; reduced motion menghilangkan dekorasi. Update sesi langsung ditampilkan tanpa menunggu transisi. Bukan durasi capture |
| Responsive | Mobile padding 16 dan bottom tools; tablet padding 24/properties collapsible; desktop padding 32 dan tiga kolom editor. Ukuran awal ini perlu diuji pada screen nyata |

## Kontrak Classic dan Duo

Jumlah take 3 atau 4, default 4. Maksimum 3 retake per foto; retry teknis tidak mengurangi kuota. Foto valid lama tetap ada sampai pengganti valid berhasil. RetakeRequested hanya Duo. Host memberi keputusan; Guest menunggu. Jika disetujui, keduanya Ready ulang tetapi hanya Guest mengambil ulang; jika ditolak, foto Guest yang valid dipertahankan.

PhotoReview menunjukkan foto Host dan Guest sebagai pasangan pada Duo. Thumbnail kategori Strip/Grid/Polaroid bukan definisi jumlah slot, layout produksi atau ukuran export. Template final tetap harus mendukung keputusan 3/4 take dan pasangan Duo.

Connected, Syncing, Reconnecting, Occupied, Unsynced memiliki teks tersendiri. Saat partner disconnect, tahap dan editing bersama dijeda; batas reconnect tetap 5 menit. Setelah pulih, tahap sesi dipulihkan dan Ready ulang bila diperlukan. Saat Duo berakhir, tawarkan hasil selesai yang tersedia sesuai aturan; jangan menjanjikan pemulihan data yang belum terbukti tersedia. Voice opsional, tidak otomatis aktif karena preview.

Export memakai komposisi valid dan snapshot pada awal proses. Retry tersedia ketika gagal; hasil valid sebelumnya tetap ada. PNG/JPG dipilih secara eksplisit; download tidak otomatis mengakhiri sesi. Ukuran canvas/resolusi dan mekanisme penyimpanan tidak ditetapkan oleh library ini.

## Batas hasil 3.1

Generator telah menghasilkan struktur native, variables, Text/Effect Styles, component sets, bindings utama dan Text Properties. Audit native dasar lulus; hasil dan tautan ada di `05-native-figma-handoff.md`. Galeri HTML menyediakan seluruh state dan pilihan varian. Simulasi input/loading pada preview hanya memeriksa state lokal dan tidak membentuk prototype Solo/Duo Classic. Resizing pada screen nyata, interaction dan QA produk masih diperlukan.

Nama komponen dan salinan teks adalah working copy untuk library; final copywriting tetap OPEN-09. Tidak ada keputusan framework, database, realtime SDK, browser support, capture duration Flipbook atau resolusi export yang dibuat.
