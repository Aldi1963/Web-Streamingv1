import { NextRequest } from "next/server";
import { clipku } from "@/services/clipku-api-service";
import { isProxyableMediaUrl } from "@/lib/stream-utils";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { safeMediaFetch } from "@/lib/safe-media-fetch";
import { playbackAccess } from "@/services/playback-access-service";

export const dynamic = "force-dynamic";

const PROXYABLE_PROVIDERS = new Set(["dramabox", "netshort", "melolo"]);
const FREE_EPISODE_LIMIT = 8;

function isAllowedVideoUrl(value: string) {
  return isProxyableMediaUrl(value);
}

function extractStreamUrl(value: unknown, depth = 0): string | null {
  if (depth > 10 || !value) return null;
  if (typeof value === "string") {
    const isMediaUrl =
      /\.(m3u8|mp4)(?:[?&]|$)/i.test(value) ||
      /\/proxy\/m3u8(?:\?|$)/i.test(value) ||
      /[?&]mime_type=video_(?:mp4|h264)(?:[&#]|$)/i.test(value) ||
      /^https:\/\/[^/]+\.montagehub\.xyz\/.+[?&]auth_key=/i.test(value);
    return /^https?:\/\//i.test(value) && isMediaUrl ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractStreamUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["play_url", "url", "stream_url", "hls_url", "filePath", "video_url", "main_url", "backup_url", "source", "resourceLink"]) {
      const item = record[key];
      if (typeof item === "string" && /^https?:\/\//i.test(item) && isAllowedVideoUrl(item)) return item;
    }
    for (const item of Object.values(record)) {
      const found = extractStreamUrl(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function selectEpisodePayload(raw: unknown, provider: string, episode: number): unknown {
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

async function authorizeDbContent(contentId: string | null, episode: number) {
  if (!contentId) return false;
  const content = await db.content.findFirst({
    where: { id: contentId, isActive: true },
    select: { id: true },
  });
  if (!content) return false;
  const user = await auth.currentUser();
  return (await playbackAccess(user?.id ?? "", episode)).allowed;
}

function requestVideoStream(source: string, range: string | null) {
  return safeMediaFetch(source, isAllowedVideoUrl, {
    headers: {
      Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0",
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") ?? "dramabox";
  let source = request.nextUrl.searchParams.get("url");
  const contentId = request.nextUrl.searchParams.get("contentId") ?? request.nextUrl.searchParams.get("bookId");
  const contentDbId = request.nextUrl.searchParams.get("contentDbId");
  const episode = Math.max(1, Number(request.nextUrl.searchParams.get("ep") ?? 1));

  if (!PROXYABLE_PROVIDERS.has(provider)) {
    return Response.json({ message: "Provider video tidak didukung." }, { status: 400 });
  }

  if (source && !await authorizeDbContent(contentDbId, episode)) {
    return Response.json({ message: episode > FREE_EPISODE_LIMIT ? "Langganan aktif diperlukan." : "Akses media tidak valid." }, { status: episode > FREE_EPISODE_LIMIT ? 402 : 403 });
  }

  if (contentId && episode > FREE_EPISODE_LIMIT) {
    const user = await auth.currentUser();
    if (!user) return Response.json({ message: "Login diperlukan untuk melanjutkan." }, { status: 401 });
    const content = await db.content.findFirst({
      where: { providerSlug: provider, clipkuContentId: contentId, isActive: true },
      select: { id: true },
    });
    if (!content) return Response.json({ message: "Konten tidak ditemukan." }, { status: 404 });
    if (!(await playbackAccess(user.id, episode)).allowed) {
      return Response.json({ message: "Langganan aktif diperlukan." }, { status: 402 });
    }
  }

  if (!source && contentId) {
    try {
      const payload = provider === "melolo" || provider === "netshort"
        ? await clipku.getStreamV2(provider, contentId, episode)
        : await clipku.getStream(provider, contentId, episode);
      source = extractStreamUrl(selectEpisodePayload(payload, provider, episode));
    } catch {
      source = null;
    }
  }

  if (!source || !isAllowedVideoUrl(source)) {
    return Response.json({ message: "URL video tidak valid." }, { status: 400 });
  }

  const range = request.headers.get("range");

  try {
    const upstream = await requestVideoStream(source, range);
    if (!upstream.ok && upstream.status !== 206) {
      return Response.json({ message: "Sumber video tidak tersedia." }, { status: upstream.status });
    }

    const responseHeaders = new Headers({
      "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
      "Cache-Control": "private, no-store",
      "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
    });
    for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ message: "Gagal mengambil sumber video." }, { status: 502 });
  }
}
