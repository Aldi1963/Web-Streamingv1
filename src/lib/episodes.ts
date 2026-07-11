type StoredEpisode = {
  id: string;
  episodeNumber: number;
  title: string | null;
  thumbnailUrl: string | null;
};

export function episodesWithFallback(
  stored: StoredEpisode[],
  raw: unknown,
  contentId: string,
): StoredEpisode[] {
  if (stored.length) return stored;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  const record = raw as Record<string, unknown>;
  const data = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : {};
  const book = data.book && typeof data.book === "object" && !Array.isArray(data.book)
    ? data.book as Record<string, unknown>
    : {};
  const rawCount = [
    record.episode_count,
    record.episodeCount,
    record.chapterCount,
    record.chapter_count,
    record.total_episodes,
    record.total_episode,
    record.totalEpisodes,
    record.synced_episode_count,
    data.episode_count,
    data.episodeCount,
    data.chapterCount,
    data.chapter_count,
    data.total_episodes,
    data.total_episode,
    data.totalEpisodes,
    book.chapterCount,
    book.chapter_count,
    book.total_episodes,
    book.total_episode,
  ].find((value) => Number(value) > 0);
  const rawEpisodes = Array.isArray(record.episodes)
    ? record.episodes
    : Array.isArray(data.episodes)
      ? data.episodes
      : Array.isArray(data.list)
        ? data.list
        : [];
  const count = Math.min(1000, Math.max(0, Number(rawCount) || rawEpisodes.length || 0));

  return Array.from({ length: count }, (_, index) => ({
    id: `${contentId}-virtual-${index + 1}`,
    episodeNumber: Number(
      (rawEpisodes[index] as Record<string, unknown> | undefined)?.episode ??
      (rawEpisodes[index] as Record<string, unknown> | undefined)?.episodeNumber ??
      (rawEpisodes[index] as Record<string, unknown> | undefined)?.chapterName ??
      (rawEpisodes[index] as Record<string, unknown> | undefined)?.index,
    ) || index + 1,
    title: typeof (rawEpisodes[index] as Record<string, unknown> | undefined)?.title === "string"
      ? String((rawEpisodes[index] as Record<string, unknown>).title)
      : typeof (rawEpisodes[index] as Record<string, unknown> | undefined)?.chapterName === "string"
        ? String((rawEpisodes[index] as Record<string, unknown>).chapterName)
      : null,
    thumbnailUrl: typeof (rawEpisodes[index] as Record<string, unknown> | undefined)?.thumbnailUrl === "string"
      ? String((rawEpisodes[index] as Record<string, unknown>).thumbnailUrl)
      : null,
  }));
}
