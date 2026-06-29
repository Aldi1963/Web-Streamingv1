import { db } from "../src/lib/db";
import { clipku } from "../src/services/clipku-api-service";
import { contentText } from "../src/lib/catalog-crawler";
import { detailData, parseEpisodes } from "../src/lib/detail-parser";
import { extractStreamUrl } from "../src/lib/stream-utils";
import type { Prisma } from "@prisma/client";

const BATCH = Math.min(200, Math.max(1, Number(process.env.ENRICH_BATCH || 50)));

async function main() {
  const providers = await db.content.groupBy({
    by: ["providerSlug"],
    where: { isActive: true },
  });
  const quota = Math.max(1, Math.ceil(BATCH / Math.max(1, providers.length)));
  const picked: Awaited<ReturnType<typeof db.content.findMany>> = [];
  for (const provider of providers.sort((a, b) => a.providerSlug.localeCompare(b.providerSlug))) {
    if (picked.length >= BATCH) break;
    const remaining = BATCH - picked.length;
    const items = await db.content.findMany({
      where: { isActive: true, providerSlug: provider.providerSlug },
      orderBy: [{ detailSyncedAt: "asc" }, { lastSyncedAt: "desc" }],
      take: Math.min(quota, remaining),
    });
    picked.push(...items);
  }
  const contents = picked.slice(0, BATCH);
  for (const content of contents) {
    const endpoint = await db.apiEndpoint.findFirst({
      where: { providerSlug: content.providerSlug, endpointName: { in: ["detail", "info"] }, isActive: true },
    });
    if (!endpoint) continue;
    const supported = Array.isArray(endpoint.queryParamsJson) ? endpoint.queryParamsJson as string[] : [];
    const key = ["id", "bookId", "subjectId", "drama_id"].find((name) => supported.includes(name)) ?? supported[0];
    if (!key) continue;
    const params: Record<string, string | number> = { [key]: content.clipkuContentId };
    if (supported.includes("lang")) params.lang = content.providerSlug === "dramabox" ? "in" : "id";
    if (supported.includes("episode_limit")) params.episode_limit = 200;
    if (supported.includes("count")) params.count = 200;
    try {
      const raw = await clipku.request(endpoint.path, params, endpoint.id);
      const data = detailData(raw);
      const episodeSource = content.providerSlug === "moviebox"
        ? await (async () => {
          const subjectType = Number(data.subjectType ?? 0);
          const path = subjectType === 1 ? "/moviebox/download-movie" : "/moviebox/download-series";
          const downloadParams: Record<string, string | number> = { subjectId: content.clipkuContentId, resolution: 720 };
          if (path.endsWith("series")) downloadParams.se = 1;
          try {
            return await clipku.request(path, downloadParams);
          } catch {
            return raw;
          }
        })()
        : raw;
      const episodes = parseEpisodes(episodeSource);
      await db.$transaction([
        db.content.update({
          where: { id: content.id },
          data: {
            description: contentText(data, "description", "introduction", "desc") || content.description,
            genre: Array.isArray(data.tags) ? data.tags as Prisma.InputJsonValue : undefined,
            language: contentText(data, "language", "lang") || content.language,
            detailSyncedAt: new Date(),
            apiRawResponse: raw as Prisma.InputJsonValue,
          },
        }),
        ...episodes.map((episode) => db.episode.upsert({
          where: { contentId_clipkuEpisodeId: { contentId: content.id, clipkuEpisodeId: episode.id } },
          create: {
            contentId: content.id, providerName: content.providerName,
            clipkuEpisodeId: episode.id, episodeNumber: episode.number,
            title: episode.title, thumbnailUrl: episode.thumbnail,
            videoUrl: episode.videoUrl, hlsUrl: episode.hlsUrl, apiRawResponse: episode.raw as Prisma.InputJsonValue,
          },
          update: {
            episodeNumber: episode.number, title: episode.title,
            thumbnailUrl: episode.thumbnail, videoUrl: episode.videoUrl,
            hlsUrl: episode.hlsUrl, apiRawResponse: episode.raw as Prisma.InputJsonValue,
          },
        })),
      ]);
      let playbackStatus = episodes.some((episode) => episode.hlsUrl || episode.videoUrl) ? "PLAYABLE" : "UNCHECKED";
      if (playbackStatus === "UNCHECKED") {
        try {
          const stream = await clipku.getStream(content.providerSlug, content.clipkuContentId, 1);
          playbackStatus = extractStreamUrl(stream) ? "PLAYABLE" : "UNAVAILABLE";
        } catch { playbackStatus = "ERROR"; }
      }
      await db.content.update({ where: { id: content.id }, data: { playbackStatus, playbackCheckedAt: new Date() } });
      console.log(content.providerSlug, content.title, episodes.length, playbackStatus);
    } catch (error) {
      await db.content.update({ where: { id: content.id }, data: { detailSyncedAt: new Date(), playbackStatus: "ERROR", playbackCheckedAt: new Date() } });
      console.error(content.providerSlug, content.id, String(error));
    }
  }
}

main().finally(() => db.$disconnect());
