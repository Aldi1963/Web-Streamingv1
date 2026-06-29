# Checklist Production Clipku Streaming

Gunakan daftar ini sebelum menganggap project siap live penuh.

## Infrastruktur

- [ ] Domain produksi aktif dan mengarah ke VPS.
- [ ] HTTPS valid dan auto-renew bekerja.
- [ ] Service app berjalan stabil.
- [ ] Reverse proxy Nginx konfigurasi benar.
- [ ] API Clipku existing tidak tertimpa.
- [ ] Swap dan resource server cukup untuk build dan runtime.

## Aplikasi

- [ ] Login, register, logout, dan session stabil.
- [ ] Admin panel bisa diakses sesuai role.
- [ ] Halaman publik utama bisa dimuat tanpa error.
- [ ] Watch page bisa membuka player penuh layar.
- [ ] Stream URL tidak tampil di halaman detail.
- [ ] Playback hanya lewat backend.

## Data dan API

- [ ] Scanner dokumentasi Clipku berjalan.
- [ ] Endpoint manager bisa menyimpan hasil scan.
- [ ] Sync konten dan episode berjalan sesuai provider.
- [ ] Cache metadata tersimpan dengan benar.
- [ ] Log API dan log sync tersimpan.

## Monetisasi

- [ ] Payment gateway terhubung.
- [ ] Webhook payment diverifikasi.
- [ ] Subscription aktif otomatis setelah pembayaran sukses.
- [ ] Invoice bisa dibaca dari dashboard.
- [ ] Paket langganan default sudah tersedia.

## Keamanan

- [ ] Password hashing aktif.
- [ ] Cookie session aman.
- [ ] Validasi input aktif.
- [ ] Rate limit aktif.
- [ ] CSRF form penting aktif.
- [ ] Admin credential tidak dipublikasikan.
- [ ] Upload video tetap nonaktif.

## Operasional

- [ ] Health check bisa dijalankan.
- [ ] Log error dipantau.
- [ ] Backup database terjadwal.
- [ ] Cron job dilindungi secret.
- [ ] Dokumentasi status selalu diperbarui.

