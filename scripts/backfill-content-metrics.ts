import { db } from "../src/lib/db";
import { clipku } from "../src/services/clipku-api-service";

function first(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
}

function metricNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const normalized = value.trim().toUpperCase().replaceAll(",", ".");
  const number = Number.parseFloat(normalized.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(number)) return 0;
  const multiplier = normalized.includes("B") ? 1_000_000_000
    : normalized.includes("M") ? 1_000_000
      : normalized.includes("K") ? 1_000
        : 1;
  return Math.max(0, Math.round(number * multiplier));
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const data = record.data;
  return data && typeof data === "object" && !Array.isArray(data)
    ? { ...record, ...(data as Record<string, unknown>) }
    : record;
}

function metrics(raw: Record<string, unknown>) {
  return {
    views: metricNumber(first(raw, [
      "watch_value", "watchValue", "view_count", "viewCount", "views", "viewers",
      "play_count", "playCount", "hotValue", "heat",
    ])),
    episodes: metricNumber(first(raw, [
      "episode_count", "episodeCount", "episodes_count", "total_episode", "totalEpisodes",
      "totalEpisode", "episodeTotal", "chapterCount", "chapter_count", "synced_episode_count",
    ])),
    rating: Number(first(raw, ["rating", "score", "imdbRatingValue", "imdbRate", "rate"]) ?? 0),
  };
}

async function main() {
  const items = await db.content.findMany({
    select: {
      id: true, providerSlug: true, clipkuContentId: true, apiRawResponse: true,
      providerViewCount: true, episodeCount: true,
      _count: { select: { episodes: true } },
    },
  });
  let updated = 0;
  let enriched = 0;
  for (let offset = 0; offset < items.length; offset += 10) {
    await Promise.all(items.slice(offset, offset + 10).map(async (item) => {
      const catalog = metrics(objectRecord(item.apiRawResponse));
      let detail = { views: 0, episodes: 0, rating: 0 };
      if ((!catalog.views || !catalog.episodes) && item.clipkuContentId) {
        try {
          detail = metrics(objectRecord(await clipku.getDetail(item.providerSlug, item.clipkuContentId)));
          enriched++;
        } catch {
          // Keep catalog metrics when the detail endpoint is unavailable.
        }
      }
      const rating = Math.max(catalog.rating, detail.rating);
      await db.content.update({
        where: { id: item.id },
        data: {
          providerViewCount: Math.max(catalog.views, detail.views, item.providerViewCount),
          episodeCount: Math.max(catalog.episodes, detail.episodes, item.episodeCount, item._count.episodes),
          ...(Number.isFinite(rating) && rating > 0 ? { rating } : {}),
        },
      });
      updated++;
    }));
  }
  console.log(JSON.stringify({ updated, enriched }));
}

main().finally(() => db.$disconnect());
