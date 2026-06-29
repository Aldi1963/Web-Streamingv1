# Status pengerjaan Clipku Streaming

Tanggal: 28 Juni 2026

## Deployment VPS

- Aktif di `https://drama.clipku.com` melalui Nginx dan Let's Encrypt.
- Service systemd: `clipku-streaming.service`, bind internal port `3100`.
- Database MySQL terpisah: `clipku_streaming`; API existing di port 5000 tidak diubah.
- Scanner dokumentasi berhasil menyimpan 120 endpoint Short Drama/Movie.
- Katalog awal berhasil menyimpan 90 judul beserta poster dari Melolo, FreeReels, FlickReels, dan DramaBox.
- Playback akun demo telah diuji untuk keempat provider: DramaBox MP4, FlickReels HLS, FreeReels HLS, dan Melolo MP4.
- VPS memiliki swap 2 GB agar build Next.js tidak menghabiskan RAM.
- Password admin production tidak lagi memakai `password`. Kredensial awal tersimpan hanya di VPS: `/home/ubuntu/clipku-admin-credentials.txt` dengan permission `600`.
- Health-check: database, Clipku API, dokumentasi, permission, cache, dan log berstatus OK. Payment gateway dan scheduler sync masih WARNING karena belum dikonfigurasi.

## Sudah dibuat

- Next.js full-stack, TypeScript, responsive dark streaming UI, landing, browse, kategori, provider, detail, paket, login/register, dashboard user, player, dan shell admin.
- MySQL/Prisma schema untuk user, role, session device, paket, subscription, pembayaran, endpoint/log/sync/cache API, konten, episode, progress, watchlist, favorite, dan review.
- `ClipkuApiService`: documentation reader, scanner Short Drama/Movie, proxy GET tanpa auth Clipku, cache, log, mapper nested JSON, fungsi home/latest/popular/search/detail/stream/language/category/ranking/recommend.
- Playback protected: login + subscription aktif, `streamv2` → `stream`, URL hanya diminta pada halaman watch, HLS/MP4 player, retry/error state.
- Internal API dasar: auth, me, providers, contents, detail, watch, scan endpoint, daftar endpoint, clear cache.
- Seed akun default dan empat paket default.
- Security header, cookie HttpOnly, bcrypt cost 12, validasi Zod, ORM parameterized query.
- Health-check untuk env, database, API, docs, permission, cache, log, payment, cron.
- Docker MySQL/Redis, panduan VPS/cPanel, dan unit test mapper/reader.

## Belum selesai / tidak boleh dianggap production-ready

- CRUD lengkap semua halaman admin saat ini masih berupa shell; endpoint editor/tester/mapper/sync UI belum interaktif.
- Sync konten/episode lintas seluruh provider dan normalisasi response per provider belum selesai. Scanner endpoint sudah ada, tetapi perlu diuji terhadap setiap perubahan format dokumentasi.
- Pakasir, Midtrans, Xendit, invoice PDF, signature webhook, manual transfer, dan aktivasi subscription belum diimplementasikan.
- Email verification/reset, Google OAuth, Turnstile, 2FA, brute-force persistence, logout device, dan device fingerprint belum selesai.
- Watch progress, watch history, watchlist/favorite/review API, notifikasi, kupon, analytics, SEO editor, dan settings persistence belum selesai.
- Rate limiter terdistribusi, CSRF token untuk form, audit log menyeluruh, backup, cron route dengan secret, serta test integrasi/E2E belum selesai.
- Resolver khusus DramaNova `/play`, quality/subtitle selector, auto-next, dan signed short-lived playback proxy belum selesai.

Project ini adalah fondasi fungsional, bukan klaim bahwa seluruh spesifikasi besar sudah selesai. Sebelum menerima pembayaran nyata, selesaikan daftar di atas, audit hak tayang setiap provider, audit keamanan, dan lakukan pengujian staging.
