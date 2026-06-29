# TODO Teknis Clipku Streaming

Dokumen ini berisi daftar pekerjaan teknis yang masih perlu diselesaikan. Urutan di bawah mengikuti prioritas implementasi.

## P0 - Wajib Selesai Dulu

- [ ] Selesaikan payment gateway production:
  - Pakasir
  - Midtrans
  - Xendit
  - manual transfer
  - QRIS
  - webhook signature verification
  - invoice PDF
- [ ] Lengkapi admin UI interaktif:
  - endpoint editor
  - tester
  - mapper
  - sync UI
  - settings panel
- [ ] Stabilkan sync konten dan episode lintas provider.
- [ ] Tambahkan proteksi akun:
  - email verification
  - forgot/reset password
  - logout semua device
  - device fingerprint
  - brute-force protection yang persisten
- [ ] Lengkapi playback flow:
  - subtitle selector
  - quality selector
  - auto-next episode
  - fallback playback yang lebih aman

## P1 - Sangat Disarankan

- [ ] Watch history dan continue watching.
- [ ] Watchlist dan favorite API lengkap.
- [ ] Review, rating, like/dislike, dan moderasi review.
- [ ] Notifikasi in-app dan email.
- [ ] Kupon dan diskon paket.
- [ ] SEO editor dan pengaturan halaman publik.
- [ ] Analytics dasar untuk user, tontonan, dan pendapatan.
- [ ] Cron secret untuk endpoint sync dan maintenance.
- [ ] Audit log yang lebih lengkap.
- [ ] Backup database terjadwal.

## P2 - Penyempurnaan

- [ ] Google OAuth optional.
- [ ] Turnstile di semua form penting.
- [ ] 2FA optional.
- [ ] Rate limiter terdistribusi.
- [ ] Perapihan UI mobile bottom navigation.
- [ ] Perapihan dashboard admin dan dashboard user.
- [ ] Testing integrasi dan E2E.

## Catatan

- Tidak ada fitur upload video.
- Tidak ada penyimpanan file video lokal.
- Semua playback tetap harus lewat backend dan hanya mengarah ke URL dari API Clipku.
- Semua perubahan content tetap harus menjaga cache metadata, bukan file media.

