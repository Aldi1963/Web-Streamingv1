import { db } from "../src/lib/db";

async function main() {
  const items = await db.content.findMany({
    where: { isActive: true, posterUrl: null },
    select: { id: true, providerSlug: true },
  });
  for (const item of items) {
    const poster = `/provider-logos/${item.providerSlug}.jpg`;
    await db.content.update({
      where: { id: item.id },
      data: { posterUrl: poster, thumbnailUrl: poster },
    });
  }
  console.log(JSON.stringify({ updated: items.length }));
}

main().finally(() => db.$disconnect());
