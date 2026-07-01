import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeDollarSign, CreditCard, Layers3, ShieldCheck } from "lucide-react";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { AdminLayout } from "@/components/admin-layout";
import { AdminConsole } from "@/components/admin-console";
import { AdminPlans } from "@/components/admin-plans";

const tabs = [
  { key: "plans", label: "Paket", hint: "Atur harga dan durasi" },
  { key: "subscriptions", label: "Langganan", hint: "Pantau status aktif" },
  { key: "payments", label: "Pembayaran", hint: "Cek transaksi terbaru" },
  { key: "invoices", label: "Invoice", hint: "Audit tagihan dan status" },
] as const;

const tabSections = new Set(["plans", "subscriptions", "payments", "invoices"]);

function metric(value: number | string, label: string, Icon: typeof BadgeDollarSign) {
  return (
    <article className="panel monetization-metric">
      <Icon size={18} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

export default async function MonetizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await auth.currentUser();
  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) redirect("/login");

  const { tab } = await searchParams;
  const activeTab = tabSections.has(tab || "") ? (tab as string) : "plans";
  const [activeSubscriptions, pendingPayments, activePlans, totalPlans] = await Promise.all([
    db.subscription.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.plan.count({ where: { isActive: true } }),
    db.plan.count(),
  ]);

  return (
    <main className="admin-context">
      <AdminLayout
        role={user.role}
        title="Monetisasi"
        subtitle="Kelola paket, langganan aktif, dan status pembayaran dalam satu layar"
      >
        <section className="monetization-page">
          <div className="panel monetization-hero">
            <div>
              <p className="eyebrow">Monetisasi</p>
              <h2>Kontrol paket dan transaksi</h2>
              <p>
                Fokus ke paket aktif, langganan berjalan, dan pembayaran yang masih menunggu
                verifikasi. Tab di bawah menukar konteks tanpa memindahkan alur kerja.
              </p>
            </div>
            <div className="monetization-hero-actions">
              <Link className="btn btn-secondary" href="/admin/subscriptions">
                <ShieldCheck size={16} /> Langganan
              </Link>
              <Link className="btn" href="/admin/payments">
                <ArrowRight size={16} /> Transaksi
              </Link>
            </div>
          </div>

          <div className="monetization-summary">
            {metric(activePlans, "Paket aktif", Layers3)}
            {metric(totalPlans, "Total paket", BadgeDollarSign)}
            {metric(activeSubscriptions, "Langganan aktif", ShieldCheck)}
            {metric(pendingPayments, "Pembayaran pending", CreditCard)}
          </div>

          <nav className="monetization-tabs" aria-label="Tab monetisasi">
            {tabs.map((item) => {
              const href = `/admin/monetization?tab=${item.key}`;
              const active = activeTab === item.key;
              return (
                <Link key={item.key} href={href} className={`monetization-tab${active ? " active" : ""}`}>
                  <span>{item.label}</span>
                  <small>{item.hint}</small>
                </Link>
              );
            })}
          </nav>

          <div className="monetization-content">
            {activeTab === "plans" ? (
              <AdminPlans />
            ) : (
              <AdminConsole section={activeTab} />
            )}
          </div>
        </section>
      </AdminLayout>
    </main>
  );
}
