import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await auth.currentUser();
  if (!user || !["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"].includes(user.role)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const since = new Date(Date.now() - 86_400_000);
  const started = Date.now();
  let database = { status: "ok", latencyMs: 0 };
  try { await db.$queryRaw`SELECT 1`; database.latencyMs = Date.now() - started; } catch { database = { status: "down", latencyMs: Date.now() - started }; }
  const [totalRequests, failedRequests, openReports, failedPlaybackActive, failedPlaybackInactive, stalePlayback, recentErrors, providerGroups, playbackIssuesByProvider] = await Promise.all([
    db.apiLog.count({ where: { createdAt: { gte: since } } }),
    db.apiLog.count({ where: { createdAt: { gte: since }, OR: [{ errorMessage: { not: null } }, { responseStatus: { gte: 400 } }] } }),
    db.playbackReport.count({ where: { status: "OPEN" } }),
    db.content.count({ where: { isActive: true, playbackStatus: "FAILED" } }),
    db.content.count({ where: { isActive: false, playbackStatus: "FAILED" } }),
    db.content.count({ where: { isActive: true, OR: [{ playbackCheckedAt: null }, { playbackCheckedAt: { lt: since } }] } }),
    db.apiLog.findMany({ where: { OR: [{ errorMessage: { not: null } }, { responseStatus: { gte: 400 } }] }, orderBy: { createdAt: "desc" }, take: 30,
      select: { id: true, providerName: true, method: true, url: true, responseStatus: true, responseTime: true, errorMessage: true, createdAt: true } }),
    db.apiLog.groupBy({ by: ["providerName"], where: { createdAt: { gte: since } }, _count: { _all: true }, _avg: { responseTime: true } }),
    db.content.groupBy({
      by: ["providerSlug", "providerName", "isActive", "playbackStatus"],
      where: { playbackStatus: { in: ["FAILED", "DEGRADED"] } },
      _count: { _all: true },
      orderBy: { _count: { providerSlug: "desc" } },
    }),
  ]);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    system: { database, uptimeSeconds: Math.round(process.uptime()), memoryMb: Math.round(process.memoryUsage().rss / 1_048_576) },
    stats: {
      totalRequests,
      failedRequests,
      successRate: totalRequests ? Math.round(((totalRequests-failedRequests)/totalRequests)*1000)/10 : 100,
      openReports,
      failedPlayback: failedPlaybackActive,
      failedPlaybackActive,
      failedPlaybackInactive,
      stalePlayback,
    },
    providers: providerGroups.map(row => ({ name: row.providerName, requests: row._count._all, averageMs: Math.round(row._avg.responseTime || 0) })),
    playbackIssues: playbackIssuesByProvider.map(row => ({
      providerSlug: row.providerSlug,
      providerName: row.providerName,
      active: row.isActive,
      status: row.playbackStatus,
      count: row._count._all,
    })),
    recentErrors,
  });
}
