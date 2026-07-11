import { redirect } from "next/navigation";
import { WatchProgressGrid } from "@/components/watch-progress-grid";
import { db } from "@/lib/db";
import { auth } from "@/services/auth-service";
import { latestProgressByContent } from "@/lib/watch-progress";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await auth.currentUser();
  if (!user) redirect("/login?next=/history");

  const items = await db.watchProgress.findMany({
    where: { userId: user.id },
    include: {
      content: {
        include: {
          episodes: {
            select: { id: true, episodeNumber: true },
          },
        },
      },
    },
    orderBy: { lastWatchedAt: "desc" },
  });

  return (
    <main className="shell">
      <WatchProgressGrid
        title="Riwayat tontonan"
        items={latestProgressByContent(items)}
        emptyLabel="Belum ada riwayat tontonan"
        emptyText="Drama dan film yang Anda tonton akan muncul di sini."
      />
    </main>
  );
}
