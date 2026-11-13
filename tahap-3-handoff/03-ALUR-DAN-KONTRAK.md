# Alur dan kontrak kerja sistem

Status: rancangan untuk review, bukan spesifikasi API final. Validasi terhadap sumber flow master yang belum ditemukan dan keputusan terbuka sebelum implementasi. Nama event berikut adalah contoh, bukan API yang sudah ada.

## Classic Solo

Pilih Classic/Solo → persiapan kamera dan jumlah 3/4 → capture dan review tiap take → template → editor → preview → ekspor PNG/JPG. Pertahankan original, foto valid sebelumnya, dan retry ekspor. Aksesibilitas, izin ditolak, loading/error, keyboard dan perangkat kecil termasuk cakupan implementasi.

## Classic Duo

1. Host buat room, membagikan undangan sementara; Guest join. Server mengecek kapasitas dan role, memberikan identitas peserta/token rejoin terpisah.
2. Kedua browser menyiapkan kamera dan live preview melalui WebRTC. Host memilih jumlah take serta filter sama untuk kedua kamera. Keduanya Ready.
3. Hanya Host memulai foto. Server memvalidasi kesiapan dan membuat jadwal countdown Classic 3 detik, ID take dan attempt.
4. Kedua browser menangkap frame kamera lokal pada target bersama, lalu melaporkan hasil dan menyinkronkan foto menjadi satu pasangan. Status capture belum dianggap berhasil sampai syarat integritas yang dipilih terpenuhi.
5. Jika capture atau transfer gagal/timeout, batalkan attempt dan ulang pasangan; kegagalan teknis tidak mengurangi retake. Foto valid sebelumnya tetap aman. Batas timeout TBD.
6. Review. Jika Guest meminta retake, Host menyetujui/menolak; jika setuju keduanya Ready ulang lalu hanya Guest mengambil ulang. Ganti hasil valid hanya setelah pengganti sah dan tersinkron.
7. Host menentukan template/layout; keduanya mengedit bersama secara langsung. Ekspor mengambil snapshot versi tersinkron; kedua pengguna boleh download PNG/JPG sendiri.
8. Host menutup setelah konfirmasi dan kesempatan simpan. Bahan yang tersedia secara lokal dapat dipakai untuk edit pribadi; detail akses/pembersihan perlu keputusan.

## Flipbook

Pilih preset oleh Host → preview efek keduanya dan instruksi pose → Ready → jadwal mulai bersama → burst lokal pada kedua perangkat → susun frame berdasar waktu dan sinkronkan → review/retry seluruh burst bersama → preview animasi → GIF/MP4 download. Semua timing spesifik dan mekanisme perlu FLIP-TEST-01; countdown 3 detik Classic tidak otomatis berlaku. Audio tidak diperlukan. Detail pose, Guided/Freestyle, delapan preset dan kuota retry membutuhkan sumber asli atau keputusan tambahan.

## State dan event rancangan

State konseptual: `waiting → setup → ready → countdown → capturing → syncing → review → editing → export → ended`; `reconnecting` menjeda aktivitas terkait dan mengembalikan fase aman setelah pemulihan. Solo, retake dan Flipbook dapat memiliki cabang sendiri. Server memvalidasi transisi dan versi; diagram ini tidak mengunci urutan UX yang sumbernya belum tersedia.

| Event contoh | Arah | Aturan dan data minimum |
|---|---|---|
| `room:create`, `room:join`, `room:rejoin` | Client → server | Kode undangan/token, identitas role; validasi kapasitas, expiry dan token. |
| `room:snapshot` | Server → client | State/versi otoritatif, anggota, fase dan status relevan setelah join/rejoin. |
| `webrtc:offer/answer/ice` | Kedua arah via server | Hanya antaranggota room yang sah; batasi ukuran dan frekuensi. |
| `participant:ready` | Client → server | Status kesiapan kamera dan sesi; tidak percaya klaim client tanpa pemeriksaan state yang tersedia. |
| `capture:request` | Host → server | Terima hanya saat izin dan fase valid. |
| `capture:scheduled` | Server → keduanya | Session/room version, take ID, attempt ID, waktu target server dan durasi countdown yang berlaku. |
| `capture:result`, `media:ready` | Client → server | ID attempt, sukses/gagal dan metadata; jangan kirim foto sebagai log atau event tak terbatas. |
| `retake:request/decision` | Peserta / Host → server | Validasi role, kuota dan state; technical failure bukan retake pengguna. |
| `editor:operation`, `editor:snapshot` | Kedua arah | Identitas operasi, actor, versi dan payload tervalidasi; desain konflik/undo TBD dan harus diuji. |
| `session:end`, `session:ended` | Host/server → room | Konfirmasi/kesempatan simpan, expiry; cleanup server terpisah dari salinan lokal. |

Setiap aksi mutasi harus tahan duplikasi/retry menggunakan ID aksi/attempt; acknowledgment tidak membuktikan file sudah diterima utuh. Rejoin mengirim snapshot otoritatif dan merekonsiliasi data lokal; jangan mengulang countdown lama atau menerapkan operasi lama secara membabi buta.

## Recovery dan lifecycle

| Kejadian | Perilaku |
|---|---|
| Disconnect saat countdown/capture | Batalkan attempt, jeda dan beri status; siap ulang dan ulang jika kedua pihak kembali. |
| Disconnect saat editor | Jeda edit bersama; pertahankan versi tersinkron dan tandai perubahan belum tersinkron. Reconcile aman setelah rejoin; konflik tidak boleh hilang diam-diam. |
| Refresh/tutup tab | Target kembali pada browser/perangkat sama selama room dan token rejoin masih valid; uji data lokal, izin kamera dan tab suspend. |
| Host tidak kembali dalam 5 menit | Duo berakhir, tidak ada transfer Host. Kesempatan menyimpan hasil yang ada di Guest; detail operasional dan batasnya TBD. |
| Guest tidak kembali dalam 5 menit | Guest keluar; akhir sesi dan hak Host menyimpan masih perlu konfirmasi. |
| Server restart/down | Buat sesi baru dari awal; jangan menjanjikan rejoin room lama. Salinan yang masih ada dapat diselamatkan jika implementasi memungkinkan. |
| Room baru ditinggalkan | Bersihkan setelah 3 menit kosong; tentukan kapan timer dimulai. Jangan menghapus sesi aktif sebelum jendela rejoin 5 menit. |
| Sesi selesai / delete manual | Hapus data server sesuai keputusan dan batas 1 jam; opportunity to save dan edit pribadi perlu dirancang bersama kebijakan lokal. Hak delete dan cakupannya TBD. |

## Fitur editor dan ekspor

Photo slots, crop, filter, sticker, frame, text dan doodle direpresentasikan terpisah dari media asli. Filter capture sama di kedua kamera; pada editor perubahan foto individu tidak mengubah foto lain/asli sesuai draft. Saat berganti layout foto tetap terjaga; sticker yang terikat pada foto ikut berpindah. Ekspor snapshot perlu menjaga hasil valid sebelumnya, memberi status/error/retry, dan tidak menutup sesi. Export harus lolos cross-origin asset checks. Resolusi hasil dan format dicatat di dokumen keputusan sebagai target uji.
