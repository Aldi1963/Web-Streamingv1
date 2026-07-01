import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { auth } from "@/services/auth-service";

// GET: List user's watchlist
export async function GET() {
  try {
    const user = await auth.currentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const items = await db.watchlist.findMany({
      where: { userId },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
            posterUrl: true,
            providerName: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      items.map((item) => item.content)
    );
  } catch (e) {
    return apiError(e, { route: "watchlist" });
  }
}

// POST: Add to watchlist
export async function POST(request: Request) {
  try {
    const user = await auth.currentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const { contentId } = z
      .object({ contentId: z.string() })
      .parse(await request.json());

    await db.watchlist.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId },
      update: {},
    });

    return NextResponse.json({ message: "Ditambahkan ke watchlist." });
  } catch (e) {
    return apiError(e, { route: "watchlist-add" });
  }
}

// DELETE: Remove from watchlist
export async function DELETE(request: Request) {
  try {
    const user = await auth.currentUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const { contentId } = z
      .object({ contentId: z.string() })
      .parse(await request.json());

    await db.watchlist.deleteMany({
      where: { userId, contentId },
    });

    return NextResponse.json({ message: "Dihapus dari watchlist." });
  } catch (e) {
    return apiError(e, { route: "watchlist-remove" });
  }
}
