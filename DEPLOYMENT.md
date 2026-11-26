# Panduan Rilis & Deployment Produksi — Momentos Photobooth (Tahap 7)

Dokumen ini menjelaskan arsitektur produksi, konfigurasi variabel lingkungan (`.env`), serta langkah-langkah *deployment* untuk **Frontend (`@momentos/web`)** dan **Backend Realtime (`@momentos/server`)**.

---

## 1. Arsitektur Produksi (Zero-Database / Stateless Privacy-First)

- **Frontend (`apps/web`)**: Aplikasi React + TypeScript + Vite yang menangani kamera `getUserMedia`, *rendering* komposit Canvas 2D (`.PNG`, `.JPG`, `.GIF`, `.MP4`/`.WEBM`), dan koneksi WebRTC P2P.
- **Backend (`apps/server`)**: Server Node.js *in-memory* dengan HTTP Node.js, WebSocket ws, dan validasi pesan Zod yang mengelola kode Room `MMT-XXXX`, sinkronisasi *countdown*, dan kolaborasi editor dengan pembersihan otomatis (*TTL sweep* setiap 15 detik).
- **Shared Contracts (`packages/shared`)**: Definisi tipe protokol, preset frame, filter warna, dan aset stiker yang digunakan bersama oleh frontend dan backend.

---

## 2. Pemeriksaan Kesiapan Sebelum Rilis

Jalankan perintah berikut dari direktori utama proyek (`E:\web---Photobooth-MOMENTOS`):

```bash
# 1. Pemeriksaan tipe TypeScript di seluruh workspace (Web + Server)
npm run typecheck

# 2. Build bundel statis produksi untuk Frontend
npm run build
```

Hasil build statis frontend akan berada di `apps/web/dist/`.

### Preview lokal dengan konfigurasi Cloudflare Workers Static Assets

Jalankan dari root repository dengan Node 24:

```powershell
npm.cmd ci
npm.cmd run typecheck
node --test apps/server/test/room-security.test.mjs
npm.cmd audit
npm.cmd run build
npm.cmd run preview
```

Untuk menguji aturan route dan header Cloudflare secara lokal, jalankan `npx.cmd --yes wrangler@4.168.0 dev --local` dari root setelah build. Konfigurasi `wrangler.jsonc` menggunakan `apps/web/dist`. Vite menyalin `apps/web/public/_headers` ke output saat build.

Periksa `/`, keempat halaman informasi, dan `/booth/`. Buka juga `/booth?room=MMT-EXAMPLE` untuk memastikan redirect menuju `/booth/` mempertahankan query. Periksa header `X-Frame-Options`, `X-Content-Type-Options`, dan `Referrer-Policy` pada respons HTML. Route yang tidak dikenal harus menghasilkan 404 agar tetap dapat dibedakan dari halaman studio.

---

## 3. Variabel Lingkungan (`.env`)

Lihat file `.env.example` di root proyek:

| Variabel | Target | Nilai Default | Penjelasan |
| :--- | :--- | :--- | :--- |
| `VITE_WS_URL` | `@momentos/web` | `ws://localhost:4000/ws` | URL WebSocket server produksi (gunakan `wss://domain-server-kamu/ws` pada HTTPS). |
| `VITE_STUN_URLS` | `@momentos/web` | `stun:stun.l.google.com:19302` | Daftar server STUN dipisahkan koma untuk negosiasi ICE WebRTC. |
| `VITE_SITE_URL` | Frontend saat build | kosong | Origin HTTPS final untuk canonical, kartu berbagi, dan sitemap lima halaman publik. |
| `TURN_URL` | Backend | kosong | Alamat relay TURN yang mendukung TURN REST. |
| `TURN_SHARED_SECRET` | Backend | kosong | Secret bersama penyedia TURN untuk menandatangani kredensial peserta yang berlaku satu jam. |
| `PORT` | `@momentos/server` | `4000` | Port HTTP & WebSocket server Node.js. |
| `HOST` | `@momentos/server` | `0.0.0.0` | Interface jaringan yang didengarkan oleh server. |
| `CORS_ORIGIN` | Backend | Origin lokal saat pengembangan | Daftar origin frontend HTTPS yang boleh membuka WebSocket, dipisah koma. |

---

## 4. Langkah Deployment

### A. Deploy Backend Realtime (`@momentos/server`) — Railway / Render / Fly.io / VPS
1. Pastikan runtime menggunakan **Node.js v22.18+** atau **Node.js v24+** (mendukung eksekusi TypeScript native).
2. Set *Start Command* ke:
   ```bash
   npm run start:server
   ```
3. Set *Health Check Path* ke `/api/health`.
4. Catat domain HTTPS/WSS publik server (misalnya `wss://momentos-realtime.up.railway.app/ws`).

### B. Deploy Frontend (`@momentos/web`) — Vercel / Netlify / Cloudflare Pages
1. Hubungkan repositori dan arahkan *Build Command* ke:
   ```bash
   npm run build
   ```
2. Set *Output Directory* ke:
   ```text
   apps/web/dist
   ```
3. Tambahkan Environment Variable `VITE_WS_URL` dengan alamat `wss://...` dari backend di atas.
4. Pastikan situs diakses melalui **HTTPS** agar browser mengizinkan akses kamera (`navigator.mediaDevices.getUserMedia`).

Sajikan file direktori `dist` termasuk `/booth/index.html` dan keempat halaman informasi sebelum aturan fallback SPA. Room lama dengan parameter `?room=` tetap didukung. Isi variabel frontend di penyedia build atau `apps/web/.env.production`, kemudian build ulang. Masukkan variabel backend melalui environment server. Rotasi kredensial TURN statis yang pernah disertakan dalam bundle publik.
