import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);

async function getUserId(): Promise<string | null> {
  try {
    const token = (await cookies()).get("clipku_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch {
    return null;
  }
}

// GET: List user's watchlist
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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
    const userId = await getUserId();
    if (!userId)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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
    const userId = await getUserId();
    if (!userId)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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
