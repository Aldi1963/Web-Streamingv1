# Deployment Status Clipku Streaming

## Produksi

- Domain utama: `https://drama.clipku.com`
- Server: VPS Ubuntu `43.133.138.219`
- Aplikasi frontend: Next.js
- Service produksi: `clipku-streaming.service`
- Reverse proxy: Nginx
- TLS: Let's Encrypt aktif
- Port internal app: `3100`
- API Clipku existing di server tetap di `127.0.0.1:5000`

## Yang Sudah Aktif

- [x] Project sudah terpasang di VPS pada `/home/ubuntu/clipku-streaming`
- [x] HTTPS aktif di domain produksi
- [x] Build production sudah pernah berhasil dijalankan
- [x] Service systemd sudah tersedia
- [x] Database MySQL terpisah sudah dipakai untuk project ini
- [x] Swap 2 GB sudah dibuat untuk membantu build Next.js
- [x] Endpoint internal dasar sudah jalan
- [x] Halaman publik dan player dasar sudah bisa diakses
- [x] Dokumentasi API Clipku sudah pernah di-scan dan disimpan

## Yang Perlu Dijaga Saat Deploy

- [ ] Jangan menimpa service API Clipku yang sudah ada di port 5000.
- [ ] Jangan simpan file video lokal di server.
- [ ] Jangan aktifkan upload video.
- [ ] Jangan expose stream URL di halaman detail publik.
- [ ] Pastikan request playback tetap lewat backend.
- [ ] Pastikan file status dan README ikut disinkronkan saat update dokumentasi.

## Langkah Deploy Ulang Singkat

1. Upload perubahan kode ke `/home/ubuntu/clipku-streaming`.
2. Jalankan `npm ci` jika dependency berubah.
3. Jalankan `npm run build`.
4. Restart `clipku-streaming.service`.
5. Cek halaman utama dan halaman watch.
6. Cek log service dan log Nginx bila ada error.

## Catatan Operasional

- Kredensial admin production disimpan hanya di VPS dan tidak boleh dipublikasikan.
- Health check tetap perlu dijalankan setelah perubahan besar.
- Sinkronisasi ke VPS harus menjaga agar file dokumentasi lokal dan server tetap sama.

