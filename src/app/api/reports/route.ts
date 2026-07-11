import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const body = await request.json() as { contentId?: string; episode?: number; reason?: string };
  if (!body.contentId || !String(body.reason ?? "").trim()) {
    return NextResponse.json({ message: "Alasan laporan wajib diisi." }, { status: 400 });
  }
  const episodeNumber = Number.isFinite(Number(body.episode)) ? Number(body.episode) : undefined;
  const episode = episodeNumber
    ? await db.episode.findFirst({
        where: { contentId: body.contentId, episodeNumber },
        select: { id: true },
      })
    : null;
  await db.playbackReport.create({
    data: {
      userId: user.id,
      contentId: body.contentId,
      episodeId: episode?.id,
      category: "VIDEO_ERROR",
      detail: String(body.reason).trim().slice(0, 1000),
    },
  });
  return NextResponse.json({ message: "Laporan video dikirim." });
}
