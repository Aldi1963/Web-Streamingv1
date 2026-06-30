import { db } from "../src/lib/db";

async function main() {
  const items = await db.content.findMany({
    where: {
      isActive: true,
      OR: [
        { posterUrl: { contains: ".heic" } },
        { posterUrl: { contains: "awscover.netshort.com" } },
      ],
    },
    select: { id: true, posterUrl: true },
  });
  let updated = 0;
  for (const item of items) {
    if (!item.posterUrl || item.posterUrl.startsWith("https://wsrv.nl/")) continue;
    const target = new URL(item.posterUrl);
    if (!target.pathname.toLowerCase().endsWith(".heic") && target.hostname !== "awscover.netshort.com") continue;
    const poster = `https://wsrv.nl/?url=${encodeURIComponent(item.posterUrl)}&output=webp&w=570`;
    await db.content.update({
      where: { id: item.id },
      data: { posterUrl: poster, thumbnailUrl: poster },
    });
    updated++;
  }
  console.log(JSON.stringify({ scanned: items.length, updated }));
}

main().finally(() => db.$disconnect());
