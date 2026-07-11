import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeDollarSign, CreditCard, Gift, Layers3, ReceiptText, ShieldCheck, Store } from "lucide-react";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { AdminLayout } from "@/components/admin-layout";
import { AdminConsole } from "@/components/admin-console";
import { AdminPlans } from "@/components/admin-plans";
import { AdminResellers } from "@/components/admin-resellers";
import { AdminVouchers } from "@/components/admin-vouchers";

const tabs = [
  { key: "plans", label: "Paket", Icon: Layers3 },
  { key: "subscriptions", label: "Langganan", Icon: ShieldCheck },
  { key: "payments", label: "Pembayaran", Icon: CreditCard },
  { key: "invoices", label: "Invoice", Icon: ReceiptText },
  { key: "vouchers", label: "Voucher", Icon: Gift },
  { key: "resellers", label: "Reseller", Icon: Store },
] as const;

const tabSections = new Set(["plans", "subscriptions", "payments", "invoices", "vouchers", "resellers"]);

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
      >
        <section className="monetization-page">
          <div className="monetization-topbar">
            <div className="monetization-title">
              <p className="eyebrow">Monetisasi</p>
              <h2>Paket, pembayaran, dan langganan</h2>
            </div>
            <span className="monetization-current">
              {tabs.find((item) => item.key === activeTab)?.label || "Paket"}
            </span>
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
                  <item.Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="monetization-content">
            {activeTab === "plans" ? (
              <AdminPlans />
            ) : activeTab === "vouchers" ? (
              <AdminVouchers />
            ) : activeTab === "resellers" ? (
              <AdminResellers />
            ) : (
              <AdminConsole section={activeTab} />
            )}
          </div>
        </section>
      </AdminLayout>
    </main>
  );
}
