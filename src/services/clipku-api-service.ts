import { createHash } from "crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const BASE = env.CLIPKU_API_BASE_URL;
const TIMEOUT = env.CLIPKU_API_TIMEOUT * 1000;
const CACHE_TTL = env.CLIPKU_API_CACHE_TTL * 1000;
const CACHE_ENABLED = env.CLIPKU_API_CACHE;

export type ScannedEndpoint = {
  providerName: string;
  providerSlug: string;
  providerType: "Short Drama" | "Movie";
  method: "GET";
  path: string;
  endpointName: string;
  description: string;
  queryParams: string[];
};

function allowedUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Path endpoint tidak valid.");
  return new URL(path, BASE).toString();
}

function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object") return (current as Record<string, unknown>)[key];
    return undefined;
  }, value);
}

export class ClipkuApiService {
  async request(path: string, params: Record<string, string | number | undefined> = {}, endpointId?: string) {
    const url = new URL(allowedUrl(path));
    Object.entries(params).forEach(([key, value]) => value !== undefined && url.searchParams.set(key, String(value)));
    const cacheKey = createHash("sha256").update(url.toString()).digest("hex");
    let cached = null;
    if (CACHE_ENABLED) {
      cached = await db.apiCache.findUnique({ where: { key: cacheKey } });
      if (cached && cached.expiresAt > new Date()) return cached.value;
    }

    const started = Date.now();
    let status: number | undefined;
    try {
      // Intentionally no Authorization header: Clipku is a public GET-only API.
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      status = response.status;
      if (!response.ok) throw new Error(`Clipku HTTP ${response.status}`);
      const data = await response.json();
      const ops: Promise<unknown>[] = [
        this.saveApiLog(endpointId, path.split("/")[1] ?? "system", url.toString(), params, status, data, Date.now() - started)
      ];
      if (CACHE_ENABLED) {
        ops.push(
          db.apiCache.upsert({
            where: { key: cacheKey },
            create: { key: cacheKey, value: data, expiresAt: new Date(Date.now() + CACHE_TTL) },
            update: { value: data, expiresAt: new Date(Date.now() + CACHE_TTL) }
          })
        );
      }
      await Promise.all(ops);
      return data;
    } catch (error) {
      await this.saveApiLog(endpointId, path.split("/")[1] ?? "system", url.toString(), params, status, null, Date.now() - started, String(error));
      if (cached) return cached.value;
      throw new Error("API Clipku sedang bermasalah, silakan coba lagi nanti.");
    }
  }

  async fetchDocumentation() {
    const response = await fetch(BASE, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
    if (!response.ok) throw new Error("Dokumentasi API Clipku tidak dapat dimuat.");
    return response.text();
  }

  parseEndpoints(html: string): ScannedEndpoint[] {
    const source = html.match(/const PROVIDERS\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1] ?? "";
    const starts = [...source.matchAll(/\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'[\s\S]*?category:\s*'([^']+)'/g)];
    const result: ScannedEndpoint[] = [];
    starts.forEach((match, index) => {
      const slug = match[1];
      const name = match[2];
      const category = match[3];
      if (category !== "Short Drama API" && category !== "Movie API") return;
      const block = source.slice(match.index, starts[index + 1]?.index ?? source.length);
      for (const endpoint of block.matchAll(/id:\s*'([^']+)',\s*path:\s*'([^']+)',\s*desc:\s*'([^']+)'[\s\S]*?fields:\s*\[([\s\S]*?)\]\s*\}/g)) {
        const queryParams = [...endpoint[4].matchAll(/name:\s*'([^']+)'/g)].map((item) => item[1]);
        result.push({
          providerName: name,
          providerSlug: slug,
          providerType: category === "Movie API" ? "Movie" : "Short Drama",
          method: "GET",
          path: endpoint[2],
          endpointName: endpoint[1],
          description: endpoint[3],
          queryParams
        });
      }
    });
    return result;
  }

  async scanEndpoints() {
    const endpoints = this.parseEndpoints(await this.fetchDocumentation());
    for (const endpoint of endpoints) {
      await db.apiEndpoint.upsert({
        where: { providerSlug_path: { providerSlug: endpoint.providerSlug, path: endpoint.path } },
        create: {
          providerName: endpoint.providerName,
          providerSlug: endpoint.providerSlug,
          providerType: endpoint.providerType,
          method: endpoint.method,
          path: endpoint.path,
          endpointName: endpoint.endpointName,
          description: endpoint.description,
          fullUrl: allowedUrl(endpoint.path),
          queryParamsJson: endpoint.queryParams
        },
        update: {
          providerName: endpoint.providerName,
          providerType: endpoint.providerType,
          endpointName: endpoint.endpointName,
          description: endpoint.description,
          queryParamsJson: endpoint.queryParams,
          fullUrl: allowedUrl(endpoint.path)
        }
      });
    }
    return endpoints;
  }

  async checkStatus() { return this.request("/"); }
  async getProviderList() { return db.apiEndpoint.groupBy({ by: ["providerName", "providerSlug", "providerType"], where: { isActive: true } }); }
  async getEndpointList(provider?: string) { return db.apiEndpoint.findMany({ where: { providerSlug: provider, isActive: true } }); }
  async getHome(provider: string, page = 1) { return this.request(`/${provider}/home`, { page }); }
  async getLatest(provider: string, page = 1) { return this.request(`/${provider}/new`, { page }); }
  async getPopular(provider: string, page = 1) { return this.request(`/${provider}/populer`, { page }); }
  async search(provider: string, keyword: string) { return this.request(`/${provider}/search`, { q: keyword }); }
  async getDetail(provider: string, id: string) {
    const params = provider === "dramabox" ? { bookId: id } : { id };
    return this.request(`/${provider}/detail`, params);
  }
  async getStream(provider: string, id: string, ep = 1) {
    if (provider === "moviebox") {
      const detail = await this.getDetail(provider, id);
      const detailData = detail && typeof detail === "object"
        ? ((detail as Record<string, unknown>).data as Record<string, unknown> | undefined)
        : undefined;
      const subjectType = Number(detailData?.subjectType ?? 0);
      const path = subjectType === 1 ? "/moviebox/download-movie" : "/moviebox/download-series";
      const params: Record<string, string | number> = { subjectId: id, resolution: 720 };
      if (path.endsWith("series")) params.se = ep;
      const response = await this.request(path, params);
      const responseData = response && typeof response === "object"
        ? ((response as Record<string, unknown>).data as Record<string, unknown> | undefined)
        : undefined;
      if (path.endsWith("series") && responseData && Array.isArray(responseData.episodes)) {
        const selected = responseData.episodes.find((item) => {
          if (!item || typeof item !== "object") return false;
          const episode = (item as Record<string, unknown>).ep ?? (item as Record<string, unknown>).episode;
          return Number(episode) === ep;
        });
        if (selected) return selected;
      }
      return response;
    }
    // Provider-specific parameter mapping
    const paramMap: Record<string, Record<string, string | number>> = {
      freereels: { dramaId: id, episode: ep, lang: "id" },
      dramawave: { dramaId: id, episode: ep, lang: "id" },
      reelshort: { id, episode_no: ep },
      netshort: { id, episode_no: ep },
      shortmax: { id, episode_no: ep, next: 0 },
      dramabox: { bookId: id, chapterIndex: Math.max(0, ep - 1), lang: "in" },
      goodshort: { bookId: id },
    };
    if (provider === "meloshort") {
      const detail = await this.getDetail(provider, id);
      const data = detail && typeof detail === "object"
        ? ((detail as Record<string, unknown>).data as Record<string, unknown> | undefined)
        : undefined;
      const videos = data?.video_list;
      const episodes = data?.episodes;
      const selected = Array.isArray(videos) ? videos[ep - 1] : Array.isArray(episodes) ? episodes[ep - 1] : undefined;
      const chapterId = selected && typeof selected === "object"
        ? ((selected as Record<string, unknown>).episode_id ?? (selected as Record<string, unknown>).chapter_id)
        : undefined;
      if (typeof chapterId !== "string") throw new Error(`Episode ${ep} tidak ditemukan.`);
      return this.request(`/${provider}/stream`, { drama_id: id, chapter_id: chapterId });
    }
    const params = paramMap[provider] ?? { id, ep };
    return this.request(`/${provider}/stream`, params);
  }
  async getStreamV2(provider: string, id: string, ep = 1) {
    const params = provider === "reelshort" ? { id, episode_no: ep } : { id, ep };
    return this.request(`/${provider}/streamv2`, params);
  }
  async getLanguages(provider: string) { return this.request(`/${provider}/languages`); }
  async getCategories(provider: string) { return this.request(`/${provider}/categories`); }
  async getRanking(provider: string) { return this.request(`/${provider}/ranking`); }
  async getRecommend(provider: string) { return this.request(`/${provider}/recommend`); }
  mapResponse(response: unknown, mapping: Record<string, string>) {
    return Object.fromEntries(Object.entries(mapping).map(([field, path]) => [field, readPath(response, path)]));
  }
  async clearCache() { return db.apiCache.deleteMany(); }
  async saveApiLog(endpointId: string | undefined, providerName: string, url: string, params: object, responseStatus?: number, responseBody?: unknown, responseTime = 0, errorMessage?: string) {
    return db.apiLog.create({
      data: { endpointId, providerName, method: "GET", url, requestParams: params, responseStatus, responseBody: responseBody as object | undefined, responseTime, errorMessage }
    });
  }
}

export const clipku = new ClipkuApiService();
