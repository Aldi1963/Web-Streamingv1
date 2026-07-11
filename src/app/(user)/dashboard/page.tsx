import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ContentGrid } from "@/components/content-grid";
import Link from "next/link";
import {
  Bookmark, CalendarDays, ChevronRight, Clock3, CreditCard, History,
  Laptop, UserRoundCog,
} from "lucide-react";
import { RedeemCodePanel } from "@/components/redeem-code-panel";
import { ResellerApplicationPanel } from "@/components/reseller-application-panel";

export default async function Dashboard() {
  const user = await auth.currentUser();
  if (!user) redirect("/login");

  const [subscription, watchlist, devices, progress, paymentCount, redeemCodes, resellerApplication] = await Promise.all([
    db.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { expiresAt: "desc" },
    }),
    db.watchlist.findMany({
      where: { userId: user.id },
      include: { content: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.deviceSession.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
    db.watchProgress.findMany({
      where: { userId: user.id, durationSeconds: { gt: 0 } },
      include: { content: { include: { episodes: { select: { id: true, episodeNumber: true } } } } },
      orderBy: { lastWatchedAt: "desc" },
      take: 6,
    }),
    db.payment.count({ where: { userId: user.id } }),
    db.redeemCode.findMany({
      where: { buyerId: user.id },
      include: { plan: { select: { name: true, durationDays: true } }, redeemer: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }).catch(() => []),
    db.resellerApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        businessName: true,
        contact: true,
        channel: true,
        note: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        reviewedAt: true,
      },
    }).catch(() => null),
  ]);

  const now = Date.now();
  const expiresAt = subscription?.expiresAt.getTime();
  const startsAt = subscription?.startsAt.getTime();
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 86_400_000)) : 0;
  const elapsed = startsAt && expiresAt ? Math.max(0, now - startsAt) : 0;
  const duration = startsAt && expiresAt ? Math.max(1, expiresAt - startsAt) : 1;
  const planProgress = subscription ? Math.min(100, Math.round(elapsed / duration * 100)) : 0;

  const shortcuts = [
    { href: "/dashboard/preferences", label: "Pengaturan", detail: "Profil & keamanan", Icon: UserRoundCog },
    { href: "/dashboard/subscription", label: "Langganan", detail: subscription?.plan.name ?? "Paket gratis", Icon: CreditCard },
    { href: "/dashboard/devices", label: "Perangkat", detail: `${devices} sesi aktif`, Icon: Laptop },
    { href: "/dashboard/history", label: "Riwayat", detail: `${progress.length} terbaru`, Icon: History },
  ];

  return (
    <main className="shell dashboard dashboard-context dashboard-overview">
      <section className="dashboard-subscription-band">
        <div className="dashboard-plan-main">
          <span className="dashboard-plan-icon"><CreditCard size={21}/></span>
          <div>
            <p>Paket saat ini</p>
            <h2>{subscription?.plan.name ?? "Gratis"}</h2>
          </div>
        </div>
        {subscription ? <div className="dashboard-plan-expiry">
          <div><span><CalendarDays size={15}/>Berlaku hingga {subscription.expiresAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span><strong>{daysLeft} hari tersisa</strong></div>
          <div className="dashboard-plan-track"><i style={{ width: `${planProgress}%` }}/></div>
        </div> : <p className="dashboard-plan-copy">Episode premium memerlukan paket aktif.</p>}
        <Link className="btn btn-sm" href={subscription ? "/dashboard/subscription" : "/plans"}>
          {subscription ? "Kelola paket" : "Pilih paket"}<ChevronRight size={16}/>
        </Link>
      </section>

      <section className="dashboard-metrics" aria-label="Ringkasan akun">
        <div><Bookmark size={18}/><span>Watchlist<strong>{watchlist.length}</strong></span></div>
        <div><Clock3 size={18}/><span>Sedang ditonton<strong>{progress.length}</strong></span></div>
        <div><Laptop size={18}/><span>Perangkat aktif<strong>{devices}</strong></span></div>
        <div><CreditCard size={18}/><span>Transaksi<strong>{paymentCount}</strong></span></div>
      </section>

      <section className="dashboard-shortcuts">
        <div className="dashboard-section-heading"><div><p className="eyebrow">Kelola akun</p><h2>Akses cepat</h2></div></div>
        <div className="dashboard-shortcut-grid">
          {shortcuts.map(({ href, label, detail, Icon }) => <Link href={href} key={href}>
            <span><Icon size={19}/></span><div><strong>{label}</strong><small>{detail}</small></div><ChevronRight size={17}/>
          </Link>)}
        </div>
      </section>

      <RedeemCodePanel initialCodes={redeemCodes.map(item => ({
        id: item.id,
        code: item.code,
        status: item.status,
        redeemedAt: item.redeemedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        plan: item.plan,
        redeemer: item.redeemer,
      }))} />

      <ResellerApplicationPanel initialApplication={resellerApplication ? {
        ...resellerApplication,
        createdAt: resellerApplication.createdAt.toISOString(),
        reviewedAt: resellerApplication.reviewedAt?.toISOString() ?? null,
      } : null} />

      {watchlist.length ? (
        <ContentGrid title="Watchlist saya" items={watchlist.map(item => item.content)} />
      ) : (
        <div className="empty-state">
          <Bookmark size={24}/>
          <h2>Watchlist masih kosong</h2>
          <p>Simpan drama agar mudah ditemukan kembali.</p>
          <Link className="btn btn-sm" href="/terbaru">Jelajahi katalog</Link>
        </div>
      )}
    </main>
  );
}
