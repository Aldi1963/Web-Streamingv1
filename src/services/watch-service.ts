import { db } from "@/lib/db";
import { clipku } from "./clipku-api-service";
import { playbackAccess } from "./playback-access-service";

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

export class WatchService {
  async authorize(userId: string, contentId: string, episode = 1) {
    const access = await playbackAccess(userId, episode);
    if (!access.allowed) throw new Error("Episode 9 dan seterusnya memerlukan paket aktif.");
    const content = await db.content.findUniqueOrThrow({ where: { id: contentId } });
    let response: unknown;
    try { response = await clipku.getStreamV2(content.providerSlug, content.clipkuContentId, episode); }
    catch { response = await clipku.getStream(content.providerSlug, content.clipkuContentId, episode); }
    const url = streamValue(response, ["hls_url", "video_url", "url", "data.hls_url", "data.video_url", "data.url", "result.url"]);
    if (!url) throw new Error("Playback URL belum ditemukan.");
    return { url, type: url.includes(".m3u8") ? "hls" : "mp4", expiresIn: 300, access };
  }
}
export const watchService = new WatchService();
