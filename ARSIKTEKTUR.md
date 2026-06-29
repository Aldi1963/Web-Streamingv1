# Arsitektur Clipku Streaming

## Alur Utama

Browser
→ Next.js frontend
→ internal API backend
→ `ClipkuApiService`
→ `https://api.clipku.com`

## Lapisan Sistem

- Frontend: halaman publik, dashboard user, admin panel, dan player.
- Backend: route API internal, auth, watch access, admin Clipku, dan sync.
- Service layer: `AuthService`, `ContentService`, `WatchService`, `ClipkuApiService`.
- Database: MySQL via Prisma untuk metadata, cache, user, subscription, payment, dan log.

## Aturan Media

- Tidak ada upload video.
- Tidak ada penyimpanan file video lokal.
- Semua stream URL hanya diminta saat user klik tonton.
- URL stream tidak ditampilkan di detail publik.
- Playback harus lewat backend.

## Komponen Penting

- `ClipkuApiService` menangani GET ke Clipku tanpa API key dan tanpa authorization header.
- `ContentService` menangani normalisasi dan cache metadata.
- `WatchService` menangani validasi akses tonton.
- `VideoPlayer` menangani HLS dan MP4 dari URL API.

## Data yang Disimpan Lokal

- Metadata konten.
- Cache response API.
- Provider dan endpoint.
- Subscription dan payment.
- Progress tontonan.
- Watchlist, favorite, review, dan log.

