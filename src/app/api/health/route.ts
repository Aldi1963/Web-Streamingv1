import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, unknown> = {};
  let healthy = true;

  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.db = { status: "ok", latency: Date.now() - dbStart };
  } catch {
    checks.db = { status: "down" };
    healthy = false;
  }

  const apiStart = Date.now();
  try {
    const response = await fetch(process.env.CLIPKU_API_BASE_URL ?? "https://api.clipku.com", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    checks.clipku_api = {
      status: response.ok ? "ok" : "degraded",
      latency: Date.now() - apiStart,
    };
    if (!response.ok) healthy = false;
  } catch {
    checks.clipku_api = { status: "down" };
    healthy = false;
  }

  try {
    const [ok, degraded, failed, stale] = await Promise.all([
      db.content.count({ where: { playbackStatus: "OK" } }),
      db.content.count({ where: { playbackStatus: "DEGRADED" } }),
      db.content.count({ where: { playbackStatus: "FAILED" } }),
      db.content.count({
        where: {
          isActive: true,
          OR: [
            { playbackCheckedAt: null },
            { playbackCheckedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
    ]);
    checks.playback = { status: failed > 0 ? "degraded" : "ok", ok, degraded, failed, stale };
  } catch {
    checks.playback = { status: "unknown" };
  }

  return NextResponse.json(
    { status: healthy ? "healthy" : "unhealthy", timestamp: new Date().toISOString(), checks },
    { status: healthy ? 200 : 503 },
  );
}
