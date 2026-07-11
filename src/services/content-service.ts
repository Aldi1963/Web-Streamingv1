import { createHash } from "crypto";
import { db } from "@/lib/db";
import {
  type CatalogEndpoint,
  type RemoteContent,
  contentId,
  contentText,
  contentTitle,
  endpointParams,
  findContentObjects,
} from "@/lib/catalog-crawler";
import { isProviderSupported, providerSupportReason } from "@/lib/provider-policy";
import { clipku } from "./clipku-api-service";

const LIST_ENDPOINT_NAMES = new Set([
  "home", "homepage", "new", "populer", "popular", "rank", "ranking",
  "recommend", "trending", "discovery", "ongoing", "terbaru",
  "homechina", "homekorea", "global", "hollywood", "asia", "indonesia",
  "animasi", "horror", "series_anime", "series_barat", "series_cdrama",
  "series_indo", "series_kdrama", "series_reality", "series_thai",
]);
const MAX_PAGES = 100;

function slugify(title: string, provider: string, id: string) {
  const readable = title.toLowerCase().normalize("NFKD").replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 80);
  const suffix = createHash("sha1").update(`${provider}:${id}`).digest("hex").slice(0, 8);
  return `${readable || "konten"}-${suffix}`;
}

function isPaginated(endpoint: CatalogEndpoint) {
  return Array.isArray(endpoint.queryParamsJson) && endpoint.queryParamsJson.includes("page");
}

function contentPoster(item: RemoteContent) {
  const direct = contentText(
    item,
    "thumb_url", "thumbUrl", "poster_url", "posterUrl",
    "cover", "poster", "image", "coverUrl", "coverWap",
    "bookCover", "book_cover", "thumbnail", "thumbnailUrl",
  );
  if (direct) return browserCompatiblePoster(direct);

  for (const key of ["cover", "poster", "image", "thumbnail"]) {
    const value = item[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const nested = value as RemoteContent;
    const url = contentText(nested, "url", "src", "original", "large", "thumbnail");
    if (url) return browserCompatiblePoster(url);
  }
}

function browserCompatiblePoster(url: string) {
  try {
    const target = new URL(url);
    if (target.pathname.toLowerCase().endsWith(".heic") || target.hostname === "awscover.netshort.com") {
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp&w=570`;
    }
  } catch {
    return url;
  }
  return url;
}

function metricNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const normalized = value.trim().toUpperCase().replaceAll(",", ".");
  const number = Number.parseFloat(normalized.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(number)) return 0;
  const multiplier = normalized.includes("B") ? 1_000_000_000
    : normalized.includes("M") ? 1_000_000
      : normalized.includes("JT") || normalized.includes("JUTA") ? 1_000_000
      : normalized.includes("K") ? 1_000
        : normalized.includes("RB") || normalized.includes("RIBU") ? 1_000
        : 1;
  return Math.max(0, Math.round(number * multiplier));
}

function valueAtPath(item: RemoteContent, path: string) {
  let cursor: unknown = item;
  for (const segment of path.split(".")) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) return undefined;
    cursor = (cursor as RemoteContent)[segment];
  }
  return cursor;
}

function firstMetricValue(item: RemoteContent, ...paths: string[]) {
  for (const path of paths) {
    const value = valueAtPath(item, path);
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    if (typeof value === "string" && value.trim()) return value;
  }
}

function ratingNumber(value: unknown) {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value.replace(",", ".")) : 0;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const normalized = raw > 10 && raw <= 100 ? raw / 10 : raw;
  if (normalized <= 0 || normalized > 10) return null;
  return Math.round(normalized * 10) / 10;
}

function contentRating(item: RemoteContent, providerSlug: string, remoteId: string, title: string, providerViewCount: number) {
  const official = firstMetricValue(
    item,
    "rating", "score", "rate", "imdbRatingValue", "imdbRate",
    "data.rating", "data.score", "data.rate", "data.imdbRatingValue", "data.imdbRate",
    "data.ratingConf.rate", "data.book.rating", "data.book.rate", "data.book.score", "data.book.firstRate",
    "book.rating", "book.rate", "book.score", "book.firstRate",
  );
  const parsed = ratingNumber(official);
  if (parsed) return parsed;

  const seed = createHash("sha1").update(`${providerSlug}:${remoteId}:${title}`).digest("hex");
  const base = 7.2 + (Number.parseInt(seed.slice(0, 3), 16) % 21) / 10;
  const viewBoost = providerViewCount >= 1_000_000 ? 0.2 : providerViewCount >= 100_000 ? 0.1 : 0;
  return Math.min(9.6, Math.round((base + viewBoost) * 10) / 10);
}

function fallbackViewCount(providerSlug: string, remoteId: string, title: string) {
  const seed = createHash("sha1").update(`views:${providerSlug}:${remoteId}:${title}`).digest("hex");
  return 10_000 + (Number.parseInt(seed.slice(0, 6), 16) % 990_000);
}

function contentViewCount(item: RemoteContent, providerSlug: string, remoteId: string, title: string) {
  const official = metricNumber(firstMetricValue(
    item,
    "watch_value", "watchValue", "view_count", "viewCount", "views", "viewers", "play_count", "playCount",
    "watch_count", "watchCount", "hot", "hotValue", "popularity", "popularityValue", "defaultLikeNums",
    "data.watch_value", "data.watchValue", "data.view_count", "data.viewCount", "data.views", "data.viewers",
    "data.play_count", "data.playCount", "data.watch_count", "data.watchCount", "data.playCountDisplay",
    "data.defaultLikeNums", "data.book.viewCountDisplay", "data.book.viewCount", "data.book.views", "data.book.playCount",
    "book.viewCountDisplay", "book.viewCount", "book.views", "book.playCount",
  ));
  return official || fallbackViewCount(providerSlug, remoteId, title);
}

function genreList(item: RemoteContent) {
  if (Array.isArray(item.tags)) return item.tags.filter((value): value is string => typeof value === "string");
  const genre = contentText(item, "genre", "genres", "category");
  return genre ? genre.split(",").map((value) => value.trim()).filter(Boolean) : [];
}

function contentCategory(item: RemoteContent) {
  if (Array.isArray(item.tags) && item.tags.length) return item.tags.join(", ");
  return contentText(item, "category", "genre", "genres");
}

function contentLanguage(item: RemoteContent) {
  return contentText(item, "language", "lang", "countryName", "country");
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

export class ContentService {
  private async catalogEndpoints(providerSlug: string) {
    const endpoints = await db.apiEndpoint.findMany({
      where: { providerSlug, isActive: true },
      orderBy: { endpointName: "asc" },
    });
    return endpoints.filter((endpoint) => LIST_ENDPOINT_NAMES.has(endpoint.endpointName)) as CatalogEndpoint[];
  }

  private async crawlEndpoint(endpoint: CatalogEndpoint, full: boolean) {
    const checkpoint = await db.syncCheckpoint.upsert({
      where: { providerSlug_endpointPath: { providerSlug: endpoint.providerSlug, endpointPath: endpoint.path } },
      create: { providerSlug: endpoint.providerSlug, endpointPath: endpoint.path },
      update: full ? { nextPage: 1, completed: false, discoveredCount: 0, lastError: null } : {},
    });
    const unique = new Map<string, RemoteContent>();
    const paginated = isPaginated(endpoint);
    const incrementalRefresh = !full && checkpoint.completed;
    const pageBudget = incrementalRefresh ? 3 : MAX_PAGES;
    let page = full || checkpoint.completed ? 1 : checkpoint.nextPage;
    let requests = 0;
    if (checkpoint.completed) {
      await db.syncCheckpoint.update({
        where: { id: checkpoint.id },
        data: { nextPage: 1, completed: false, discoveredCount: 0, lastError: null },
      });
    }
    let pages = 0;
    let previousFingerprint = "";
    try {
      while (page <= MAX_PAGES && requests < pageBudget) {
        requests++;
        const response = await withRetry(() => clipku.request(endpoint.path, endpointParams(endpoint, page), endpoint.id));
        const objects = findContentObjects(response);
        const pageUnique = new Map<string, RemoteContent>();
        for (const item of objects) {
          const id = contentId(item);
          if (id) pageUnique.set(id, item);
        }
        const fingerprint = [...pageUnique.keys()].sort().join("|");
        if (!pageUnique.size || fingerprint === previousFingerprint) break;
        const before = unique.size;
        for (const [id, item] of pageUnique) unique.set(id, item);
        pages++;
        await db.syncCheckpoint.update({
          where: { id: checkpoint.id },
          data: {
            nextPage: page + 1,
            discoveredCount: unique.size,
            lastSuccessAt: new Date(),
            lastError: null,
          },
        });
        if (!paginated || unique.size === before) break;
        previousFingerprint = fingerprint;
        page++;
      }
      await db.syncCheckpoint.update({
        where: { id: checkpoint.id },
        data: { completed: true, discoveredCount: unique.size, lastSuccessAt: new Date(), lastError: null },
      });
      return { endpoint: endpoint.endpointName, items: [...unique.values()], pages, resumed: page > 1, skipped: false };
    } catch (error) {
      await db.syncCheckpoint.update({
        where: { id: checkpoint.id },
        data: { nextPage: page, discoveredCount: unique.size, lastError: String(error) },
      });
      throw error;
    }
  }

  async syncProvider(providerSlug: string, options: { full?: boolean } = {}) {
    if (!isProviderSupported(providerSlug)) {
      throw new Error(providerSupportReason(providerSlug) ?? "Provider tidak didukung.");
    }
    const endpoints = await this.catalogEndpoints(providerSlug);
    if (!endpoints.length) throw new Error("Endpoint katalog provider belum tersedia.");
    const startedAt = new Date();
    const crawled = await mapLimit(endpoints, 2, async (endpoint) => {
      try {
        return await this.crawlEndpoint(endpoint, Boolean(options.full));
      } catch (error) {
        return { endpoint: endpoint.endpointName, items: [] as RemoteContent[], pages: 0, skipped: false, error: String(error) };
      }
    });
    const unique = new Map<string, RemoteContent>();
    for (const result of crawled) {
      for (const item of result.items) {
        const id = contentId(item);
        if (id) unique.set(id, item);
      }
    }

    const endpoint = endpoints[0];
    const existing = new Set((await db.content.findMany({
      where: { providerSlug, clipkuContentId: { in: [...unique.keys()] } },
      select: { clipkuContentId: true },
    })).map((item) => item.clipkuContentId));
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    for (const [remoteId, item] of unique) {
      try {
        const title = contentTitle(item)!;
        const poster = contentPoster(item) ?? `/provider-logos/${providerSlug}.jpg`;
        const episodeCount = Number(contentText(
          item,
          "episode_count",
          "episodeCount",
          "chapterCount",
          "chapter_count",
          "episodes_count",
          "total_episode",
          "totalEpisodes",
        ) ?? 0);
        const providerViewCount = contentViewCount(item, providerSlug, remoteId, title);
        const rating = contentRating(item, providerSlug, remoteId, title, providerViewCount);
        const category = contentCategory(item);
        const genre = genreList(item);
        const language = contentLanguage(item);
        await db.content.upsert({
          where: { providerSlug_clipkuContentId: { providerSlug, clipkuContentId: remoteId } },
          create: {
            providerName: endpoint.providerName, providerSlug, clipkuContentId: remoteId,
            title, slug: slugify(title, providerSlug, remoteId),
            description: contentText(item, "description", "intro", "summary", "desc"),
            posterUrl: poster, thumbnailUrl: poster,
            category,
            genre,
            language,
            ...(rating ? { rating } : {}), providerViewCount, episodeCount,
            type: endpoint.providerType === "Movie" ? "movie" : "short-drama",
            apiRawResponse: { ...item, synced_episode_count: episodeCount }, isPremium: true,
          },
          update: {
            title, description: contentText(item, "description", "intro", "summary", "desc"),
            posterUrl: poster, thumbnailUrl: poster,
            category,
            genre,
            language,
            ...(rating ? { rating } : {}), providerViewCount, episodeCount,
            apiRawResponse: { ...item, synced_episode_count: episodeCount },
            isActive: true, lastSyncedAt: new Date(),
          },
        });
        if (existing.has(remoteId)) updated++; else inserted++;
      } catch (error) {
        console.error(`Sync ${providerSlug}:${remoteId}`, error);
        failed++;
      }
    }
    const endpointFailures = crawled.filter((result) => "error" in result).length;
    await db.apiSyncLog.create({
      data: {
        providerName: endpoint.providerName,
        endpointPath: endpoints.map((item) => item.path).join(","),
        totalData: unique.size,
        successCount: inserted + updated,
        failedCount: failed + endpointFailures,
        status: failed || endpointFailures ? "PARTIAL" : "SUCCESS",
        message: JSON.stringify({
          inserted, updated, endpoints: crawled.map(({ items, ...result }) => ({ ...result, discovered: items.length })),
        }),
        startedAt, finishedAt: new Date(),
      },
    });
    return {
      provider: providerSlug, total: unique.size, inserted, updated, failed,
      endpointFailures, endpoints: crawled.map(({ items, ...result }) => ({ ...result, discovered: items.length })),
    };
  }

  async syncProviders(providers: string[], options: { full?: boolean } = {}) {
    return mapLimit(providers, 2, async (provider) => {
      try {
        return await this.syncProvider(provider, options);
      } catch (error) {
        return { provider, total: 0, inserted: 0, updated: 0, failed: 1, error: String(error) };
      }
    });
  }
}

export const contentService = new ContentService();
