import { NextResponse } from "next/server";
import { auth } from "@/services/auth-service";
import { db } from "@/lib/db";

function parseSyncErrors(message: string | null) {
  if (!message) return [];
  try {
    const parsed = JSON.parse(message) as { endpoints?: Array<{ endpoint?: string; error?: string }> };
    return (parsed.endpoints || [])
      .filter((endpoint) => endpoint.error)
      .map((endpoint) => `${endpoint.endpoint || "endpoint"}: ${endpoint.error}`);
  } catch {
    return [];
  }
}

export async function GET() {
  const user = await auth.currentUser();
  if (!user || !["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [contents, playbackIssues, endpoints, syncLogs] = await Promise.all([
    db.content.groupBy({
      by: ["providerSlug", "providerName"],
      _count: { _all: true },
      _sum: { viewCount: true },
      _max: { lastSyncedAt: true },
    }),
    db.content.groupBy({
      by: ["providerSlug", "playbackStatus"],
      where: { playbackStatus: { in: ["FAILED", "ERROR"] } },
      _count: { _all: true },
    }),
    db.apiEndpoint.groupBy({
      by: ["providerSlug", "isActive"],
      _count: { _all: true },
    }),
    db.apiSyncLog.findMany({
      take: 120,
      orderBy: { startedAt: "desc" },
      select: {
        providerName: true,
        status: true,
        totalData: true,
        successCount: true,
        failedCount: true,
        message: true,
        startedAt: true,
        finishedAt: true,
      },
    }),
  ]);

  const endpointMap = new Map<string, { active: number; inactive: number }>();
  endpoints.forEach((item) => {
    const current = endpointMap.get(item.providerSlug) || { active: 0, inactive: 0 };
    if (item.isActive) current.active += item._count._all;
    else current.inactive += item._count._all;
    endpointMap.set(item.providerSlug, current);
  });

  const issueMap = new Map<string, { failed: number; error: number }>();
  playbackIssues.forEach((item) => {
    const current = issueMap.get(item.providerSlug) || { failed: 0, error: 0 };
    if (item.playbackStatus === "ERROR") current.error += item._count._all;
    else current.failed += item._count._all;
    issueMap.set(item.providerSlug, current);
  });

  const latestSyncByName = new Map<string, (typeof syncLogs)[number]>();
  syncLogs.forEach((log) => {
    if (!latestSyncByName.has(log.providerName)) latestSyncByName.set(log.providerName, log);
  });

  return NextResponse.json(
    contents
      .map((item) => {
        const endpoint = endpointMap.get(item.providerSlug) || { active: 0, inactive: 0 };
        const issue = issueMap.get(item.providerSlug) || { failed: 0, error: 0 };
        const latestSync = latestSyncByName.get(item.providerName);
        return {
          slug: item.providerSlug,
          name: item.providerName,
          contents: item._count._all,
          views: item._sum.viewCount || 0,
          playbackFailed: issue.failed,
          playbackError: issue.error,
          playbackIssues: issue.failed + issue.error,
          endpointActive: endpoint.active,
          endpointInactive: endpoint.inactive,
          isSyncEnabled: endpoint.active > 0,
          lastSyncedAt: item._max.lastSyncedAt,
          latestSync: latestSync
            ? {
                status: latestSync.status,
                totalData: latestSync.totalData,
                successCount: latestSync.successCount,
                failedCount: latestSync.failedCount,
                startedAt: latestSync.startedAt,
                finishedAt: latestSync.finishedAt,
                errors: parseSyncErrors(latestSync.message),
              }
            : null,
        };
      })
      .sort((a, b) => b.contents - a.contents),
  );
}
