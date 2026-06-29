import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ContentGrid } from "@/components/content-grid";
import { LogoutButton } from "@/components/logout-button";

export default async function Dashboard() {
  const user = await auth.currentUser();
  if (!user) redirect("/login");

  const [subscription, watchlist, devices] = await Promise.all([
    db.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { expiresAt: "desc" },
    }),
    db.watchlist.findMany({
      where: { userId: user.id },
      include: { content: true },
      orderBy: { createdAt: "desc" },
    }),
    db.deviceSession.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
  ]);

  return (
    <main className="shell dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Akun saya</p>
          <h1>Halo, {user.name}</h1>
          <p className="muted">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      <div className="stats">
        <div className="panel stat">
          Paket aktif
          <strong>{subscription?.plan.name ?? "Gratis"}</strong>
        </div>
        <div className="panel stat">
          Watchlist
          <strong>{watchlist.length}</strong>
        </div>
        <div className="panel stat">
          Perangkat
          <strong>{devices || 1}</strong>
        </div>
      </div>

      {watchlist.length ? (
        <ContentGrid title="Watchlist saya" items={watchlist.map((item) => item.content)} />
      ) : (
        <div className="empty-state">
          <h2>Watchlist masih kosong</h2>
          <p>Simpan drama agar mudah ditemukan kembali.</p>
        </div>
      )}
    </main>
  );
}
