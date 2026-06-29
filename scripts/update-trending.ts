import { db } from "../src/lib/db";

async function main() {
  await db.$executeRaw`
    UPDATE Content
    SET trendingScore =
      (viewCount * EXP(-GREATEST(TIMESTAMPDIFF(HOUR, COALESCE(lastViewedAt, createdAt), NOW()), 0) / 168))
      + (COALESCE(rating, 0) * 2)
  `;
}

main()
  .finally(() => db.$disconnect());
