# Daftar Endpoint Penting

Dokumen ini berisi endpoint internal yang paling sering dipakai saat pengembangan dan operasional.

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/me`

## Content

- `GET /api/providers`
- `GET /api/contents`
- `GET /api/contents/{slug}`
- `GET /api/provider/{provider}`
- `GET /api/search`
- `GET /api/trending`
- `GET /api/latest`
- `GET /api/popular`
- `GET /api/recommend`

## Watch

- `POST /api/watch/{contentId}`
- `POST /api/watch-progress`
- `GET /api/watch-history`
- `GET /api/continue-watching`

## Subscription

- `GET /api/plans`
- `POST /api/checkout`
- `GET /api/user/subscription`
- `GET /api/user/payments`
- `GET /api/user/invoices`

## Payment

- `POST /api/payment/webhook`
- `GET /api/payment/status/{invoiceId}`

## Watchlist

- `GET /api/watchlist`
- `POST /api/watchlist`
- `DELETE /api/watchlist/{id}`

## Favorite

- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/{id}`

## Admin Clipku

- `GET /api/admin/clipku/status`
- `POST /api/admin/clipku/fetch-documentation`
- `POST /api/admin/clipku/scan`
- `GET /api/admin/clipku/providers`
- `GET /api/admin/clipku/endpoints`
- `POST /api/admin/clipku/endpoints`
- `PUT /api/admin/clipku/endpoints/{id}`
- `DELETE /api/admin/clipku/endpoints/{id}`
- `POST /api/admin/clipku/test`
- `POST /api/admin/clipku/sync`
- `GET /api/admin/clipku/logs`
- `POST /api/admin/clipku/cache/clear`

