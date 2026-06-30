import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const input = z.object({
    contentId: z.string().min(1),
    episodeId: z.string().optional(),
    category: z.enum(["VIDEO_ERROR", "AUDIO", "SUBTITLE", "WRONG_EPISODE", "OTHER"]),
    detail: z.string().trim().max(1000).optional(),
  }).parse(await request.json());
  const duplicate = await db.playbackReport.findFirst({
    where: { userId: user.id, contentId: input.contentId, episodeId: input.episodeId, status: "OPEN", createdAt: { gt: new Date(Date.now() - 3_600_000) } },
  });
  if (duplicate) return NextResponse.json({ message: "Laporan serupa sudah diterima." }, { status: 409 });
  await db.playbackReport.create({ data: { userId: user.id, ...input } });
  return NextResponse.json({ message: "Laporan diterima. Tim akan memeriksa stream." });
}
