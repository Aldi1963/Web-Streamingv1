import { db } from "../src/lib/db";
import { clipku } from "../src/services/clipku-api-service";

function isMediaUrl(value: string) {
  return /\.(m3u8|mp4)(?:[?&]|$)/i.test(value) || /\/proxy\/m3u8(?:\?|$)/i.test(value);
}

function mediaUrl(value: unknown, depth = 0): string | null {
  if (!value || depth > 12) return null;
  if (typeof value === "string") return isMediaUrl(value) ? value : null;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["play_url", "url", "stream_url", "hls_url", "filePath", "video_url", "source"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;
    }
    for (const nested of Object.values(record)) {
      const found = mediaUrl(nested, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function findEpisodeArray(value: unknown, depth = 0): unknown[] | null {
  if (!value || depth > 8) return null;
  if (Array.isArray(value)) {
    const mediaItems = value.filter(item => mediaUrl(item));
    if (mediaItems.length >= 2) return value;
    for (const item of value) {
      const found = findEpisodeArray(item, depth + 1);
      if (found) return found;
    }
  } else if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = findEpisodeArray(nested, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function main() {
  const providers = await db.content.groupBy({
    by: ["providerSlug", "providerName"],
    where: { isActive: true },
  });

  for (const provider of providers) {
    const content = await db.content.findFirst({
      where: { providerSlug: provider.providerSlug, isActive: true },
      select: { title: true, clipkuContentId: true },
    });
    if (!content) continue;
    try {
      const v2 = new Set(["melolo", "dramawave", "reelshort", "netshort", "shortmax"]);
      async function resolve(episode: number) {
        let raw: unknown = null;
        if (v2.has(provider.providerSlug)) {
          try { raw = await clipku.getStreamV2(provider.providerSlug, content!.clipkuContentId, episode); }
          catch { raw = null; }
        }
        if (!mediaUrl(raw)) raw = await clipku.getStream(provider.providerSlug, content!.clipkuContentId, episode);
        if (provider.providerSlug === "goodshort" && raw && typeof raw === "object") {
          const data = (raw as Record<string, unknown>).data;
          const list = data && typeof data === "object" ? (data as Record<string, unknown>).downloadList : null;
          if (Array.isArray(list)) raw = list[episode - 1];
        }
        return { raw, url: mediaUrl(raw) };
      }
      const [one, two] = await Promise.all([resolve(1), resolve(2)]);
      const array = findEpisodeArray(one.raw);
      const urlOne = one.url;
      const urlTwo = two.url;
      console.log(JSON.stringify({
        provider: provider.providerSlug,
        title: content.title,
        mode: array ? "all-episodes" : "per-episode",
        episodeCountInResponse: array?.length,
        episode1: Boolean(urlOne),
        episode2: Boolean(urlTwo),
        different: Boolean(urlOne && urlTwo && urlOne !== urlTwo),
      }));
    } catch (error) {
      console.log(JSON.stringify({
        provider: provider.providerSlug,
        title: content.title,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
}

main().finally(() => db.$disconnect());
