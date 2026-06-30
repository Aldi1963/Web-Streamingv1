import { NextRequest } from "next/server";
import https from "node:https";
import http from "node:http";
import { Readable } from "node:stream";
import { clipku } from "@/services/clipku-api-service";

export const dynamic = "force-dynamic";

const PROXYABLE_PROVIDERS = new Set(["dramabox", "netshort"]);
const INSECURE_TLS_HOSTS = new Set(["awscdn.netshort.com"]);

function isAllowedVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (
        url.hostname === "dramaboxdb.com" ||
        url.hostname.endsWith(".dramaboxdb.com") ||
        url.hostname === "awscdn.netshort.com" ||
        url.hostname.endsWith(".netshort.com")
      );
  } catch {
    return false;
  }
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
    for (const key of ["play_url", "url", "stream_url", "hls_url", "filePath", "video_url", "main_url", "backup_url", "source"]) {
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

function requestVideoStream(source: string, range: string | null, redirectCount = 0): Promise<Response> {
  return new Promise((resolve, reject) => {
    const url = new URL(source);
    const client = url.protocol === "http:" ? http : https;
    const req = client.request(
      url,
      {
        method: "GET",
        headers: {
          Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0",
          ...(range ? { Range: range } : {}),
        },
        rejectUnauthorized: !INSECURE_TLS_HOSTS.has(url.hostname),
      },
      (res) => {
        const status = res.statusCode ?? 500;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location && redirectCount < 3) {
          res.resume();
          resolve(requestVideoStream(new URL(location, source).toString(), range, redirectCount + 1));
          return;
        }

        const headers = new Headers();
        for (const name of ["accept-ranges", "cache-control", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
          const value = res.headers[name];
          if (typeof value === "string") headers.set(name, value);
        }

        resolve(
          new Response(Readable.toWeb(res) as ReadableStream, {
            status,
            headers,
          }),
        );
      },
    );

    req.setTimeout(20_000, () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
    req.end();
  });
}

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider") ?? "dramabox";
  let source = request.nextUrl.searchParams.get("url");
  const contentId = request.nextUrl.searchParams.get("contentId") ?? request.nextUrl.searchParams.get("bookId");
  const episode = Math.max(1, Number(request.nextUrl.searchParams.get("ep") ?? 1));

  if (!PROXYABLE_PROVIDERS.has(provider)) {
    return Response.json({ message: "Provider video tidak didukung." }, { status: 400 });
  }

  if (!source && contentId) {
    try {
      const payload = await clipku.getStream(provider, contentId, episode);
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
