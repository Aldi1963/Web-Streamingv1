import { db } from "../src/lib/db";

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

async function main() {
  const items = await db.content.findMany({
    select: { id: true, apiRawResponse: true, _count: { select: { episodes: true } } },
  });
  let updated = 0;
  for (const item of items) {
    const raw = item.apiRawResponse && typeof item.apiRawResponse === "object" && !Array.isArray(item.apiRawResponse)
      ? item.apiRawResponse as Record<string, unknown>
      : {};
    const providerViewCount = metricNumber(first(raw, [
      "watch_value", "watchValue", "view_count", "viewCount", "views", "play_count", "playCount",
    ]));
    const rawEpisodeCount = metricNumber(first(raw, [
      "episode_count", "episodeCount", "episodes_count", "total_episode", "totalEpisodes", "synced_episode_count",
    ]));
    const rawRating = Number(first(raw, ["rating", "score", "rate", "imdbRatingValue"]) ?? 0);
    await db.content.update({
      where: { id: item.id },
      data: {
        providerViewCount,
        episodeCount: Math.max(rawEpisodeCount, item._count.episodes),
        ...(Number.isFinite(rawRating) && rawRating > 0 ? { rating: rawRating } : {}),
      },
    });
    updated++;
  }
  console.log(JSON.stringify({ updated }));
}

main().finally(() => db.$disconnect());
