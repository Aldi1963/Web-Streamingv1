import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, unknown> = {};
  let healthy = true;
  let degraded = false;

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
    if (!response.ok) degraded = true;
  } catch {
    checks.clipku_api = { status: "down" };
    healthy = false;
  }

  try {
    const [ok, degradedCount, failed, stale] = await Promise.all([
      db.content.count({ where: { isActive: true, playbackStatus: "OK" } }),
      db.content.count({ where: { isActive: true, playbackStatus: "DEGRADED" } }),
      db.content.count({ where: { isActive: true, playbackStatus: "FAILED" } }),
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
    const playbackDegraded = failed > 0 || degradedCount > 0 || stale > 0;
    checks.playback = { status: playbackDegraded ? "degraded" : "ok", ok, degraded: degradedCount, failed, stale };
    if (playbackDegraded) degraded = true;
  } catch {
    checks.playback = { status: "unknown" };
    degraded = true;
  }

  const status = !healthy ? "unhealthy" : degraded ? "degraded" : "healthy";
  return NextResponse.json(
    { status, timestamp: new Date().toISOString(), checks },
    { status: healthy ? 200 : 503 },
  );
}
