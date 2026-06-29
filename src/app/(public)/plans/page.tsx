import { db } from "@/lib/db";
import Link from "next/link";
import { Check, Crown } from "lucide-react";
import { auth } from "@/services/auth-service";
import { PaymentButton } from "@/components/payment-button";
import { getSetting } from "@/lib/settings";
export const dynamic = "force-dynamic";
export default async function Plans() {
  const user = await auth.currentUser();
  const [plans, pakasirSlug, pakasirApiKey] = await Promise.all([
    db.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }).catch(() => []),
    getSetting("PAKASIR_SLUG"),
    getSetting("PAKASIR_API_KEY"),
  ]);
  const paymentConfigured = Boolean(pakasirSlug && pakasirApiKey);
  return <main className="shell plans-page"><div className="plans-heading"><Crown size={30}/><h1>Pilih paket</h1><p className="muted">{user ? "Pilih paket dan lanjutkan pembayaran aman melalui QRIS." : "Tonton tanpa batas dengan paket yang sesuai kebutuhan Anda."}</p></div><div className="plans-grid">{plans.map((p, index) => <article className={`panel plan-card${index === 1 ? " featured" : ""}`} key={p.id}>{index === 1 && <span className="plan-badge">Paling populer</span>}<h2>{p.name}</h2><div className="plan-price"><span>Rp</span><strong>{Number(p.price).toLocaleString("id-ID")}</strong></div><ul><li><Check size={16}/>{p.durationDays} hari akses</li><li><Check size={16}/>{p.maxDevices} perangkat</li><li><Check size={16}/>Resolusi hingga {p.maxResolution}</li></ul>{user ? (paymentConfigured ? <PaymentButton planId={p.id} /> : <button className="btn" type="button" disabled>Pembayaran segera tersedia</button>) : <Link className="btn" href={`/register?plan=${encodeURIComponent(p.slug)}`}>Pilih paket</Link>}</article>)}</div>{!plans.length && <div className="empty-state"><h2>Paket belum tersedia</h2><p>Silakan kembali beberapa saat lagi.</p></div>}</main>;
}
