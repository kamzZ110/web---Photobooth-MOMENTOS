# Panduan desain Photobooth Web

Status: **diperbarui 13 November 2026** (`CHG-4.0-001` di `design-library/docs/DECISION-LOG.md`). Menggantikan arah visual lama (*Warm Playful Retro* / `WEB-ASELOLE-Classic-Stage3-v0.8.figcraft` sebagai arsip referensi lama).

## Arah visual

Modern, bersih, lega (*anti-clutter*), dan *interactive-first*. Menggabungkan **Blurred Line Grid** (garis grid `#18181B` agak tebal dengan blur halus di atas kanvas Cream), **Glassmorphism** pada *floating header*, status pill, dan toolbar kamera/editor, serta **Neobrutalism modern** yang rata (*flat*) saat diam dan interaktif saat di-hover.

Khusus halaman beranda, ditambahkan efek musiman menggunakan `falling-leaves/react` (`<FallingLeaves fullScreen />`) atau `react-snowfall` sesuai bulan, dengan `pointer-events: none` dan nonaktif otomatis untuk `prefers-reduced-motion`. Area kamera dan canvas editor tetap bersih dan netral (`#FFFFFF`).

## Foundations (Palet 6 Warna)

| Warna | Hex | Penggunaan dasar |
|---|---|---|
| Cream | #FAF7F2 | kanvas utama |
| Putih | #FFFFFF | surface card, base glassmorphism, canvas editor |
| Ink | #18181B | teks utama, border, garis grid, shadow |
| Crisp Berry | #C93B6B | aksen utama (CTA & fokus aktif) |
| Sky Mist | #7AB3EF | aksen sekunder (highlight, mode Duo, hover CTA sekunder, daun) |
| Sage Green | #7A9E7E | status positif (Ready/Aman) & daun |

Struktur token Primitive → Semantic → Component. Heading **`Outfit`**; body/UI/tombol **`Plus Jakarta Sans`**. Body utama `16 px`. Display desktop/mobile `52/36`, H1 `36/30`, H2 `28/24`, H3 `22/20`; body `18/16/14/12`.

Spacing berbasis `4 px` rentang `4–64`; radius `4/8/12/16/24` dan `pill`. Border `1.5–2 px` `#18181B` pada elemen interaktif; tombol dan kartu **rata (flat) saat diam** tanpa shadow kaku. Tombol penting **timbul ke depan tipis** (`scale` + shadow lembut) dan **berubah warna** saat hover; kartu preview terangkat ringan saat hover. Tombol small/medium/large `36/44/52 px`; target kontrol penting sekitar `44 px` minimum. Input sekitar `48 px`, padding card `16–24 px`, dialog desktop sekitar `360–480 px` dan responsif.

## Komponen dan interaksi

Gunakan default, hover, focus, pressed, selected, disabled, loading, error, success sesuai fungsi. Focus visible khusus; loading menunjukkan status dan mencegah aksi ganda. Duo menggunakan label Connected, Syncing, Reconnecting, Occupied dan Unsynced yang dapat dipahami. Bedakan tool aktif dari objek yang dipilih. Motion UI 120/180/200/240 ms dengan fallback reduced motion; ini bukan durasi capture.

## Review

Periksa setiap screen/state desktop dan mobile, overflow, hierarki, keyboard/focus, kontras, target sentuh dan teks nonwarna. Pasangan teks sekunder pada Pink tercatat sekitar 4,49:1; tinjau sebelum dipakai untuk teks kecil. Pastikan aset, font dan lisensi diverifikasi sebelum publikasi. Dokumentasikan bukti dan revisi; hasil prototype tidak membuktikan runtime. Lihat `design-library/qa/classic-usability-accessibility-v0.6.md`.
