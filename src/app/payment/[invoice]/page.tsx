import QRCode from "qrcode";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CheckCircle2, Clock3, Copy, QrCode, ShieldCheck, XCircle } from "lucide-react";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { PaymentInvoiceStatus } from "@/components/payment-invoice-status";
import { RedeemCodeCopyButton } from "@/components/redeem-code-copy-button";
import { expirePendingPayments } from "@/services/payment-expiry-service";

export const dynamic = "force-dynamic";

function payloadString(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const record = payload as Record<string, unknown>;
  const value = record[key];
  if (typeof value === "string") return value;
  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) continue;
    const nestedValue = (nested as Record<string, unknown>)[key];
    if (typeof nestedValue === "string") return nestedValue;
  }
}

function payloadPurpose(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "subscription";
  const purpose = (payload as Record<string, unknown>).purpose;
  return purpose === "redeem_code" ? "redeem_code" : "subscription";
}

export default async function PaymentInvoicePage({ params }: {
  params: Promise<{ invoice: string }>;
}) {
  const user = await auth.currentUser();
  if (!user) redirect("/login");
  const { invoice } = await params;
  await expirePendingPayments();
  const payment = await db.payment.findUnique({
    where: { invoiceNumber: invoice },
    include: {
      redeemCodes: {
        select: { code: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!payment || payment.userId !== user.id) notFound();
  const plan = payment.planId
    ? await db.plan.findUnique({ where: { id: payment.planId }, select: { name: true } })
    : null;
  const purpose = payloadPurpose(payment.payload);
  const redeemCode = payment.redeemCodes[0];
  const rawQris = payloadString(payment.payload, "raw_qris");
  const paylink = payloadString(payment.payload, "paylink");
  const qrDataUrl = rawQris
    ? await QRCode.toDataURL(rawQris, { width: 420, margin: 2, errorCorrectionLevel: "M" })
    : null;
  const canPay = payment.status === "PENDING";
  const statusLabel = payment.status === "PAID"
    ? "Lunas"
    : payment.status === "PENDING"
      ? "Menunggu QRIS"
      : "Gagal";

  return <main className="shell invoice-page">
    <section className="invoice-shell">
      <header className="invoice-topbar">
        <div>
          <p className="eyebrow">Invoice</p>
          <h1>{purpose === "redeem_code" ? `Kode ${plan?.name || "Clipku"}` : plan?.name || "Paket Clipku"}</h1>
        </div>
        <PaymentInvoiceStatus invoiceNumber={payment.invoiceNumber} initialStatus={payment.status}/>
      </header>

      <section className="invoice-card invoice-main-card">
        <div className="invoice-amount">
          <span>Total</span>
          <strong>Rp{Number(payment.amount).toLocaleString("id-ID")}</strong>
        </div>
        <div className="invoice-meta-grid">
          <div><Copy size={15}/><span>Invoice</span><code>{payment.invoiceNumber}</code></div>
          <div><ShieldCheck size={15}/><span>Status</span><strong>{statusLabel}</strong></div>
          <div><Clock3 size={15}/><span>Batas waktu</span><strong>{payment.expiresAt ? payment.expiresAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "1 jam setelah dibuat"}</strong></div>
        </div>
      </section>

      <section className="invoice-card invoice-focus-card">
        {qrDataUrl && canPay ? (
          <>
            <div className="invoice-section-heading">
              <QrCode size={18}/>
              <div><h2>Scan QRIS</h2><p>Gunakan bank atau e-wallet yang mendukung QRIS.</p></div>
            </div>
            <div className="invoice-qr"><img src={qrDataUrl} alt={`QRIS invoice ${payment.invoiceNumber}`}/></div>
          </>
        ) : payment.status === "PAID" ? (
          <div className="invoice-paid invoice-result">
            <CheckCircle2 size={42}/>
            <h2>Pembayaran berhasil</h2>
            <p>{purpose === "redeem_code" ? "Kode redeem tersedia di bawah." : "Paket sudah aktif di akun Anda."}</p>
            {redeemCode && <div className="invoice-code-box">
              <code>{redeemCode.code}</code>
              <RedeemCodeCopyButton code={redeemCode.code} />
            </div>}
          </div>
        ) : !canPay ? (
          <div className="invoice-paid invoice-result invoice-failed"><XCircle size={42}/><h2>Transaksi gagal</h2><p>Batas waktu pembayaran sudah lewat. Silakan buat transaksi baru.</p></div>
        ) : (
          <div className="invoice-paid invoice-result"><QrCode size={42}/><h2>QRIS belum tersedia</h2><p>Silakan buat pembayaran baru dari halaman paket.</p>{paylink && <p className="muted">Link gateway tersimpan sebagai cadangan sistem.</p>}</div>
        )}
      </section>

      <nav className="invoice-actions" aria-label="Aksi invoice">
        <Link className="btn btn-secondary" href="/dashboard">Dashboard</Link>
        <Link className="btn" href="/plans">Pilih paket</Link>
      </nav>
    </section>
  </main>;
}
