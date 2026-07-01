import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { InfiniteContentGrid } from "@/components/infinite-content-grid";

export const revalidate = 60;
const PAGE_SIZE = 18;

export default async function Provider({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const where = { providerSlug: provider, isActive: true };
  const [items, total, providerInfo] = await Promise.all([
    db.content.findMany({
      where,
      take: PAGE_SIZE,
      orderBy: [{ lastSyncedAt: "desc" }, { id: "desc" }],
      select: {
        id: true, title: true, slug: true, posterUrl: true, providerName: true,
        type: true, rating: true, viewCount: true, providerViewCount: true,
        episodeCount: true,
      },
    }),
    db.content.count({ where }),
    db.content.findFirst({
      where,
      select: { providerName: true },
    }),
  ]);

  if (!providerInfo) notFound();

  return <main className="shell">
    <div className="section-header">
      <div>
        <p className="eyebrow">Provider</p>
        <h1>{providerInfo.providerName}</h1>
        <p className="muted">{total} konten tersedia</p>
      </div>
    </div>
    <InfiniteContentGrid
      provider={provider}
      initialItems={items}
      initialCursor={items.length === PAGE_SIZE ? items.at(-1)?.id ?? null : null}
    />
  </main>;
}
