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
