import { db } from "../src/lib/db";
import { clipku } from "../src/services/clipku-api-service";

function findPoster(value: unknown, depth = 0): string | null {
  if (!value || depth > 6 || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPoster(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of ["bookCover", "posterUrl", "poster_url", "coverUrl", "cover", "poster", "image"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;
  }
  for (const nested of Object.values(record)) {
    const found = findPoster(nested, depth + 1);
    if (found) return found;
  }
  return null;
}

async function main() {
  const provider = process.env.PROVIDER?.trim();
  const items = await db.content.findMany({
    where: {
      isActive: true,
      ...(provider ? { providerSlug: provider } : {}),
      OR: [
        { posterUrl: null },
        { posterUrl: { startsWith: "/provider-logos/" } },
      ],
    },
    select: { id: true, providerSlug: true, clipkuContentId: true },
  });
  let enriched = 0;
  let fallback = 0;
  for (const item of items) {
    let poster: string | null = null;
    try {
      poster = findPoster(await clipku.getDetail(item.providerSlug, item.clipkuContentId));
    } catch {
      // Keep the provider logo when the upstream detail endpoint is unavailable.
    }
    poster ??= `/provider-logos/${item.providerSlug}.jpg`;
    await db.content.update({
      where: { id: item.id },
      data: { posterUrl: poster, thumbnailUrl: poster },
    });
    if (poster.startsWith("/provider-logos/")) fallback++;
    else enriched++;
  }
  console.log(JSON.stringify({ updated: items.length, enriched, fallback }));
}

main().finally(() => db.$disconnect());
