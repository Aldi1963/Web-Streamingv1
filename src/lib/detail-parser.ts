import { contentText, type RemoteContent } from "@/lib/catalog-crawler";

export type ParsedEpisode = {
  id: string;
  number: number;
  title?: string;
  thumbnail?: string;
  videoUrl?: string;
  hlsUrl?: string;
  raw: RemoteContent;
};

function object(value: unknown): RemoteContent | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RemoteContent : undefined;
}

export function detailData(value: unknown): RemoteContent {
  const root = object(value) ?? {};
  return object(root.data) ?? root;
}

export function parseEpisodes(value: unknown): ParsedEpisode[] {
  const data = detailData(value);
  const info = object(data.info);
  const candidates = [
    data.video_list, data.episode_list, data.episodes, data.chapterList,
    info?.episode_list, info?.video_list, info?.episodes,
  ].find(Array.isArray) as unknown[] | undefined;
  if (!candidates) return [];
  return candidates.flatMap((value, index) => {
    const item = object(value);
    if (!item) return [];
    const id = contentText(item, "episode_id", "video_id", "chapter_id", "chapterId", "resourceId", "id") ?? String(index + 1);
    const rawNumber = contentText(item, "episode", "ep", "episode_no", "index", "serialNumber", "episodeNumber", "chapterIndex", "num", "seq_id", "se");
    let number = Number(rawNumber);
    if (!Number.isFinite(number)) number = index + 1;
    if (number <= 0) number = index + 1;
    const media = contentText(item, "hls_url", "play_url", "video_url", "url", "resourceLink");
    return [{
      id, number,
      title: contentText(item, "title", "name"),
      thumbnail: contentText(item, "cover", "thumbnail", "thumb_url"),
      hlsUrl: media?.includes(".m3u8") ? media : undefined,
      videoUrl: media && !media.includes(".m3u8") ? media : undefined,
      raw: item,
    }];
  });
}
