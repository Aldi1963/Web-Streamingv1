# Known Issues Clipku Streaming

Daftar ini berisi masalah yang masih ada atau risiko yang perlu dipantau.

## Isu Utama

- Payment gateway production belum lengkap dan belum siap dianggap final.
- CRUD admin untuk endpoint, mapper, tester, dan sync masih belum interaktif penuh.
- Sync konten lintas provider masih perlu normalisasi tambahan.
- Fitur akun lanjutan seperti email verification, reset password, 2FA, dan logout semua device belum lengkap.
- Watch history, watchlist, favorite, review, notifikasi, dan analytics belum lengkap.
- Resolver khusus beberapa provider masih bisa berubah jika format API Clipku berubah.
- Testing integrasi dan E2E belum mencakup semua alur penting.

## Risiko Operasional

- Perubahan format dokumentasi Clipku bisa mempengaruhi hasil scan endpoint.
- Endpoint stream bisa kosong atau berubah, sehingga playback perlu fallback yang baik.
- Admin production harus tetap memakai kredensial yang hanya tersimpan di VPS.
- File video tidak boleh disimpan lokal, jadi cache hanya boleh berisi metadata dan referensi URL.
- Cron sync harus tetap dilindungi secret agar tidak bisa dipanggil sembarang orang.

## Workaround Saat Ini

- Gunakan `STATUS_PENGERJAAN.md` untuk melihat batas kesiapan saat ini.
- Gunakan `TODO_TEKNIS.md` untuk memilih prioritas kerja berikutnya.
- Gunakan health check script untuk cek kondisi env, API, database, dan cron.
- Jika playback gagal, cek dulu apakah URL dari API Clipku masih valid.

