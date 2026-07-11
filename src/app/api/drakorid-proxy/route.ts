import { NextRequest } from "next/server";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";

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
  return `/api/drakorid-proxy?url=${encodeURIComponent(absolute)}`;
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
  if (!source || !isAllowedSource(source)) {
    return Response.json({ message: "URL media tidak valid." }, { status: 400 });
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
