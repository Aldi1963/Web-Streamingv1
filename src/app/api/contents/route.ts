import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const contentSelect = {
  id: true,
  title: true,
  slug: true,
  posterUrl: true,
  providerName: true,
  type: true,
  rating: true,
  viewCount: true,
  providerViewCount: true,
  episodeCount: true,
} as const;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const provider = query.get("provider")?.trim() || undefined;
  const search = query.get("q")?.trim();
  const paginated = query.get("paginate") === "1";
  const cursor = query.get("cursor")?.trim() || undefined;
  const limit = Math.min(Math.max(Number(query.get("limit") ?? 18), 1), 48);
  const where = {
    isActive: true,
    providerSlug: provider,
    title: search ? { contains: search } : undefined,
  };

  const items = await db.content.findMany({
    where,
    take: paginated ? limit + 1 : limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ lastSyncedAt: "desc" }, { id: "desc" }],
    select: contentSelect,
  });

  const hasMore = paginated && items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const headers = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

  if (!paginated) return NextResponse.json(data, { headers });
  return NextResponse.json({
    items: data,
    nextCursor: hasMore ? data.at(-1)?.id ?? null : null,
  }, { headers });
}
