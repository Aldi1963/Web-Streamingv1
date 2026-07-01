import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { clipku } from "@/services/clipku-api-service";
import { ArrowLeft, LockKeyhole, RotateCcw } from "lucide-react";
import { WatchPlayer } from "@/components/watch-player";
import { EpisodePopup } from "@/components/episode-popup";
import { episodesWithFallback } from "@/lib/episodes";
import { WatchTools } from "@/components/watch-tools";
import { playbackAccess, FREE_EPISODE_LIMIT } from "@/services/playback-access-service";

export const dynamic = "force-dynamic";

const PROXY_VIDEO_PROVIDERS = new Set(["dramabox", "netshort", "moviebox"]);

export default async function Watch({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const user = await auth.currentUser();
  if (!user) redirect("/login?redirect=/watch/" + (await params).id);

  const { id } = await params;
  const epNum = Math.max(1, parseInt((await searchParams).ep ?? "1"));
  const content = await db.content.findUnique({
    where: { id },
    include: { episodes: { orderBy: { episodeNumber: "asc" } } },
  });
  if (!content) return <main className="shell"><h1>Konten tidak ditemukan</h1></main>;
  const access = await playbackAccess(user.id, epNum);
  if (!access.allowed) return <main className="watch-fullscreen">
    <div className="watch-topbar"><Link href={`/drama/${content.slug}`} className="btn btn-ghost btn-sm"><ArrowLeft size={18}/> Kembali</Link><span className="watch-title">{content.title}</span></div>
    <section className="watch-paywall panel">
      <span className="watch-paywall-icon"><LockKeyhole size={34}/></span>
      <p className="eyebrow">Episode premium</p>
      <h1>Lanjutkan menonton episode {epNum}</h1>
      <p>Episode 1–{FREE_EPISODE_LIMIT} gratis untuk semua akun. Aktifkan paket untuk membuka seluruh episode selama masa paket berlaku.</p>
      <Link href="/plans" className="btn">Lihat paket akses</Link>
    </section>
  </main>;
  const preference = await db.userPreference.findUnique({ where: { userId: user.id } }).catch(() => null);
  const episodes = episodesWithFallback(content.episodes, content.apiRawResponse, content.id);
  const currentIndex = episodes.findIndex(ep => ep.episodeNumber === epNum);
  const currentEpisode = currentIndex >= 0 ? episodes[currentIndex] : undefined;
  const currentStoredEpisode = content.episodes.find(ep => ep.episodeNumber === epNum);
  const previousEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : undefined;
  const nextEpisode = currentIndex >= 0 ? episodes[currentIndex + 1] : undefined;
  const progressRows = await db.watchProgress.findMany({
    where: { userId: user.id, contentId: content.id },
    select: {
      episodeId: true,
      positionSeconds: true,
      durationSeconds: true,
      lastWatchedAt: true,
    },
    orderBy: { lastWatchedAt: "desc" },
  }).catch(() => []);
  const progress = currentEpisode
    ? progressRows.find(row => row.episodeId === currentEpisode.id) ?? null
    : null;
  const resumeAtSeconds =
    progress && progress.durationSeconds > 0 && progress.positionSeconds / progress.durationSeconds < 0.9
      ? progress.positionSeconds
      : 0;
  const watchedEpisodeNumbers = progressRows
    .filter(row => row.durationSeconds > 0 && row.positionSeconds / row.durationSeconds >= 0.9)
    .map(row => row.episodeId ? episodes.find(ep => ep.id === row.episodeId)?.episodeNumber : undefined)
    .filter((value): value is number => typeof value === "number");
  const fallbackItems = content.providerSlug === "dramabox"
    ? await db.content.findMany({
        where: {
          isActive: true,
          providerSlug: { not: "dramabox" },
          title: { contains: content.title.replace(/\s*\([^)]*\)\s*/g, "").split(" ").slice(0, 3).join(" ") },
        },
        take: 4,
      }).catch(() => [])
    : [];

  let streamUrl: string | null = null;
  let streamError: string | null = null;
  let streamOptions: Array<{ label: string; url: string }> = [];
  if (PROXY_VIDEO_PROVIDERS.has(content.providerSlug)) {
    streamUrl = `/api/video-proxy?provider=${encodeURIComponent(content.providerSlug)}&contentId=${encodeURIComponent(content.clipkuContentId)}&ep=${epNum}`;
    streamOptions = [{ label: "Otomatis", url: streamUrl }];
  } else try {
    const v2Providers = new Set(["melolo", "dramawave", "reelshort", "netshort", "shortmax"]);
    let raw: unknown = null;
    if (v2Providers.has(content.providerSlug)) {
      try {
        raw = await clipku.getStreamV2(content.providerSlug, content.clipkuContentId, epNum);
      } catch {
        raw = null;
      }
    }
    if (!raw || !extractStreamUrl(raw)) {
      raw = await clipku.getStream(content.providerSlug, content.clipkuContentId, epNum);
    }
    const episodePayload = selectEpisodePayload(raw, content.providerSlug, epNum);
    streamUrl = extractStreamUrl(episodePayload);
    streamOptions = collectStreamOptions(episodePayload);
    if (!streamUrl) streamError = "URL stream tidak tersedia.";
  } catch {
    streamError = "Gagal mengambil URL stream. Coba lagi nanti.";
  }

  // Some providers return every episode in one response. Select the requested
  // item before extracting a media URL, otherwise the first episode always wins.
  function selectEpisodePayload(raw: unknown, provider: string, episode: number): unknown {
    if (!raw || typeof raw !== "object") return raw;
    const record = raw as Record<string, unknown>;
    if (provider === "goodshort") {
      const data = record.data;
      if (data && typeof data === "object") {
        const list = (data as Record<string, unknown>).downloadList;
        if (Array.isArray(list)) return list[episode - 1] ?? null;
      }
    }
    return raw;
  }

  // Deep URL extractor: finds first .m3u8/.mp4 URL in nested JSON
  function isMediaUrl(value: string) {
    return /\.(m3u8|mp4)(?:[?&]|$)/i.test(value) || /\/proxy\/m3u8(?:\?|$)/i.test(value);
  }

  function extractStreamUrl(obj: unknown, depth = 0): string | null {
    if (depth > 10 || !obj) return null;
    if (typeof obj === "string") {
      if (isMediaUrl(obj)) return obj;
      return null;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = extractStreamUrl(item, depth + 1);
        if (found) return found;
      }
    } else if (typeof obj === "object") {
      // Try known field names first
      const known = ["play_url", "url", "stream_url", "hls_url", "filePath", "video_url", "source"];
      for (const key of known) {
        const val = (obj as Record<string, unknown>)[key];
        if (typeof val === "string" && /^https?:\/\//i.test(val)) return val;
      }
      // Recursively search other fields
      for (const val of Object.values(obj as Record<string, unknown>)) {
        const found = extractStreamUrl(val, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  function collectStreamOptions(obj: unknown, found: Array<{ label: string; url: string }> = [], depth = 0) {
    if (!obj || depth > 10) return found;
    if (Array.isArray(obj)) obj.forEach(value => collectStreamOptions(value, found, depth + 1));
    else if (typeof obj === "object") {
      const row = obj as Record<string, unknown>;
      const url = ["videoPath", "url", "video_url", "play_url", "hls_url"].map(key => row[key]).find(value => typeof value === "string" && isMediaUrl(value)) as string | undefined;
      if (url && !found.some(item => item.url === url)) {
        const quality = row.quality ?? row.resolution ?? row.label;
        found.push({ label: quality ? `${quality}p`.replace("pp", "p") : `Sumber ${found.length + 1}`, url });
      }
      Object.values(row).forEach(value => collectStreamOptions(value, found, depth + 1));
    }
    return found;
  }

  return (
    <main className="watch-fullscreen">
      {/* Top overlay bar */}
      <div className="watch-topbar">
        <Link href={`/drama/${content.slug}`} className="btn btn-ghost btn-sm" prefetch={false}>
          <ArrowLeft size={18} /> Kembali
        </Link>
        <span className="watch-title">{content.title}</span>
        <span style={{ flex: 1 }} />

        <EpisodePopup contentId={content.id} episodes={episodes} currentEpisode={epNum} watchedEpisodeNumbers={watchedEpisodeNumbers} />
      </div>

      {streamError && (
        <div className="watch-error">
          <p>{streamError}</p>
          <Link href={`/watch/${content.id}?ep=${epNum}`} className="btn btn-ghost btn-sm">
            <RotateCcw size={16} /> Coba lagi
          </Link>
          <Link href={`/drama/${content.slug}`} className="btn" style={{ marginTop: 12 }} prefetch={false}>
            Kembali ke Detail
          </Link>
          {fallbackItems.length > 0 && <div><p>Versi dari platform lain:</p>{fallbackItems.map(item => <Link key={item.id} href={`/watch/${item.id}`} className="btn btn-ghost btn-sm">{item.providerName}</Link>)}</div>}
        </div>
      )}

      {streamUrl && (
        <WatchPlayer
          src={streamUrl}
          sources={streamOptions.length ? streamOptions : [{ label: "Otomatis", url: streamUrl }]}
          subtitle={currentStoredEpisode?.subtitleUrl ?? content.subtitleUrl ?? undefined}
          poster={content.posterUrl ?? undefined}
          contentId={content.id}
          episodeId={content.episodes.length ? currentEpisode?.id : undefined}
          previousHref={previousEpisode ? `/watch/${content.id}?ep=${previousEpisode.episodeNumber}` : undefined}
          nextHref={nextEpisode ? `/watch/${content.id}?ep=${nextEpisode.episodeNumber}` : undefined}
          resumeAtSeconds={resumeAtSeconds}
          autoplay={preference?.autoplay ?? true}
          defaultMuted={preference?.defaultMuted ?? false}
          playbackSpeed={preference?.playbackSpeed ?? 1}
          preferredQuality={preference?.preferredQuality ?? "auto"}
        />
      )}

      {!streamUrl && !streamError && (
        <div className="watch-loading">
          <div className="spinner" />
          <p>Memutar video...</p>
        </div>
      )}
      <WatchTools contentId={content.id} episode={epNum} />
    </main>
  );
}
