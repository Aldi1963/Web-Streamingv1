import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ContentGrid } from "@/components/content-grid";
import Link from "next/link";
import {
  Bookmark, CalendarDays, ChevronDown, ChevronRight, Clock3, CreditCard,
  Laptop, Sparkles,
} from "lucide-react";
import { RedeemCodePanel } from "@/components/redeem-code-panel";
import { ResellerApplicationPanel } from "@/components/reseller-application-panel";
import { WatchProgressGrid } from "@/components/watch-progress-grid";
import { activeSubscriptionWhere } from "@/services/playback-access-service";
import { latestProgressByContent } from "@/lib/watch-progress";

export default async function Dashboard() {
  const user = await auth.currentUser();
  if (!user) redirect("/login");

  const [subscription, watchlist, watchlistCount, devices, progress, paymentCount, redeemCodes, resellerApplication] = await Promise.all([
    db.subscription.findFirst({
      where: activeSubscriptionWhere(user.id),
      include: { plan: true },
      orderBy: { expiresAt: "desc" },
    }),
    db.watchlist.findMany({
      where: { userId: user.id },
      include: { content: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.watchlist.count({ where: { userId: user.id } }),
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
  const recentProgress = latestProgressByContent(progress);
  const expiresAt = subscription?.expiresAt.getTime();
  const startsAt = subscription?.startsAt.getTime();
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 86_400_000)) : 0;
  const elapsed = startsAt && expiresAt ? Math.max(0, now - startsAt) : 0;
  const duration = startsAt && expiresAt ? Math.max(1, expiresAt - startsAt) : 1;
  const planProgress = subscription ? Math.min(100, Math.round(elapsed / duration * 100)) : 0;

  return (
    <main className="shell dashboard dashboard-context dashboard-overview">
      <header className="dashboard-welcome">
        <div><p className="eyebrow">Ringkasan akun</p><h1>Halo, {user.name.split(" ")[0]}</h1></div>
        <Link className="btn btn-ghost btn-sm" href="/dashboard/preferences">Kelola akun<ChevronRight size={16}/></Link>
      </header>

      <div className="dashboard-home-layout">
        <div className="dashboard-home-main">
          <WatchProgressGrid
            title="Lanjut menonton"
            items={recentProgress.slice(0, 4)}
            emptyLabel="Belum ada tontonan"
            emptyText="Drama yang Anda tonton akan tampil di sini."
            showResumeButton
          />

          {watchlist.length ? (
            <ContentGrid title="Watchlist terbaru" items={watchlist.map(item => item.content)} viewAllHref="/dashboard/history" />
          ) : (
            <div className="empty-state dashboard-watchlist-empty">
              <Bookmark size={24}/>
              <h2>Watchlist masih kosong</h2>
              <p>Simpan drama agar mudah ditemukan kembali.</p>
              <Link className="btn btn-sm" href="/terbaru">Jelajahi katalog</Link>
            </div>
          )}
        </div>

        <aside className="dashboard-home-rail">
          <section className="dashboard-subscription-card">
            <div className="dashboard-plan-main">
              <span className="dashboard-plan-icon"><CreditCard size={21}/></span>
              <div><p>Paket saat ini</p><h2>{subscription?.plan.name ?? "Gratis"}</h2></div>
            </div>
            {subscription ? <div className="dashboard-plan-expiry">
              <div><span><CalendarDays size={15}/>Berlaku hingga {subscription.expiresAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span><strong>{daysLeft} hari</strong></div>
              <div className="dashboard-plan-track"><i style={{ width: `${planProgress}%` }}/></div>
            </div> : <p className="dashboard-plan-copy">Episode premium memerlukan paket aktif.</p>}
            <Link className="btn btn-sm" href={subscription ? "/dashboard/subscription" : "/plans"}>
              {subscription ? "Kelola paket" : "Pilih paket"}<ChevronRight size={16}/>
            </Link>
          </section>

          <section className="dashboard-metrics" aria-label="Ringkasan aktivitas">
            <div><Bookmark size={17}/><span>Watchlist<strong>{watchlistCount}</strong></span></div>
            <div><Clock3 size={17}/><span>Ditonton<strong>{recentProgress.length}</strong></span></div>
            <div><Laptop size={17}/><span>Perangkat<strong>{devices}</strong></span></div>
            <div><CreditCard size={17}/><span>Transaksi<strong>{paymentCount}</strong></span></div>
          </section>
        </aside>
      </div>

      <details className="dashboard-secondary-tools">
        <summary>
          <span className="dashboard-plan-icon"><Sparkles size={19}/></span>
          <span><strong>Voucher & reseller</strong><small>Redeem kode atau kelola pengajuan partner</small></span>
          <ChevronDown size={18}/>
        </summary>
        <div className="dashboard-secondary-content">
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
        </div>
      </details>
    </main>
  );
}
