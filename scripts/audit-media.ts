import { db } from "../src/lib/db";

async function responds(url: string, expected: "image" | "subtitle") {
  const target = new URL(url, process.env.APP_URL || "http://127.0.0.1:3000");
  const response = await fetch(target, {
    headers: { Range: "bytes=0-2047" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  await response.body?.cancel();
  const type = (response.headers.get("content-type") ?? "").toLowerCase();
  return response.ok && (expected === "image"
    ? type.startsWith("image/")
    : type.includes("text") || type.includes("vtt") || type.includes("srt") || type.includes("octet-stream"));
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
    by: ["providerSlug"],
    where: { isActive: true },
    _count: { _all: true, posterUrl: true },
  });
  const failures: string[] = [];

  for (const provider of providers) {
    const posters = await db.content.findMany({
      where: { providerSlug: provider.providerSlug, isActive: true, posterUrl: { not: null } },
      select: { title: true, posterUrl: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    let valid = 0;
    for (const poster of posters) {
      try {
        if (poster.posterUrl && await responds(poster.posterUrl, "image")) valid++;
      } catch {
        // Reported in the provider summary below.
      }
    }
    const missing = provider._count._all - provider._count.posterUrl;
    const status = posters.length > 0 && valid === posters.length ? "OK" : "DEGRADED";
    console.log(JSON.stringify({ provider: provider.providerSlug, type: "poster", status, valid, sampled: posters.length, missing }));
    if (status !== "OK" || missing > 0) failures.push(`${provider.providerSlug}: poster ${valid}/${posters.length}, kosong ${missing}`);
  }

  const subtitles = await db.episode.findMany({
    where: { subtitleUrl: { not: null } },
    select: { id: true, subtitleUrl: true, content: { select: { providerSlug: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  for (const subtitle of subtitles) {
    try {
      if (!subtitle.subtitleUrl || !await responds(subtitle.subtitleUrl, "subtitle")) {
        failures.push(`${subtitle.content.providerSlug}: subtitle tidak merespons`);
      }
    } catch {
      failures.push(`${subtitle.content.providerSlug}: subtitle gagal diakses`);
    }
  }

  if (failures.length) await notify(`Clipku media audit\n${failures.slice(0, 20).join("\n")}`);
  console.log(JSON.stringify({ mediaAudit: failures.length ? "DEGRADED" : "OK", failures: failures.length }));
}

main()
  .catch(async error => {
    await notify(`Clipku media audit gagal: ${String(error)}`);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
