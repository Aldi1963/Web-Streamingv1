# Status Pengerjaan Clipku Streaming

Tanggal: 28 Juni 2026

Dokumen ini merangkum bagian yang sudah dikerjakan dan yang belum selesai dari project `Clipku Streaming`.

## Sudah Dikerjakan

- [x] Project Next.js + TypeScript sudah dibuat dan bisa jalan sebagai full-stack app.
- [x] Integrasi dasar ke `https://api.clipku.com` sudah dibuat melalui backend, tanpa API key, tanpa bearer token, dan tanpa authorization header.
- [x] Service utama sudah ada:
  - `AuthService`
  - `ContentService`
  - `WatchService`
  - `ClipkuApiService`
- [x] API documentation reader dan scanner endpoint sudah ada untuk membaca dokumentasi Clipku dari backend.
- [x] Endpoint Clipku yang sudah terdeteksi dan disimpan ke database sudah mencapai 120 endpoint Short Drama/Movie.
- [x] Seed data awal sudah dibuat:
  - akun admin default
  - akun user demo
  - paket langganan default
- [x] Database schema sudah mencakup:
  - user dan role
  - sesi device
  - paket dan subscription
  - pembayaran dan invoice
  - konten, episode, cache API, log API, dan sync log
  - watchlist, favorite, review, progress
- [x] UI publik dasar sudah tersedia:
  - landing page
  - browse
  - detail drama
  - provider page
  - plans
  - login dan register
- [x] Dashboard user dan shell admin panel sudah dibuat.
- [x] Video player dasar sudah tersedia untuk HLS dan MP4 URL dari API.
- [x] Watch access sudah diproteksi dengan login dan subscription aktif.
- [x] Stream URL tidak ditampilkan di halaman detail; URL baru diminta saat user klik tombol tonton.
- [x] Endpoint internal dasar sudah dibuat untuk auth, content, providers, watch, dan admin clipku.
- [x] Health check script sudah ada untuk mengecek env, database, API Clipku, dokumentasi, permission, cache, log, payment, dan cron.
- [x] Deploy VPS dan HTTPS di `https://drama.clipku.com` sudah dilakukan.
- [x] Mirror konten ke VPS dan build production sudah pernah berhasil dijalankan.

## Sudah Sebagian

- [~] Scan katalog konten sudah berjalan, dan 90 judul awal berhasil disimpan beserta poster.
- [~] Playback beberapa provider sudah diuji dan berhasil, termasuk MP4 dan HLS.
- [~] Resolver stream sudah mendukung prioritas `streamv2` lalu `stream`.
- [~] Beberapa halaman frontend sudah terhubung ke data API/cache, tetapi belum semuanya lengkap seperti target spesifikasi awal.

## Belum Dikerjakan / Belum Selesai

- [ ] CRUD admin penuh masih belum interaktif untuk semua halaman:
  - API endpoint editor
  - tester
  - mapper
  - sync UI
  - settings panel lengkap
- [ ] Sync konten dan episode lintas seluruh provider masih belum selesai penuh dan masih perlu normalisasi yang lebih kuat.
- [ ] Payment gateway production belum selesai:
  - Pakasir
  - Midtrans
  - Xendit
  - manual transfer
  - QRIS
  - invoice PDF
  - webhook signature verification
- [ ] Email verification, forgot/reset password, Google OAuth, Turnstile, 2FA, brute-force persistence, dan logout semua device belum selesai.
- [ ] Watch history, continue watching, watchlist, favorite, review, rating, notifikasi, kupon, analytics, dan SEO editor belum lengkap.
- [ ] Rate limiting terdistribusi, CSRF untuk form, audit log menyeluruh, backup, dan cron secret masih perlu dirapikan sebelum production serius.
- [ ] Resolver khusus DramaNova `/play` dan fitur player lanjutan seperti subtitle selector, quality selector, auto-next, dan signed playback proxy belum selesai penuh.
- [ ] Testing integrasi dan E2E belum lengkap.

## Catatan Produksi

Project ini sudah menjadi fondasi yang bisa dijalankan, tetapi belum boleh dianggap selesai 100% sesuai spesifikasi besar awal.

Sebelum dipakai untuk transaksi nyata, yang paling penting masih perlu diselesaikan:

1. payment gateway
2. admin UI penuh
3. sync konten yang lebih robust
4. fitur akun dan device management
5. testing dan hardening keamanan

## Referensi

- [README.md](./README.md)
- [PROGRESS.md](./PROGRESS.md)
