# Rilis Versi 1 - Clipku Streaming

## Tujuan Rilis

Versi ini menandai baseline project yang sudah bisa dijalankan di VPS dan dipakai sebagai fondasi pengembangan lanjut.

## Yang Sudah Masuk Rilis

- Next.js full-stack app.
- Integrasi backend ke `https://api.clipku.com` tanpa API key.
- API documentation reader dan scanner.
- Dashboard user dan shell admin.
- Player dasar untuk HLS dan MP4.
- Proteksi watch dengan login dan subscription aktif.
- Seed admin, user demo, dan paket default.
- Deploy produksi ke `https://drama.clipku.com`.

## Batas Rilis

- Payment gateway production belum final.
- Admin CRUD belum lengkap.
- Sync konten lintas provider belum sepenuhnya stabil.
- Fitur akun lanjutan belum lengkap.
- Watch history, notifikasi, review, dan analytics belum final.
- Testing integrasi belum lengkap.

## Catatan Teknis

- Tidak ada upload video.
- Tidak ada penyimpanan file video lokal.
- Playback harus tetap lewat backend.
- Stream URL hanya diminta saat user klik tonton.

## Langkah Sesudah Rilis

1. Selesaikan payment gateway.
2. Lengkapi admin panel.
3. Stabilkan sync konten.
4. Lengkapi proteksi akun dan device.
5. Tambahkan testing dan hardening keamanan.

