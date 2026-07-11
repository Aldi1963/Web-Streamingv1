import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "https://drama.clipku.com";
  const contents = await db.content.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 50_000,
  });
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/anime`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/plans`, changeFrequency: "monthly", priority: 0.5 },
    ...contents.map((content) => ({
      url: `${base}/drama/${content.slug}`,
      lastModified: content.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
