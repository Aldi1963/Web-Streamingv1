import { NextRequest } from "next/server";
import { isProxyableMediaUrl } from "@/lib/stream-utils";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const FREE_EPISODE_LIMIT = 8;

function allowedSource(value: string) {
  return isProxyableMediaUrl(value);
}

async function authorized(contentId: string | null, episode: number) {
  if (!contentId) return false;
  const content = await db.content.findFirst({
    where: { id: contentId, isActive: true },
    select: { id: true },
  });
  if (!content) return false;
  if (episode <= FREE_EPISODE_LIMIT) return true;
  const user = await auth.currentUser();
  if (!user) return false;
  const subscription = await db.subscription.findFirst({
    where: { userId: user.id, status: { in: ["ACTIVE", "TRIAL", "GRACE"] }, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return Boolean(subscription);
}

function proxyUrl(value: string, base: string, context: { contentId: string; episode: number }) {
  const absolute = new URL(value, base).toString();
  if (!allowedSource(absolute)) throw new Error("Host media tidak diizinkan.");
  return `/api/hls-proxy?url=${encodeURIComponent(absolute)}&contentDbId=${encodeURIComponent(context.contentId)}&ep=${context.episode}`;
}

function rewritePlaylist(playlist: string, source: string, context: { contentId: string; episode: number }) {
  return playlist
    .replace(/URI="([^"]+)"/g, (_match, value: string) => `URI="${proxyUrl(value, source, context)}"`)
    .split("\n")
    .map(line => {
      const value = line.trim();
      return !value || value.startsWith("#") ? line : proxyUrl(value, source, context);
    })
    .join("\n");
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  const contentId = request.nextUrl.searchParams.get("contentDbId");
  const episode = Math.max(1, Number(request.nextUrl.searchParams.get("ep") ?? 1));
  if (!source || !allowedSource(source)) {
    return Response.json({ message: "URL media tidak valid." }, { status: 400 });
  }
  if (!contentId || !await authorized(contentId, episode)) {
    return Response.json({ message: episode > FREE_EPISODE_LIMIT ? "Langganan aktif diperlukan." : "Akses media tidak valid." }, { status: episode > FREE_EPISODE_LIMIT ? 402 : 403 });
  }

  try {
    const range = request.headers.get("range");
    const upstream = await fetch(source, {
      headers: {
        Accept: "*/*",
        "User-Agent": "Mozilla/5.0",
        ...(range ? { Range: range } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok && upstream.status !== 206) {
      return Response.json({ message: "Sumber media tidak tersedia." }, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const isPlaylist = new URL(source).pathname.endsWith(".m3u8") || /mpegurl/i.test(contentType);
    if (isPlaylist) {
      return new Response(rewritePlaylist(await upstream.text(), source, { contentId, episode }), {
        status: upstream.status,
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Type": "application/vnd.apple.mpegurl",
        },
      });
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Type": contentType,
    });
    for (const name of ["accept-ranges", "content-length", "content-range"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json({ message: "Gagal mengambil media." }, { status: 502 });
  }
}
