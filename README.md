# Clipku Streaming

Platform streaming berlangganan berbasis Next.js, MySQL, Prisma, dan HLS.js. Seluruh metadata dan URL playback berasal dari `https://api.clipku.com` melalui backend. Project ini tidak menyediakan upload dan tidak menyimpan file video.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env`, lalu isi `AUTH_SECRET`.
2. Jalankan MySQL: `docker compose up -d mysql`.
3. Jalankan `npm install`.
4. Jalankan `npm run db:push && npm run db:seed`.
5. Jalankan `npm run dev`, buka `http://localhost:3000`.
6. Login admin dengan `admin@clipku.com` / `password`, lalu panggil `POST /api/admin/clipku/scan`.

Password seed wajib diganti sebelum production. Kredensial payment tidak pernah dikirim ke browser.

## Arsitektur dan aturan media

- Browser → internal API → `ClipkuApiService` → Clipku API.
- `ClipkuApiService` hanya mengirim GET, `Accept: application/json`, tanpa `Authorization`.
- Detail publik tidak menampilkan URL stream. `/api/watch/:contentId` baru menyelesaikan URL setelah auth dan validasi subscription.
- `streamv2` diprioritaskan lalu fallback ke `stream`.
- MySQL menyimpan metadata, cache respons, progress, user, paket, transaksi, serta referensi URL; bukan file media.
- Documentation reader membaca registry provider dari halaman explorer dan hanya mengimpor kategori Short Drama/Movie.

## Deploy VPS

Pasang Node.js 20+, MySQL 8, reverse proxy Nginx, dan TLS. Setelah clone: isi `.env`, `npm ci`, `npm run db:push`, `npm run db:seed`, `npm run build`, lalu jalankan `npm start` dengan systemd/PM2. Proxy port 3000 dan aktifkan HTTPS. Jalankan health check dengan `npm run check`.

Cron yang direkomendasikan: status API 15 menit, scan endpoint 6 jam, sync konten 1 jam, dan kategori 6 jam. Endpoint cron harus dilindungi secret scheduler sebelum production.

## Deploy cPanel

Gunakan “Setup Node.js App”, Node 20+, application root project, startup `node_modules/next/dist/bin/next start`, lalu isi environment melalui panel. Gunakan database MySQL dan user aplikasi terpisah, bukan akun root.

## Mapping respons

Admin menyimpan JSON mapping pada `ApiEndpoint.responseMappingJson`, misalnya `{"title":"data.title","poster_url":"data.poster"}`. Mapper mendukung jalur object nested. Untuk list, pilih root collection (`data.items`, `results`, dan sejenisnya) terlebih dahulu lalu map setiap item.

## Pembayaran

Schema transaksi dan konfigurasi Pakasir/Midtrans/Xendit tersedia. Implementasi webhook production wajib memverifikasi signature sesuai dokumentasi gateway, idempotent terhadap nomor invoice, dan baru mengaktifkan subscription setelah status terverifikasi.
