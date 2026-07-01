import QRCode from "qrcode";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ExternalLink, QrCode } from "lucide-react";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { PaymentInvoiceStatus } from "@/components/payment-invoice-status";

export const dynamic = "force-dynamic";

function payloadString(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

export default async function PaymentInvoicePage({ params }: {
  params: Promise<{ invoice: string }>;
}) {
  const user = await auth.currentUser();
  if (!user) redirect("/login");
  const { invoice } = await params;
  const payment = await db.payment.findUnique({ where: { invoiceNumber: invoice } });
  if (!payment || payment.userId !== user.id) notFound();
  const plan = payment.planId
    ? await db.plan.findUnique({ where: { id: payment.planId }, select: { name: true } })
    : null;
  const rawQris = payloadString(payment.payload, "raw_qris");
  const paylink = payloadString(payment.payload, "paylink");
  const qrDataUrl = rawQris
    ? await QRCode.toDataURL(rawQris, { width: 420, margin: 2, errorCorrectionLevel: "M" })
    : null;

  return <main className="shell invoice-page">
    <section className="panel invoice-card">
      <div className="invoice-heading"><span className="invoice-icon"><QrCode size={28}/></span><div><p className="eyebrow">Invoice pembayaran</p><h1>{plan?.name || "Paket Clipku"}</h1></div></div>
      <PaymentInvoiceStatus invoiceNumber={payment.invoiceNumber} initialStatus={payment.status}/>
      {qrDataUrl && payment.status !== "PAID" && <div className="invoice-qr"><img src={qrDataUrl} alt={`QRIS invoice ${payment.invoiceNumber}`}/><p>Scan QRIS menggunakan GoPay atau aplikasi pembayaran Anda.</p></div>}
      <div className="invoice-details">
        <div><span>Total pembayaran</span><strong>Rp{Number(payment.amount).toLocaleString("id-ID")}</strong></div>
        <div><span>Nomor invoice</span><code>{payment.invoiceNumber}</code></div>
        {payment.expiresAt && <div><span>Berlaku sampai</span><strong>{payment.expiresAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</strong></div>}
      </div>
      <div className="invoice-actions">
        {paylink && payment.status !== "PAID" && <a className="btn btn-secondary" href={paylink} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Buka halaman cadangan</a>}
        <Link className="btn btn-secondary" href="/dashboard">Kembali ke dashboard</Link>
      </div>
    </section>
  </main>;
}
