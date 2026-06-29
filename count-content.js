const { PrismaClient } = require("@prisma/client");
(async () => {
  const d = new PrismaClient();
  const p = await d.content.groupBy({
    by: ["providerName", "type"],
    _count: true,
    where: { isActive: true }
  });
  console.log("=== CONTENT BY PROVIDER ===");
  p.sort((a, b) => b._count - a._count).forEach(x =>
    console.log(x.providerName.padEnd(25), x.type.padEnd(15), x._count)
  );
  const t = await d.content.count({ where: { isActive: true } });
  const e = await d.episode.count();
  console.log("\nTotal:", t, "dramas |", e, "episodes");
  await d.$disconnect();
})();
