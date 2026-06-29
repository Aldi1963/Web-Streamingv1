import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";
import { normalizeProgressPosition } from "@/lib/watch-progress";

const input = z.object({
  contentId: z.string().min(1),
  episodeId: z.string().optional(),
  positionSeconds: z.number().int().min(0),
  durationSeconds: z.number().int().min(0),
});

export async function POST(request: Request) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const data = input.parse(await request.json());
  const existing = await db.watchProgress.findFirst({
    where: { userId: user.id, contentId: data.contentId, episodeId: data.episodeId ?? null },
    select: { id: true },
  });
  const positionSeconds = normalizeProgressPosition(data.positionSeconds, data.durationSeconds);
  const values = {
    episodeId: data.episodeId ?? null,
    positionSeconds,
    durationSeconds: data.durationSeconds,
    lastWatchedAt: new Date(),
  };

  if (existing) {
    await db.watchProgress.update({ where: { id: existing.id }, data: values });
  } else {
    await db.$transaction([
      db.watchProgress.create({
        data: { userId: user.id, contentId: data.contentId, ...values },
      }),
      db.content.update({
        where: { id: data.contentId },
        data: {
          viewCount: { increment: 1 },
          trendingScore: { increment: 1 },
          lastViewedAt: new Date(),
        },
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
