import { db } from "@/lib/db";

export const FREE_EPISODE_LIMIT = 8;

export function requiresSubscription(episode: number) {
  return Math.max(1, Math.floor(episode)) > FREE_EPISODE_LIMIT;
}

export async function playbackAccess(userId: string, episode: number) {
  const normalizedEpisode = Math.max(1, Math.floor(episode));
  if (!requiresSubscription(normalizedEpisode)) {
    return { allowed: true as const, tier: "FREE" as const, episode: normalizedEpisode, expiresAt: null };
  }
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIAL", "GRACE"] },
      startsAt: { lte: new Date() },
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true, plan: { select: { name: true } } },
  });
  if (!subscription) {
    return {
      allowed: false as const,
      tier: "LOCKED" as const,
      episode: normalizedEpisode,
      freeEpisodeLimit: FREE_EPISODE_LIMIT,
      expiresAt: null,
    };
  }
  return {
    allowed: true as const,
    tier: "SUBSCRIBER" as const,
    episode: normalizedEpisode,
    expiresAt: subscription.expiresAt,
    planName: subscription.plan.name,
  };
}
