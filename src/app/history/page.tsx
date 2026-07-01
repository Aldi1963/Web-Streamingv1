import { redirect } from "next/navigation";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { WatchProgressGrid } from "@/components/watch-progress-grid";

export default async function HistoryPage() {
  const user = await auth.currentUser(); if (!user) redirect("/login");
  const rows = await db.watchProgress.findMany({
    where: { userId: user.id }, include: { content: { include: { episodes: { select: { id: true, episodeNumber: true } } } } },
    orderBy: { lastWatchedAt: "desc" }, take: 20,
  });
  const items = Array.from(new Map(rows.map(row => [row.contentId, row])).values());
  const latestItems = items.slice(0, 1);
  return <main className="shell"><div className="section-header"><h1>Riwayat Tonton</h1></div>
    <WatchProgressGrid title="Terakhir ditonton" items={latestItems} emptyLabel="Riwayat kosong" emptyText="Video yang ditonton akan muncul di sini." />
  </main>;
}
