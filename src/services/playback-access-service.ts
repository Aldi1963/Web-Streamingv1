import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const FREE_EPISODE_LIMIT = 8;

export function requiresSubscription(episode: number) {
  return Math.max(1, Math.floor(episode)) > FREE_EPISODE_LIMIT;
}

export function activeSubscriptionWhere(userId: string, now = new Date()): Prisma.SubscriptionWhereInput {
  return {
    userId,
    startsAt: { lte: now },
    OR: [
      { status: { in: ["ACTIVE", "TRIAL"] }, expiresAt: { gt: now } },
      { status: "GRACE", graceEndsAt: { gt: now } },
    ],
  };
}

export async function playbackAccess(userId: string, episode: number) {
  const normalizedEpisode = Math.max(1, Math.floor(episode));
  if (!requiresSubscription(normalizedEpisode)) {
    return { allowed: true as const, tier: "FREE" as const, episode: normalizedEpisode, expiresAt: null };
  }
  const now = new Date();
  const subscription = await db.subscription.findFirst({
    where: activeSubscriptionWhere(userId, now),
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
