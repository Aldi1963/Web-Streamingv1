import { db } from "@/lib/db";
import { extractStreamUrl, extractSubtitleUrl, proxyMediaUrl, selectEpisodePayload } from "@/lib/stream-utils";
import { clipku } from "./clipku-api-service";

const FREE_EPISODE_LIMIT = 8;
const PROXY_STREAM_PROVIDERS = new Set(["dramabox", "melolo"]);

function streamValue(data: unknown, keys: string[]): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  for (const key of keys) {
    const value = key.split(".").reduce<unknown>((current, part) => current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, data);
    if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  }
  const candidates: Array<{ url: string; score: number }> = [];
  function visit(value: unknown, path = "") {
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${path}.${index}`));
    if (value && typeof value === "object")
      return Object.entries(value).forEach(([key, item]) => visit(item, `${path}.${key}`));
    if (typeof value !== "string" || !/^https?:\/\//.test(value)) return;
    const lower = path.toLowerCase();
    if (/cover|poster|thumb|image|subtitle|contact|author/.test(lower)) return;
    let score = 0;
    if (/hls|m3u8/.test(lower) || /\.m3u8(?:\?|$)/.test(value)) score += 5;
    if (/video|play|stream/.test(lower)) score += 3;
    if (/url|path/.test(lower)) score += 1;
    candidates.push({ url: value, score });
  }
  visit(data);
  return candidates.sort((a, b) => b.score - a.score)[0]?.url;
}

function upstreamError(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const error = record.error_msg ?? record.error ?? record.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return undefined;
}

export class WatchService {
  async authorize(userId: string | null, contentId: string, episode = 1) {
    const content = await db.content.findUniqueOrThrow({ where: { id: contentId } });
    const normalizedEpisode = Math.max(1, Math.floor(episode));
    if (normalizedEpisode > FREE_EPISODE_LIMIT) {
      if (!userId) throw new Error("Login diperlukan untuk melanjutkan.");
      const subscription = await db.subscription.findFirst({
        where: { userId, status: { in: ["ACTIVE", "TRIAL", "GRACE"] }, expiresAt: { gt: new Date() } },
        include: { plan: true },
      });
      if (!subscription) throw new Error("Langganan aktif diperlukan untuk menonton.");
    }

    if (PROXY_STREAM_PROVIDERS.has(content.providerSlug)) {
      const params = new URLSearchParams({
        provider: content.providerSlug,
        contentId: content.clipkuContentId,
        contentDbId: content.id,
        ep: String(normalizedEpisode),
      });
      return {
        url: `/api/video-proxy?${params.toString()}`,
        type: "mp4",
        expiresIn: 300,
      };
    }

    let response: unknown;
    let episodePayload: unknown;
    let url: string | undefined;
    if (content.providerSlug === "shortmax") {
      response = await clipku.getStream(content.providerSlug, content.clipkuContentId, normalizedEpisode, content.apiRawResponse);
      episodePayload = selectEpisodePayload(response, content.providerSlug, normalizedEpisode);
      url = extractStreamUrl(episodePayload) ?? streamValue(episodePayload, ["hls_url", "video_url", "url", "data.hls_url", "data.video_url", "data.url", "result.url"]);
      if (!url) {
        response = await clipku.getShortmaxStreamV2(content.clipkuContentId, normalizedEpisode, content.apiRawResponse);
      }
    } else if (content.providerSlug === "drama") {
      response = await clipku.getStream(content.providerSlug, content.clipkuContentId, normalizedEpisode, content.apiRawResponse);
    } else {
      try { response = await clipku.getStreamV2(content.providerSlug, content.clipkuContentId, normalizedEpisode); }
      catch { response = await clipku.getStream(content.providerSlug, content.clipkuContentId, normalizedEpisode, content.apiRawResponse); }
    }
    episodePayload = selectEpisodePayload(response, content.providerSlug, normalizedEpisode);
    const upstreamMessage = upstreamError(episodePayload);
    if (upstreamMessage) throw new Error(upstreamMessage);
    url = extractStreamUrl(episodePayload) ?? streamValue(episodePayload, ["hls_url", "video_url", "url", "data.hls_url", "data.video_url", "data.url", "result.url"]);
    if (!url) throw new Error("Playback URL belum ditemukan.");
    const subtitle = extractSubtitleUrl(episodePayload);
    return {
      url: proxyMediaUrl(url, { contentId, episode: normalizedEpisode }),
      subtitle,
      type: url.includes(".m3u8") ? "hls" : "mp4",
      expiresIn: 300,
    };
  }
}
export const watchService = new WatchService();
