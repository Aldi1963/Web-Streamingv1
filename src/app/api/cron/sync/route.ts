import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { contentService } from "@/services/content-service";
import { apiError } from "@/lib/http";

export const maxDuration = 300;

async function authorized(request: Request) {
  const expected = await getSetting("CRON_SECRET");
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!await authorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const rows = await db.apiEndpoint.findMany({
      where: { isActive: true, providerType: { in: ["Short Drama", "Movie"] } },
      distinct: ["providerSlug"],
      select: { providerSlug: true },
      take: 20,
    });
    const providers = rows.map((row) => row.providerSlug);
    if (!providers.length) {
      return NextResponse.json({ message: "Tidak ada provider aktif." }, { status: 409 });
    }
    const results = await contentService.syncProviders(providers);
    return NextResponse.json({ ok: true, providers, results, finishedAt: new Date().toISOString() });
  } catch (error) {
    return apiError(error, { route: "cron-sync" });
  }
}
