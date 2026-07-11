import { db } from "@/lib/db";
import Link from "next/link";
import { Check, Crown, Gift, Sparkles } from "lucide-react";
import { auth } from "@/services/auth-service";
import { PaymentButton } from "@/components/payment-button";
import { getSetting } from "@/lib/settings";
export const dynamic = "force-dynamic";

type PlansTab = "premium" | "voucher";

function plansPath(tab: PlansTab, slug?: string) {
  const params = new URLSearchParams({ tab });
  if (slug) params.set("checkout", slug);
  return `/plans?${params.toString()}`;
}

export default async function Plans({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; tab?: string }>;
}) {
  const user = await auth.currentUser();
  const { checkout, tab } = await searchParams;
  const activeTab: PlansTab = tab === "voucher" ? "voucher" : "premium";
  const [plans, paymentProvider, pakasirSlug, pakasirApiKey, aldiQrisApiKey, clipkuPayApiKey] = await Promise.all([
    db.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }).catch(() => []),
    getSetting("PAYMENT_PROVIDER"),
    getSetting("PAKASIR_SLUG"),
    getSetting("PAKASIR_API_KEY"),
    getSetting("ALDIQRIS_API_KEY" as never).catch(() => undefined),
    getSetting("CLIPKU_PAY_API_KEY" as never).catch(() => undefined),
  ]);
  const activeSubscription = user ? await db.subscription.findFirst({
    where: { userId: user.id, status: { in: ["ACTIVE", "TRIAL", "GRACE"] }, expiresAt: { gt: new Date() } },
    include: { plan: true },
    orderBy: { expiresAt: "desc" },
  }) : null;
  const paymentConfigured = paymentProvider === "aldiqris"
    ? Boolean(aldiQrisApiKey)
    : paymentProvider === "clipku_pay"
      ? Boolean(clipkuPayApiKey)
    : Boolean(pakasirSlug && pakasirApiKey);
  const longestPlan = plans.reduce<typeof plans[number] | null>(
    (best, plan) => !best || plan.durationDays > best.durationDays ? plan : best,
    null,
  );
  return (
    <main className="shell plans-page">
      <div className="plans-simple-head">
        <div>
          <h1>Pilih paket</h1>
          <p>
            {activeSubscription
              ? `Paket aktif: ${activeSubscription.plan.name} sampai ${activeSubscription.expiresAt.toLocaleString("id-ID")}.`
              : user
                ? paymentConfigured ? "Pilih premium langsung atau voucher." : "Pembayaran belum tersedia."
                : "Masuk dulu untuk membeli paket."}
          </p>
        </div>
      </div>
      <nav className="plans-tabs" aria-label="Pilihan pembelian">
        <Link className={`plans-tab${activeTab === "premium" ? " active" : ""}`} href={plansPath("premium")} prefetch={false}>
          <Crown size={18} />
          <strong>Premium</strong>
        </Link>
        <Link className={`plans-tab${activeTab === "voucher" ? " active" : ""}`} href={plansPath("voucher")} prefetch={false}>
          <Gift size={18} />
          <strong>Voucher</strong>
        </Link>
      </nav>
      <div className="plans-grid">
        {plans.map((p, index) => (
          <article className={`panel plan-card${index === 1 ? " featured" : ""}`} key={p.id}>
            {index === 1 && <span className="plan-badge"><Sparkles size={13} /> Paling populer</span>}
            {longestPlan?.id === p.id && <span className="plan-save">Durasi terpanjang</span>}
            <div className="plan-card-head">
              <span className="plan-duration">{p.durationDays} hari</span>
              <h2>{p.name}</h2>
            </div>
            <div className="plan-price">
              <span>Rp</span>
              <strong>{Number(p.price).toLocaleString("id-ID")}</strong>
            </div>
            <ul>
              {activeTab === "premium" ? (
                <>
                  <li><Check size={16} />Akses premium {p.durationDays} hari</li>
                  <li><Check size={16} />Aktif otomatis setelah bayar</li>
                </>
              ) : (
                <>
                  <li><Check size={16} />Kode voucher {p.durationDays} hari</li>
                  <li><Check size={16} />Bisa dipakai nanti atau diberikan</li>
                </>
              )}
            </ul>
            {user ? (
              paymentConfigured ? (
                <div className="plan-actions">
                  {activeTab === "premium" && activeSubscription ? (
                    <button className="btn" type="button" disabled>Langganan aktif</button>
                  ) : activeTab === "premium" ? (
                    <PaymentButton planId={p.id} autoStart={checkout === p.slug} label="Langganan sekarang" />
                  ) : (
                    <PaymentButton planId={p.id} label="Beli voucher" purpose="redeem_code" />
                  )}
                </div>
              ) : (
                <button className="btn" type="button" disabled>Pembayaran segera tersedia</button>
              )
            ) : (
              <Link
                className="btn"
                href={`/login?redirect=${encodeURIComponent(plansPath(activeTab, activeTab === "premium" ? p.slug : undefined))}`}
                prefetch={false}
              >
                {activeTab === "premium" ? "Masuk untuk langganan" : "Masuk untuk beli voucher"}
              </Link>
            )}
          </article>
        ))}
      </div>
      {!plans.length && (
        <div className="empty-state">
          <h2>Paket belum tersedia</h2>
          <p>Silakan kembali beberapa saat lagi.</p>
        </div>
      )}
    </main>
  );
}
