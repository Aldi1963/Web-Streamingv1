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
      "play_url", "url", "stream_url", "hls_url", "filePath", "video_url",
      "main_url", "playVoucher", "backup_url", "source",
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
