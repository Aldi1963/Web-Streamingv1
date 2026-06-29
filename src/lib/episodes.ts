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
  const rawCount =
    record.episode_count ??
    record.episodeCount ??
    record.total_episodes ??
    record.totalEpisodes ??
    record.synced_episode_count;
  const count = Math.min(1000, Math.max(0, Number(rawCount) || 0));

  return Array.from({ length: count }, (_, index) => ({
    id: `${contentId}-virtual-${index + 1}`,
    episodeNumber: index + 1,
    title: null,
    thumbnailUrl: null,
  }));
}
