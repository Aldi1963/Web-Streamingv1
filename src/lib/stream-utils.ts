export const PROXYABLE_MEDIA_HOSTS = [
  "api.clipku.com",
  "dramaboxdb.com",
  "*.dramaboxdb.com",
  "awscdn.netshort.com",
  "*.netshort.com",
  "*.crazymaplestudios.com",
  "*.yfeitrade.com",
  "*.goodreels.com",
  "*.shortswave.com",
  "*.aoneroom.com",
  "*.farsunpteltd.com",
  "*.tiktokcdn.com",
  "*.tiktokv.com",
  "*.byteicdn.com",
  "*.shorttv.live",
  "*.shorttv.app",
  "melolostatic.com",
  "*.melolostatic.com",
  "*.dramabos.my.id",
  "dramakuy.com",
  "*.dramakuy.com",
  "*.mydramawave.com",
  "drakor.cc",
  "*.drakor.cc",
  "proxy.sonzaixlab.workers.dev",
  "*.hakunaymatata.com",
] as const;

function matchesProxyableMediaHost(hostname: string) {
  return PROXYABLE_MEDIA_HOSTS.some(pattern => {
    if (pattern.startsWith("*.")) return hostname === pattern.slice(2) || hostname.endsWith(pattern.slice(1));
    return hostname === pattern;
  });
}

export function isProxyableMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && matchesProxyableMediaHost(url.hostname);
  } catch {
    return false;
  }
}

export function proxyMediaUrl(value: string, context?: { contentId: string; episode: number }) {
  if (value.startsWith("/api/video-proxy") || value.startsWith("/api/hls-proxy")) return value;
  if (!isProxyableMediaUrl(value)) return value;
  const target = /\.(m3u8)(?:[?&]|$)/i.test(value) || /\/proxy\/m3u8(?:\?|$)/i.test(value)
    ? `/api/hls-proxy?url=${encodeURIComponent(value)}`
    : `/api/video-proxy?url=${encodeURIComponent(value)}`;
  if (!context) return target;
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}contentDbId=${encodeURIComponent(context.contentId)}&ep=${context.episode}`;
}

export function selectEpisodePayload(raw: unknown, provider: string, episode: number): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  if (provider === "goodshort") {
    const data = record.data;
    if (data && typeof data === "object") {
      const list = (data as Record<string, unknown>).downloadList;
      if (Array.isArray(list)) return list[episode - 1] ?? null;
    }
  }
  return raw;
}

function isMediaUrl(value: string) {
  return /\.(m3u8|mp4)(?:[?&]|$)/i.test(value)
    || /\/proxy\/m3u8(?:\?|$)/i.test(value)
    || /^https:\/\/proxy\.sonzaixlab\.workers\.dev\/stream\?/i.test(value)
    || /[?&]mime_type=video_(?:mp4|h264)(?:[&#]|$)/i.test(value)
    || /^https:\/\/[^/]+\.montagehub\.xyz\/.+[?&]auth_key=/i.test(value);
}

export function extractStreamUrl(obj: unknown, depth = 0): string | null {
  if (depth > 10 || !obj) return null;
  if (typeof obj === "string") {
    return /^https?:\/\//i.test(obj) && isMediaUrl(obj) ? obj : null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = extractStreamUrl(item, depth + 1);
      if (found) return found;
    }
  } else if (typeof obj === "object") {
    const known = [
      "720p", "1080p", "480p", "360p",
      "play_url", "url", "stream_url", "hls_url", "filePath", "video_url",
      "main_url", "playVoucher", "backup_url", "source", "resourceLink",
    ];
    for (const key of known) {
      const value = (obj as Record<string, unknown>)[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value) && isMediaUrl(value)) return value;
    }
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const found = extractStreamUrl(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function isSubtitleUrl(value: string) {
  return /^https?:\/\//i.test(value)
    && (
      /\.(?:vtt|srt)(?:[?&#]|$)/i.test(value)
      || /subtitle|caption|mime_type=text_(?:plain|vtt|srt)/i.test(value)
    );
}

export function extractSubtitleUrl(obj: unknown, depth = 0): string | null {
  if (depth > 10 || !obj) return null;
  if (typeof obj === "string") return isSubtitleUrl(obj) ? obj : null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = extractSubtitleUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  const known = [
    "subtitle_url", "subtitleUrl", "subtitle", "subtitlePath", "caption_url", "captionUrl",
    "vtt", "srt", "url", "file", "src",
  ];
  for (const key of known) {
    const value = record[key];
    if (typeof value === "string" && isSubtitleUrl(value)) return value;
  }
  for (const key of ["subtitleList", "subtitle_list", "subtitles", "captions", "tracks"]) {
    const list = record[key];
    if (Array.isArray(list)) {
      const preferred = list.find(item => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        return /id|in|indo|indonesia/i.test(String(row.language ?? row.lang ?? row.label ?? row.name ?? ""));
      });
      const found = extractSubtitleUrl(preferred ?? list[0], depth + 1);
      if (found) return found;
    }
  }
  for (const value of Object.values(record)) {
    const found = extractSubtitleUrl(value, depth + 1);
    if (found) return found;
  }
  return null;
}
