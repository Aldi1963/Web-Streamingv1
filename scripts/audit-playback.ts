import http from "node:http";
import https from "node:https";
import { db } from "../src/lib/db";
import { extractStreamUrl, selectEpisodePayload } from "../src/lib/stream-utils";
import { clipku } from "../src/services/clipku-api-service";

const v2Providers = new Set(["melolo", "dramawave", "reelshort", "netshort", "shortmax"]);
const PROVIDER_SAMPLE_LIMIT = 5;

async function resolve(provider: string, contentId: string, episode: number) {
  let raw: unknown = null;
  if (v2Providers.has(provider)) {
    try {
      raw = await clipku.getStreamV2(provider, contentId, episode);
    } catch {
      raw = null;
    }
  }
  if (!extractStreamUrl(raw)) raw = await clipku.getStream(provider, contentId, episode);
  return extractStreamUrl(selectEpisodePayload(raw, provider, episode));
}

async function mediaResponds(url: string, redirects = 0): Promise<boolean> {
  const target = new URL(url);
  const client = target.protocol === "https:" ? https : http;
  const allowInvalidCertificate = target.hostname === "awscdn.netshort.com";

  return new Promise((resolve, reject) => {
    const request = client.get(target, {
      headers: { Range: "bytes=0-1023" },
      rejectUnauthorized: !allowInvalidCertificate,
      timeout: 20_000,
    }, (response) => {
      const location = response.headers.location;
      if (location && response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
        response.resume();
        if (redirects >= 3) {
          resolve(false);
          return;
        }
        mediaResponds(new URL(location, target).toString(), redirects + 1).then(resolve, reject);
        return;
      }

      const contentType = (response.headers["content-type"] ?? "").toLowerCase();
      const statusOk = Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300);
      response.destroy();
      resolve(statusOk && (
        contentType.includes("video")
        || contentType.includes("mpegurl")
        || contentType.includes("octet-stream")
      ));
    });
    request.on("timeout", () => request.destroy(new Error("Media request timed out")));
    request.on("error", reject);
  });
}

async function notify(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined);
}

async function main() {
  const providers = await db.content.groupBy({
    by: ["providerSlug", "providerName"],
    where: { isActive: true },
  });
  const results: Array<{ provider: string; status: string; detail?: string }> = [];

  for (const provider of providers) {
    const samples = await db.content.findMany({
      where: { providerSlug: provider.providerSlug, isActive: true },
      orderBy: [{ playbackCheckedAt: "asc" }, { lastSyncedAt: "desc" }],
      take: PROVIDER_SAMPLE_LIMIT,
      select: { id: true, title: true, clipkuContentId: true },
    });
    if (!samples.length) continue;

    let status = "FAILED";
    let detail: string | undefined;
    try {
      const sampleResults: Array<{ id: string; title: string; status: string; detail: string }> = [];

      for (const content of samples) {
        const first = await resolve(provider.providerSlug, content.clipkuContentId, 1);
        const second = await resolve(provider.providerSlug, content.clipkuContentId, 2);
        const firstOk = Boolean(first && await mediaResponds(first));
        const secondOk = Boolean(second && await mediaResponds(second));
        const isHealthy = firstOk && secondOk && first !== second;
        sampleResults.push({
          id: content.id,
          title: content.title,
          status: isHealthy ? "OK" : firstOk ? "DEGRADED" : "FAILED",
          detail: `ep1=${firstOk} ep2=${secondOk} unique=${first !== second}`,
        });
      }

      const best = sampleResults.find((item) => item.status === "OK")
        ?? sampleResults.find((item) => item.status === "DEGRADED")
        ?? sampleResults[0];
      status = best.status;
      detail = `${best.title}: ${best.detail}`;

      await db.content.updateMany({
        where: { id: { in: sampleResults.map((item) => item.id) } },
        data: { playbackCheckedAt: new Date() },
      });

      if (best.status !== "OK") {
        const failedTitles = sampleResults.map((item) => `${item.title}=${item.status}`).join(", ");
        detail = `${detail}; samples=${failedTitles}`;
      }
    } catch (error) {
      detail = error instanceof Error ? error.message : String(error);
    }

    await db.content.updateMany({
      where: { providerSlug: provider.providerSlug, isActive: true },
      data: { playbackStatus: status, playbackCheckedAt: new Date() },
    });
    results.push({ provider: provider.providerSlug, status, detail });
    console.log(JSON.stringify({ provider: provider.providerSlug, status, detail, sampled: samples.length }));
  }

  const failed = results.filter((item) => item.status !== "OK");
  if (failed.length) {
    await notify(`Clipku playback alert\n${failed.map((item) => `${item.provider}: ${item.status} (${item.detail})`).join("\n")}`);
  }
}

main()
  .catch(async (error) => {
    await notify(`Clipku playback audit gagal: ${String(error)}`);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
