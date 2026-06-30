import { NextRequest } from "next/server";
import { clipku } from "@/services/clipku-api-service";
import { auth } from "@/services/auth-service";

export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const requests = new Map<string, { count: number; resetAt: number }>();

function takeRateLimit(key: string) {
  const now = Date.now();
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= MAX_REQUESTS,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

function logProxy(event: string, fields: Record<string, unknown>) {
  console.info(JSON.stringify({ scope: "video-proxy", event, at: new Date().toISOString(), ...fields }));
}

function isAllowedVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "dramaboxdb.com" || url.hostname.endsWith(".dramaboxdb.com"));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const user = await auth.currentUser();
  if (!user) {
    return Response.json({ message: "Silakan masuk untuk menonton." }, { status: 401 });
  }
  const limit = takeRateLimit(user.id);
  if (!limit.allowed) {
    return Response.json(
      { message: "Terlalu banyak permintaan video. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let source: string | null = null;
  const bookId = request.nextUrl.searchParams.get("bookId");
  const rawEpisode = Number(request.nextUrl.searchParams.get("ep") ?? 1);
  const episode = Number.isSafeInteger(rawEpisode) ? Math.max(1, Math.min(rawEpisode, 10_000)) : 1;

  if (bookId && /^[\w-]{1,128}$/.test(bookId)) {
    try {
      const payload = await clipku.getStream("dramabox", bookId, episode);
      const data = payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).data
        : null;
      const videoUrl = data && typeof data === "object"
        ? (data as Record<string, unknown>).videoUrl
        : null;
      source = typeof videoUrl === "string" ? videoUrl : null;
    } catch {
      source = null;
    }
  }

  if (!source || !isAllowedVideoUrl(source)) {
    logProxy("invalid-source", { userId: user.id, bookId, episode });
    return Response.json({ message: "URL video tidak valid." }, { status: 400 });
  }

  const headers = new Headers({
    Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
    "User-Agent": request.headers.get("user-agent") ?? "Mozilla/5.0",
  });
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  try {
    const upstream = await fetch(source, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok && upstream.status !== 206) {
      logProxy("upstream-error", { userId: user.id, bookId, episode, status: upstream.status, durationMs: Date.now() - startedAt });
      return Response.json({ message: "Sumber video tidak tersedia." }, { status: upstream.status });
    }

    const responseHeaders = new Headers({
      "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
      "Cache-Control": "private, no-store",
      "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    logProxy("stream", { userId: user.id, bookId, episode, status: upstream.status, durationMs: Date.now() - startedAt });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    logProxy("fetch-failed", {
      userId: user.id,
      bookId,
      episode,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.name : "unknown",
    });
    return Response.json({ message: "Gagal mengambil sumber video." }, { status: 502 });
  }
}
