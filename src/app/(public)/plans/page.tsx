import { db } from "@/lib/db";
import Link from "next/link";
import { Check, Crown } from "lucide-react";
import { auth } from "@/services/auth-service";
import { PaymentButton } from "@/components/payment-button";
import { getSetting } from "@/lib/settings";
export const dynamic = "force-dynamic";
export default async function Plans() {
  const user = await auth.currentUser();
  const [plans, provider, pakasirSlug, pakasirApiKey, aldiqrisApiKey] = await Promise.all([
    db.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }).catch(() => []),
    getSetting("PAYMENT_PROVIDER"),
    getSetting("PAKASIR_SLUG"),
    getSetting("PAKASIR_API_KEY"),
    getSetting("ALDIQRIS_API_KEY"),
  ]);
  const paymentConfigured = provider === "aldiqris"
    ? Boolean(aldiqrisApiKey)
    : provider === "pakasir" && Boolean(pakasirSlug && pakasirApiKey);
  return <main className="shell plans-page"><div className="plans-heading"><Crown size={30}/><h1>Pilih paket</h1><p className="muted">{user ? "Episode 1–8 gratis. Aktifkan paket untuk membuka episode selanjutnya." : "Daftar dan nikmati 8 episode gratis, lalu aktifkan paket untuk lanjut menonton."}</p></div><div className="plans-grid">{plans.map((p, index) => <article className={`panel plan-card${index === 1 ? " featured" : ""}`} key={p.id}>{index === 1 && <span className="plan-badge">Paling populer</span>}<h2>{p.name}</h2><div className="plan-price"><span>Rp</span><strong>{Number(p.price).toLocaleString("id-ID")}</strong></div><ul><li><Check size={16}/>Buka seluruh episode</li><li><Check size={16}/>Aktif selama {p.durationDays} hari</li></ul>{user ? (paymentConfigured ? <PaymentButton planId={p.id} /> : <button className="btn" type="button" disabled>Pembayaran segera tersedia</button>) : <Link className="btn" href={`/register?plan=${encodeURIComponent(p.slug)}`}>Pilih paket</Link>}</article>)}</div>{!plans.length && <div className="empty-state"><h2>Paket belum tersedia</h2><p>Silakan kembali beberapa saat lagi.</p></div>}</main>;
}
