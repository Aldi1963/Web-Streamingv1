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
    "cover", "poster", "image", "coverUrl",
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
      : normalized.includes("K") ? 1_000
        : 1;
  return Math.max(0, Math.round(number * multiplier));
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
        const episodeCount = Number(contentText(item, "episode_count", "episodeCount", "episodes_count", "total_episode", "totalEpisodes") ?? 0);
        const providerViewCount = metricNumber(
          contentText(item, "watch_value", "watchValue", "view_count", "viewCount", "views", "play_count", "playCount"),
        );
        const rating = Number(contentText(item, "rating", "score", "rate", "imdbRatingValue") ?? 0) || null;
        await db.content.upsert({
          where: { providerSlug_clipkuContentId: { providerSlug, clipkuContentId: remoteId } },
          create: {
            providerName: endpoint.providerName, providerSlug, clipkuContentId: remoteId,
            title, slug: slugify(title, providerSlug, remoteId),
            description: contentText(item, "description", "intro", "summary", "desc"),
            posterUrl: poster, thumbnailUrl: poster,
            category: Array.isArray(item.tags) ? item.tags.join(", ") : contentText(item, "category"),
            genre: Array.isArray(item.tags) ? item.tags : [],
            language: contentText(item, "language", "lang"),
            ...(rating ? { rating } : {}), providerViewCount, episodeCount,
            type: endpoint.providerType === "Movie" ? "movie" : "short-drama",
            apiRawResponse: { ...item, synced_episode_count: episodeCount }, isPremium: true,
          },
          update: {
            title, description: contentText(item, "description", "intro", "summary", "desc"),
            posterUrl: poster, thumbnailUrl: poster,
            category: Array.isArray(item.tags) ? item.tags.join(", ") : contentText(item, "category"),
            genre: Array.isArray(item.tags) ? item.tags : [],
            language: contentText(item, "language", "lang"),
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
