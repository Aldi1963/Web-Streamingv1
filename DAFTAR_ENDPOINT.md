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

## Reseller Voucher API

Endpoint reseller memakai header `Authorization: Bearer {apiKeyReseller}`.

- `GET /api/reseller/plans`
  - Cek saldo reseller dan daftar paket aktif.
  - Response utama: `reseller.id`, `reseller.name`, `reseller.balance`, dan `plans[]`.
- `POST /api/reseller/vouchers`
  - Buat voucher memakai saldo reseller.
  - Body: `planId` atau `planSlug`, `quantity` 1-50, `externalRef` unik, opsional `expiresInDays`.
- `GET /api/reseller/vouchers/{externalRef}`
  - Cek status order voucher berdasarkan `externalRef`.
  - Response utama: `order.status`, `order.amount`, `plan`, dan `vouchers[]` berisi `code`, `status`, `redeemedAt`, `expiresAt`.

Contoh cek saldo:

```bash
curl https://drama.clipku.com/api/reseller/plans \
  -H "Authorization: Bearer ckrs_live_xxxxxxxxx"
```

Contoh cek status voucher:

```bash
curl https://drama.clipku.com/api/reseller/vouchers/ORDER-APP-001 \
  -H "Authorization: Bearer ckrs_live_xxxxxxxxx"
```

## Admin Reseller API

Endpoint admin memakai session admin web, bukan API key reseller.

- `GET /api/admin/resellers`
  - Lihat reseller, saldo, status aktif, dan pengajuan reseller pending.
- `POST /api/admin/resellers`
  - Buat reseller baru dan API key reseller.
  - Body: `name`, `ownerEmail`, opsional `initialBalance`.
- `PATCH /api/admin/resellers`
  - Update reseller atau proses pengajuan.
  - Untuk topup saldo, kirim `action: "UPDATE_RESELLER"`, `id`, dan `addBalance`.

Contoh topup saldo via API admin:

```bash
curl -X PATCH https://drama.clipku.com/api/admin/resellers \
  -H "Content-Type: application/json" \
  -H "Cookie: clipku_session=ADMIN_SESSION_TOKEN" \
  -d '{
    "id": "clx_reseller_id",
    "action": "UPDATE_RESELLER",
    "addBalance": 100000
  }'
```

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
