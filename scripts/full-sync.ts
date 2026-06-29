import { db } from "../src/lib/db";
import { contentService } from "../src/services/content-service";

async function main() {
  const args = process.argv.slice(2);
  const full = !args.includes("--incremental");
  const requested = args.filter((arg) => !arg.startsWith("--"));
  const rows = await db.apiEndpoint.findMany({
    where: {
      isActive: true,
      providerType: { in: ["Short Drama", "Movie"] },
      ...(requested.length ? { providerSlug: { in: requested } } : {}),
    },
    distinct: ["providerSlug"],
    select: { providerSlug: true },
    orderBy: { providerSlug: "asc" },
  });
  const providers = rows.map((row) => row.providerSlug);
  if (!providers.length) throw new Error("Tidak ada provider katalog yang ditemukan.");
  console.log(`${full ? "Full" : "Incremental"} sync ${providers.length} provider: ${providers.join(", ")}`);
  const results = await contentService.syncProviders(providers, { full });
  console.table(results.map((result) => ({
    provider: result.provider,
    total: result.total,
    inserted: "inserted" in result ? result.inserted : 0,
    updated: "updated" in result ? result.updated : 0,
    failed: result.failed,
  })));
  if (results.some((result) => result.failed > 0)) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
