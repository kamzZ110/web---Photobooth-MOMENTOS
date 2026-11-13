# Panduan desain WEB ASELOLE

Status: rujukan kerja; sumber keputusan `design-library/docs/DECISION-LOG.md` LOCK-03–13 dan arahan tekstur pengguna. Desain terbaru yang ditemukan: `WEB-ASELOLE-Classic-Stage3-v0.8.figcraft`. File Figma native adalah library awal; kesamaan dengan FigCraft terkini belum diverifikasi.

## Arah visual

Playful, retro, minimal dan orisinal. Paper grain halus menjadi material utama di latar dan beberapa kartu; dot grid hanya aksen. Blur tipis hanya pada layer tekstur agar lembut tetapi terlihat. Teks, tombol, kamera, foto dan elemen kerja tetap tajam. Gunakan bidang kamera dan canvas editor yang bersih dan netral; hindari meniru pola atau komposisi LensBooth. Review seluruh screen masih terbuka.

## Foundations

| Warna | Hex | Penggunaan dasar |
|---|---|---|
| Linen | #F5F2EB | latar |
| Sand | #E5DEC9 | surface pendukung |
| Lavender | #DDD0F3 | aksen CTA |
| Terracotta | #C06C54 | aksen |
| Olive | #7F8C72 | aksen |
| Pink | #F4C9D3 | aksen |
| Espresso | #2C2825 | teks utama |
| White | #FFFFFF | surface |

Teks sekunder #625B56; divider #CFC7BD; error surface #F9E4DF. Struktur token Primitive → Semantic → Component. Heading Fredoka; body/UI DM Sans. Body utama 16 px. Display desktop/mobile 52/36, H1 36/30, H2 28/24, H3 22/20; body 18/16/14/12. Rujuk token proyek untuk nilai dan alias lengkap.

Spacing berbasis 4 px rentang 4–64; radius 4/8/12/16/24 dan pill. Border 1 px pada surface netral dan 2 px pada CTA/selected; shadow pendek 3–4 px pada elemen yang perlu menonjol. Tombol small/medium/large 36/44/52 px; target kontrol penting sekitar 44 px minimum. Input sekitar 48 px, padding card 16–24 px, dialog desktop sekitar 360–480 px dan responsif.

## Komponen dan interaksi

Gunakan default, hover, focus, pressed, selected, disabled, loading, error, success sesuai fungsi. Focus visible khusus; loading menunjukkan status dan mencegah aksi ganda. Duo menggunakan label Connected, Syncing, Reconnecting, Occupied dan Unsynced yang dapat dipahami. Bedakan tool aktif dari objek yang dipilih. Motion UI 120/180/200/240 ms dengan fallback reduced motion; ini bukan durasi capture.

## Review

Periksa setiap screen/state desktop dan mobile, overflow, hierarki, keyboard/focus, kontras, target sentuh dan teks nonwarna. Pasangan teks sekunder pada Pink tercatat sekitar 4,49:1; tinjau sebelum dipakai untuk teks kecil. Pastikan aset, font dan lisensi diverifikasi sebelum publikasi. Dokumentasikan bukti dan revisi; hasil prototype tidak membuktikan runtime. Lihat `design-library/qa/classic-usability-accessibility-v0.6.md`.
