export const COMPLETION_THRESHOLD = 0.9;

export function isProgressCompleted(positionSeconds: number, durationSeconds: number) {
  if (!durationSeconds) return false;
  return positionSeconds / durationSeconds >= COMPLETION_THRESHOLD;
}

export function normalizeProgressPosition(positionSeconds: number, durationSeconds: number) {
  if (!durationSeconds) return Math.max(0, Math.floor(positionSeconds));
  return isProgressCompleted(positionSeconds, durationSeconds)
    ? Math.floor(durationSeconds)
    : Math.max(0, Math.min(Math.floor(positionSeconds), Math.floor(durationSeconds)));
}

export function latestProgressByContent<T extends { contentId: string; lastWatchedAt: Date | string }>(rows: T[]) {
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
    .filter(row => {
      if (seen.has(row.contentId)) return false;
      seen.add(row.contentId);
      return true;
    });
}
