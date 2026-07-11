import { db } from "@/lib/db";

function rawObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function genreList(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

async function main() {
  const rows = await db.content.findMany({
    where: { providerSlug: "moviebox" },
    select: { id: true, apiRawResponse: true },
  });
  let updated = 0;
  for (const row of rows) {
    const raw = rawObject(row.apiRawResponse);
    const genre = genreList(raw.genre);
    const country = typeof raw.countryName === "string" ? raw.countryName : null;
    const viewers = numberValue(raw.viewers);
    const rating = Number(raw.imdbRatingValue ?? raw.imdbRate ?? 0);
    await db.content.update({
      where: { id: row.id },
      data: {
        ...(genre.length ? { genre, category: genre.join(", ") } : {}),
        ...(country ? { language: country } : {}),
        ...(viewers ? { providerViewCount: viewers } : {}),
        ...(Number.isFinite(rating) && rating > 0 ? { rating } : {}),
      },
    });
    updated++;
  }
  console.log(`Updated ${updated} MovieBox rows`);
}

main().finally(() => db.$disconnect());
