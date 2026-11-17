# Panduan Rilis & Deployment Produksi — Momentos Photobooth (Tahap 7)

Dokumen ini menjelaskan arsitektur produksi, konfigurasi variabel lingkungan (`.env`), serta langkah-langkah *deployment* untuk **Frontend (`@momentos/web`)** dan **Backend Realtime (`@momentos/server`)**.

---

## 1. Arsitektur Produksi (Zero-Database / Stateless Privacy-First)

- **Frontend (`apps/web`)**: Aplikasi React + TypeScript + Vite yang menangani kamera `getUserMedia`, *rendering* komposit Canvas 2D (`.PNG`, `.JPG`, `.GIF`, `.MP4`/`.WEBM`), dan koneksi WebRTC P2P.
- **Backend (`apps/server`)**: Server Node.js *in-memory* tanpa ketergantungan paket eksternal (native HTTP + RFC 6455 WebSocket) yang mengelola kode Room `MMT-XXXX`, sinkronisasi *countdown*, dan kolaborasi editor dengan pembersihan otomatis (*TTL sweep* setiap 15 detik).
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

---

## 3. Variabel Lingkungan (`.env`)

Lihat file `.env.example` di root proyek:

| Variabel | Target | Nilai Default | Penjelasan |
| :--- | :--- | :--- | :--- |
| `VITE_WS_URL` | `@momentos/web` | `ws://localhost:4000/ws` | URL WebSocket server produksi (gunakan `wss://domain-server-kamu/ws` pada HTTPS). |
| `VITE_STUN_URLS` | `@momentos/web` | `stun:stun.l.google.com:19302` | Daftar server STUN dipisahkan koma untuk negosiasi ICE WebRTC. |
| `VITE_TURN_URL` | `@momentos/web` | *(kosong)* | Opsional: URL server TURN (`turn:turn.domain.com:3478`) untuk jaringan NAT ketat. |
| `VITE_TURN_USERNAME` | `@momentos/web` | *(kosong)* | Username kredensial TURN server. |
| `VITE_TURN_CREDENTIAL` | `@momentos/web` | *(kosong)* | Password/token kredensial TURN server. |
| `PORT` | `@momentos/server` | `4000` | Port HTTP & WebSocket server Node.js. |
| `HOST` | `@momentos/server` | `0.0.0.0` | Interface jaringan yang didengarkan oleh server. |
| `CORS_ORIGIN` | `@momentos/server` | `*` | Domain frontend yang diizinkan mengakses endpoint `/api/health` dan `/api/rooms/:code`. |

---

## 4. Langkah Deployment

### A. Deploy Backend Realtime (`@momentos/server`) — Railway / Render / Fly.io / VPS
1. Pastikan runtime menggunakan **Node.js v22.6+** atau **Node.js v24+** (mendukung eksekusi TypeScript native).
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
