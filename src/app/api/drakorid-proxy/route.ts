import { NextRequest } from "next/server";
import { safeMediaFetch } from "@/lib/safe-media-fetch";
import { signMediaUrl, verifyMediaUrl } from "@/lib/media-token";

export const dynamic = "force-dynamic";

function isAllowedSource(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "drakor.cc" || url.hostname.endsWith(".drakor.cc"));
  } catch {
    return false;
  }
}

function proxyUrl(value: string, base: string) {
  const absolute = new URL(value, base).toString();
  if (!isAllowedSource(absolute)) throw new Error("Host media tidak diizinkan.");
  const { signature, expiresAt } = signMediaUrl(absolute);
  return `/api/drakorid-proxy?url=${encodeURIComponent(absolute)}&exp=${expiresAt}&sig=${signature}`;
}

function rewritePlaylist(playlist: string, source: string) {
  return playlist
    .replace(/URI="([^"]+)"/g, (_match, value: string) => `URI="${proxyUrl(value, source)}"`)
    .split("\n")
    .map(line => {
      const value = line.trim();
      return !value || value.startsWith("#") ? line : proxyUrl(value, source);
    })
    .join("\n");
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  const expiresAt = Number(request.nextUrl.searchParams.get("exp"));
  const signature = request.nextUrl.searchParams.get("sig");
  if (!source || !isAllowedSource(source)) {
    return Response.json({ message: "URL media tidak valid." }, { status: 400 });
  }
  if (!verifyMediaUrl(source, expiresAt, signature)) {
    return Response.json({ message: "Akses media tidak valid." }, { status: 403 });
  }

  try {
    const range = request.headers.get("range");
    const upstream = await safeMediaFetch(source, isAllowedSource, {
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
      return new Response(rewritePlaylist(await upstream.text(), source), {
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
