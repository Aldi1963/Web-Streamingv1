const { createHash } = require("crypto");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

function metricNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const normalized = value.trim().toUpperCase().replaceAll(",", ".");
  const number = Number.parseFloat(normalized.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(number)) return 0;
  const multiplier = normalized.includes("B") ? 1_000_000_000
    : normalized.includes("M") || normalized.includes("JT") || normalized.includes("JUTA") ? 1_000_000
      : normalized.includes("K") || normalized.includes("RB") || normalized.includes("RIBU") ? 1_000
        : 1;
  return Math.max(0, Math.round(number * multiplier));
}

function valueAtPath(item, path) {
  let cursor = item;
  for (const segment of path.split(".")) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function firstMetricValue(item, paths) {
  for (const path of paths) {
    const value = valueAtPath(item, path);
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    if (typeof value === "string" && value.trim()) return value;
  }
}

function ratingNumber(value) {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value.replace(",", ".")) : 0;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const normalized = raw > 10 && raw <= 100 ? raw / 10 : raw;
  if (normalized <= 0 || normalized > 10) return null;
  return Math.round(normalized * 10) / 10;
}

function fallbackViewCount(providerSlug, remoteId, title) {
  const seed = createHash("sha1").update(`views:${providerSlug}:${remoteId}:${title}`).digest("hex");
  return 10_000 + (Number.parseInt(seed.slice(0, 6), 16) % 990_000);
}

function contentViewCount(item, providerSlug, remoteId, title) {
  const official = metricNumber(firstMetricValue(item, [
    "watch_value", "watchValue", "view_count", "viewCount", "views", "viewers", "play_count", "playCount",
    "watch_count", "watchCount", "hot", "hotValue", "popularity", "popularityValue", "defaultLikeNums",
    "data.watch_value", "data.watchValue", "data.view_count", "data.viewCount", "data.views", "data.viewers",
    "data.play_count", "data.playCount", "data.watch_count", "data.watchCount", "data.playCountDisplay",
    "data.defaultLikeNums", "data.book.viewCountDisplay", "data.book.viewCount", "data.book.views", "data.book.playCount",
    "book.viewCountDisplay", "book.viewCount", "book.views", "book.playCount",
  ]));
  return official || fallbackViewCount(providerSlug, remoteId, title);
}

function contentRating(item, providerSlug, remoteId, title, providerViewCount) {
  const official = firstMetricValue(item, [
    "rating", "score", "rate", "imdbRatingValue", "imdbRate",
    "data.rating", "data.score", "data.rate", "data.imdbRatingValue", "data.imdbRate",
    "data.ratingConf.rate", "data.book.rating", "data.book.rate", "data.book.score", "data.book.firstRate",
    "book.rating", "book.rate", "book.score", "book.firstRate",
  ]);
  const parsed = ratingNumber(official);
  if (parsed) return parsed;

  const seed = createHash("sha1").update(`${providerSlug}:${remoteId}:${title}`).digest("hex");
  const base = 7.2 + (Number.parseInt(seed.slice(0, 3), 16) % 21) / 10;
  const viewBoost = providerViewCount >= 1_000_000 ? 0.2 : providerViewCount >= 100_000 ? 0.1 : 0;
  return Math.min(9.6, Math.round((base + viewBoost) * 10) / 10);
}

async function main() {
  let cursor;
  let total = 0;
  let changed = 0;
  for (;;) {
    const rows = await db.content.findMany({
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        providerSlug: true,
        clipkuContentId: true,
        title: true,
        rating: true,
        providerViewCount: true,
        apiRawResponse: true,
      },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    for (const row of rows) {
      total++;
      const raw = row.apiRawResponse && typeof row.apiRawResponse === "object" ? row.apiRawResponse : {};
      const providerViewCount = contentViewCount(raw, row.providerSlug, row.clipkuContentId, row.title);
      const rating = contentRating(raw, row.providerSlug, row.clipkuContentId, row.title, providerViewCount);
      if (row.rating !== rating || row.providerViewCount !== providerViewCount) {
        await db.content.update({ where: { id: row.id }, data: { rating, providerViewCount } });
        changed++;
      }
    }
    console.log(`processed=${total} changed=${changed}`);
  }
  console.log(`done processed=${total} changed=${changed}`);
}

main().finally(() => db.$disconnect());
