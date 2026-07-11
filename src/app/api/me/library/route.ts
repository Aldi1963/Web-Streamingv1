import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const type = request.nextUrl.searchParams.get("type") || "history";
  if (type === "favorites") {
    const rows = await db.favorite.findMany({ where: { userId: user.id }, include: { content: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(rows.map(row => row.content));
  }
  const rows = await db.watchProgress.findMany({
    where: { userId: user.id },
    include: {
      content: {
        select: {
          id: true,
          title: true,
          slug: true,
          posterUrl: true,
          type: true,
          providerName: true,
          episodes: { select: { id: true, episodeNumber: true } },
        },
      },
    },
    orderBy: { lastWatchedAt: "desc" },
    take: 100,
  });
  const latestByContent = rows.filter((row, index, list) =>
    list.findIndex(item => item.contentId === row.contentId) === index
  );
  return NextResponse.json(latestByContent);
}

export async function POST(request: Request) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { contentId } = z.object({ contentId: z.string().min(1) }).parse(await request.json());
  await db.favorite.upsert({ where: { userId_contentId: { userId: user.id, contentId } }, create: { userId: user.id, contentId }, update: {} });
  return NextResponse.json({ message: "Ditambahkan ke favorit." });
}

export async function DELETE(request: Request) {
  const user = await auth.currentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const input = z.object({ type: z.enum(["favorite", "progress", "history"]), id: z.string().optional() }).parse(await request.json());
  if (input.type === "favorite" && input.id) await db.favorite.deleteMany({ where: { userId: user.id, contentId: input.id } });
  if (input.type === "progress" && input.id) await db.watchProgress.deleteMany({ where: { userId: user.id, id: input.id } });
  if (input.type === "history") await db.watchProgress.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ message: "Data dihapus." });
}
