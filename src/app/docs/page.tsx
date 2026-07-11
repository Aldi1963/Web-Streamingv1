import Link from "next/link";
import { BookOpen, CheckCircle2, Code2, KeyRound, ShieldCheck, WalletCards } from "lucide-react";

const baseUrl = "https://drama.clipku.com";

const endpoints = [
  {
    method: "POST",
    path: "/api/admin/resellers",
    title: "Buat reseller dan API key",
    description: "Buat akun reseller baru. API key hanya tampil sekali pada response pembuatan.",
  },
  {
    method: "PATCH",
    path: "/api/admin/resellers",
    title: "Topup saldo reseller",
    description: "Tambah saldo reseller melalui API admin. Endpoint ini membutuhkan session admin.",
  },
  {
    method: "GET",
    path: "/api/reseller/plans",
    title: "Cek saldo dan paket",
    description: "Ambil saldo reseller terbaru beserta daftar paket aktif.",
  },
  {
    method: "POST",
    path: "/api/reseller/vouchers",
    title: "Buat voucher",
    description: "Buat satu atau beberapa voucher memakai saldo reseller.",
  },
  {
    method: "GET",
    path: "/api/reseller/vouchers/{externalRef}",
    title: "Cek order voucher",
    description: "Ambil ulang status order dan daftar voucher berdasarkan externalRef.",
  },
];

const authExample = `# Reseller endpoint
Authorization: Bearer ckrs_live_xxxxxxxxx

# Admin endpoint
Cookie: clipku_session=ADMIN_SESSION_TOKEN`;

const createResellerExample = `curl -X POST ${baseUrl}/api/admin/resellers \\
  -H "Content-Type: application/json" \\
  -H "Cookie: clipku_session=ADMIN_SESSION_TOKEN" \\
  -d '{
    "name": "Partner Store",
    "ownerEmail": "partner@example.com",
    "initialBalance": 100000
  }'`;

const createResellerResponseExample = `{
  "message": "Reseller dibuat. Simpan API key karena tidak akan ditampilkan lagi.",
  "reseller": {
    "id": "clx_reseller_id",
    "name": "Partner Store",
    "keyPreview": "ckrs_live_...abcd12",
    "balance": "100000.00",
    "isActive": true
  },
  "apiKey": "ckrs_live_xxxxxxxxx"
}`;

const balanceExample = `curl ${baseUrl}/api/reseller/plans \\
  -H "Authorization: Bearer ckrs_live_xxxxxxxxx"`;

const balanceResponseExample = `{
  "reseller": {
    "id": "clx_reseller_id",
    "name": "Partner Store",
    "balance": "150000.00"
  },
  "plans": [
    {
      "id": "clx_plan_id",
      "slug": "premium-30-hari",
      "name": "Premium 30 Hari",
      "price": "10000.00",
      "durationDays": 30
    }
  ]
}`;

const createVoucherExample = `curl -X POST ${baseUrl}/api/reseller/vouchers \\
  -H "Authorization: Bearer ckrs_live_xxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "planSlug": "premium-30-hari",
    "quantity": 5,
    "externalRef": "ORDER-APP-001"
  }'`;

const responseExample = `{
  "success": true,
  "idempotent": false,
  "order": {
    "id": "clx_order_id",
    "externalRef": "ORDER-APP-001",
    "status": "COMPLETED",
    "quantity": 5,
    "amount": "50000"
  },
  "vouchers": [
    {
      "code": "CKAB-CDEF-1234-5678",
      "durationDays": 30
    }
  ]
}`;

const checkVoucherExample = `curl ${baseUrl}/api/reseller/vouchers/ORDER-APP-001 \\
  -H "Authorization: Bearer ckrs_live_xxxxxxxxx"`;

const voucherStatusResponseExample = `{
  "order": {
    "id": "clx_order_id",
    "externalRef": "ORDER-APP-001",
    "status": "COMPLETED",
    "quantity": 5,
    "amount": "50000.00",
    "createdAt": "2026-07-11T08:00:00.000Z"
  },
  "plan": {
    "slug": "premium-30-hari",
    "name": "Premium 30 Hari",
    "durationDays": 30
  },
  "vouchers": [
    {
      "code": "CKAB-CDEF-1234-5678",
      "codePreview": "CKAB...5678",
      "status": "AVAILABLE",
      "redeemedAt": null,
      "expiresAt": null
    }
  ]
}`;

const topupBalanceExample = `curl -X PATCH ${baseUrl}/api/admin/resellers \\
  -H "Content-Type: application/json" \\
  -H "Cookie: clipku_session=ADMIN_SESSION_TOKEN" \\
  -d '{
    "id": "clx_reseller_id",
    "action": "UPDATE_RESELLER",
    "addBalance": 100000
  }'`;

const topupBalanceResponseExample = `{
  "message": "Reseller diperbarui.",
  "reseller": {
    "id": "clx_reseller_id",
    "name": "Partner Store",
    "keyPreview": "ckrs_live_...abcd12",
    "balance": "250000.00",
    "isActive": true,
    "updatedAt": "2026-07-11T08:10:00.000Z"
  }
}`;

const statusReferenceExample = `Order status:
- COMPLETED: voucher berhasil dibuat dan saldo sudah terpotong.

Voucher status:
- AVAILABLE: kode belum digunakan.
- REDEEMED: kode sudah dipakai user.
- EXPIRED: kode sudah melewati expiresAt.`;

const errorResponseExample = `{
  "message": "Saldo reseller tidak cukup."
}

Kode HTTP umum:
- 400: input tidak valid.
- 401: API key reseller salah atau tidak dikirim.
- 402: saldo reseller kurang.
- 403: session admin tidak valid.
- 404: paket, reseller, atau order tidak ditemukan.
- 422: request validasi bisnis ditolak.
- 429: terlalu banyak request.`;

export const metadata = {
  title: "Dokumentasi API Voucher Reseller - Clipku",
  description: "Panduan integrasi API voucher reseller Clipku.",
};

export default function DocsPage() {
  return (
    <main className="shell docs-page">
      <section className="docs-top">
        <div>
          <span className="docs-kicker"><BookOpen size={16} /> Clipku Docs</span>
          <h1>API Voucher Reseller</h1>
          <p>Integrasi untuk aplikasi partner yang ingin menjual voucher premium Clipku.</p>
        </div>
        <div className="docs-actions">
          <a className="btn" href="#buat-voucher">Contoh request</a>
          <Link className="btn ghost" href="/plans">Paket</Link>
        </div>
      </section>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <nav aria-label="Daftar isi dokumentasi">
            <a href="#ringkasan">Ringkasan</a>
            <a href="#otorisasi">Otorisasi</a>
            <a href="#endpoint">Endpoint</a>
            <a href="#buat-reseller">Buat reseller</a>
            <a href="#topup-saldo">Topup saldo</a>
            <a href="#cek-saldo">Cek saldo</a>
            <a href="#buat-voucher">Buat voucher</a>
            <a href="#cek-voucher">Cek voucher</a>
            <a href="#status-error">Status & error</a>
            <a href="#aturan">Aturan</a>
          </nav>
        </aside>

        <div className="docs-content">
          <section className="docs-grid" aria-label="Ringkasan integrasi" id="ringkasan">
            <article className="panel docs-card">
              <KeyRound size={22} />
              <h2>Bearer API key</h2>
              <p>API key dibuat admin dan dikirim di header <code>Authorization</code>.</p>
            </article>
            <article className="panel docs-card">
              <WalletCards size={22} />
              <h2>Saldo reseller</h2>
              <p>Voucher langsung memotong saldo reseller. Saldo kurang akan ditolak.</p>
            </article>
            <article className="panel docs-card">
              <ShieldCheck size={22} />
              <h2>Idempotent</h2>
              <p><code>externalRef</code> mencegah voucher dobel saat request diulang.</p>
            </article>
          </section>

          <section className="panel docs-section" id="otorisasi">
            <div className="docs-section-head">
              <ShieldCheck size={20} />
              <div>
                <h2>Otorisasi API</h2>
                <p>Endpoint reseller memakai Bearer API key. Endpoint admin untuk membuat reseller dan topup saldo memakai session admin.</p>
              </div>
            </div>
            <pre><code>{authExample}</code></pre>
          </section>

          <section className="panel docs-section" id="endpoint">
            <div className="docs-section-head">
              <Code2 size={20} />
              <div>
                <h2>Endpoint</h2>
                <p>Base URL: <code>{baseUrl}</code></p>
              </div>
            </div>
            <div className="docs-endpoints">
              {endpoints.map(endpoint => (
                <article className="docs-endpoint" key={endpoint.path}>
                  <span className="docs-method">{endpoint.method}</span>
                  <div>
                    <code>{endpoint.path}</code>
                    <strong>{endpoint.title}</strong>
                    <p>{endpoint.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="docs-two-col" id="buat-reseller">
            <article className="panel docs-section">
              <h2>Request buat reseller</h2>
              <p>Admin membuat reseller untuk owner yang sudah terdaftar. Simpan <code>apiKey</code> dari response karena hanya tampil sekali.</p>
              <pre><code>{createResellerExample}</code></pre>
            </article>
            <article className="panel docs-section">
              <h2>Response buat reseller</h2>
              <p><code>initialBalance</code> opsional. Jika diisi, saldo awal langsung masuk ke reseller baru.</p>
              <pre><code>{createResellerResponseExample}</code></pre>
            </article>
          </section>

          <section className="docs-two-col" id="topup-saldo">
            <article className="panel docs-section">
              <h2>Request topup saldo via API</h2>
              <p>Topup saldo dilakukan lewat API admin. Nilai <code>addBalance</code> bersifat increment, bukan mengganti saldo lama.</p>
              <pre><code>{topupBalanceExample}</code></pre>
            </article>
            <article className="panel docs-section">
              <h2>Response topup saldo</h2>
              <p>Response mengembalikan saldo terbaru reseller dan update tercatat di audit admin.</p>
              <pre><code>{topupBalanceResponseExample}</code></pre>
            </article>
          </section>

          <section className="docs-two-col" id="cek-saldo">
            <article className="panel docs-section">
              <h2>Request cek saldo</h2>
              <p>Gunakan API key reseller untuk mengambil saldo terbaru dan daftar paket yang bisa dibuat voucher.</p>
              <pre><code>{balanceExample}</code></pre>
            </article>
            <article className="panel docs-section">
              <h2>Response cek saldo</h2>
              <p>Nilai <code>balance</code> dan <code>price</code> dikembalikan sebagai decimal.</p>
              <pre><code>{balanceResponseExample}</code></pre>
            </article>
          </section>

          <section className="docs-two-col" id="buat-voucher">
            <article className="panel docs-section">
              <h2>Request buat voucher</h2>
              <p>Kirim <code>planId</code> atau <code>planSlug</code>, jumlah voucher, dan <code>externalRef</code>.</p>
              <pre><code>{createVoucherExample}</code></pre>
            </article>
            <article className="panel docs-section">
              <h2>Contoh response</h2>
              <p>Simpan <code>externalRef</code> dan kode voucher di sistem Anda.</p>
              <pre><code>{responseExample}</code></pre>
            </article>
          </section>

          <section className="docs-two-col" id="cek-voucher">
            <article className="panel docs-section">
              <h2>Request cek status voucher</h2>
              <p>Pakai <code>externalRef</code> yang sama dengan request pembuatan voucher.</p>
              <pre><code>{checkVoucherExample}</code></pre>
            </article>
            <article className="panel docs-section">
              <h2>Response status voucher</h2>
              <p>Status voucher menampilkan apakah kode masih tersedia atau sudah dipakai.</p>
              <pre><code>{voucherStatusResponseExample}</code></pre>
            </article>
          </section>

          <section className="docs-two-col" id="status-error">
            <article className="panel docs-section">
              <h2>Referensi status</h2>
              <p>Status order menunjukkan hasil pembuatan voucher. Status voucher menunjukkan apakah kode masih bisa dipakai.</p>
              <pre><code>{statusReferenceExample}</code></pre>
            </article>
            <article className="panel docs-section">
              <h2>Format error</h2>
              <p>Semua error utama dikembalikan sebagai JSON dengan field <code>message</code>. Validasi input dapat menyertakan field <code>issues</code>.</p>
              <pre><code>{errorResponseExample}</code></pre>
            </article>
          </section>

          <section className="panel docs-section" id="aturan">
            <h2>Aturan penting</h2>
            <ul className="docs-checklist">
              <li><CheckCircle2 size={17} /><span><strong>Simpan API key di server</strong>Jangan tanam API key di aplikasi mobile atau frontend publik.</span></li>
              <li><CheckCircle2 size={17} /><span><strong>Pakai externalRef unik</strong>Gunakan satu <code>externalRef</code> untuk satu order agar retry tidak membuat voucher dobel.</span></li>
              <li><CheckCircle2 size={17} /><span><strong>Batasi jumlah voucher</strong>Maksimal membuat 50 voucher dalam satu request.</span></li>
              <li><CheckCircle2 size={17} /><span><strong>Simpan dan cek order</strong>Voucher yang sudah dibuat bisa dicek ulang lewat endpoint status order.</span></li>
              <li><CheckCircle2 size={17} /><span><strong>Pisahkan akses topup</strong>Topup saldo memakai session admin, bukan API key reseller.</span></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
