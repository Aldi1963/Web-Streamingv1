import { db } from "../src/lib/db";

function text(row: unknown, keys: string[]) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const source = row as Record<string, unknown>;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function browserCompatiblePoster(url: string) {
  try {
    const target = new URL(url);
    if (target.pathname.toLowerCase().endsWith(".heic") || target.hostname === "awscover.netshort.com") {
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp&w=570`;
    }
  } catch {
    return url;
  }
  return url;
}

async function main() {
  const items = await db.content.findMany({
    where: {
      isActive: true,
      OR: [
        { posterUrl: null },
        { posterUrl: { startsWith: "/provider-logos/" } },
      ],
    },
    select: { id: true, providerSlug: true, apiRawResponse: true },
  });
  let realPosters = 0;
  let fallbackPosters = 0;
  for (const item of items) {
    const rawPoster = text(item.apiRawResponse, [
      "coverWap",
      "bookCover",
      "book_cover",
      "thumb_url",
      "thumbUrl",
      "poster_url",
      "posterUrl",
      "coverUrl",
      "cover",
      "poster",
      "image",
      "thumbnail",
      "thumbnailUrl",
    ]);
    const poster = rawPoster ? browserCompatiblePoster(rawPoster) : `/provider-logos/${item.providerSlug}.jpg`;
    await db.content.update({
      where: { id: item.id },
      data: { posterUrl: poster, thumbnailUrl: poster },
    });
    if (rawPoster) realPosters++;
    else fallbackPosters++;
  }
  console.log(JSON.stringify({ updated: items.length, realPosters, fallbackPosters }));
}

main().finally(() => db.$disconnect());
