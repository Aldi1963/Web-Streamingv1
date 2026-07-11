import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { clipku } from "@/services/clipku-api-service";
import { ArrowLeft, Lock, RotateCcw, Sparkles } from "lucide-react";
import { WatchPlayer } from "@/components/watch-player";
import { WatchBackButton } from "@/components/watch-back-button";
import { WatchlistButton } from "@/components/watchlist-button";
import { episodesWithFallback } from "@/lib/episodes";
import { extractStreamUrl, extractSubtitleUrl, proxyMediaUrl, selectEpisodePayload } from "@/lib/stream-utils";
import { playbackAccess } from "@/services/playback-access-service";

export const dynamic = "force-dynamic";

const PROXY_VIDEO_PROVIDERS = new Set(["dramabox"]);
const FREE_EPISODE_LIMIT = 8;

export default async function Watch({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const { id } = await params;
  const epNum = Math.max(1, parseInt((await searchParams).ep ?? "1"));
  const user = await auth.currentUser();
  const content = await db.content.findUnique({
    where: { id },
    include: { episodes: { orderBy: { episodeNumber: "asc" } } },
  });
  if (!content) return <main className="shell"><h1>Konten tidak ditemukan</h1></main>;
  const requiresSubscription = epNum > FREE_EPISODE_LIMIT;
  if (!user && requiresSubscription) {
    redirect(`/login?redirect=${encodeURIComponent(`/watch/${id}?ep=${epNum}`)}`);
  }
  const activeSubscription = user && requiresSubscription
    ? await playbackAccess(user.id, epNum).catch(() => null)
    : null;
  const preference = user ? await db.userPreference.findUnique({ where: { userId: user.id } }).catch(() => null) : null;
  const saved = user ? await db.watchlist.findUnique({
    where: { userId_contentId: { userId: user.id, contentId: content.id } },
    select: { contentId: true },
  }).catch(() => null) : null;
  const episodes = episodesWithFallback(content.episodes, content.apiRawResponse, content.id);
  const currentIndex = episodes.findIndex(ep => ep.episodeNumber === epNum);
  const currentEpisode = currentIndex >= 0 ? episodes[currentIndex] : undefined;
  const currentStoredEpisode = content.episodes.find(ep => ep.episodeNumber === epNum);
  const previousEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : undefined;
  const nextEpisode = currentIndex >= 0 ? episodes[currentIndex + 1] : undefined;
  const progressRows = user ? await db.watchProgress.findMany({
    where: { userId: user.id, contentId: content.id },
    select: {
      episodeId: true,
      positionSeconds: true,
      durationSeconds: true,
      lastWatchedAt: true,
    },
    orderBy: { lastWatchedAt: "desc" },
  }).catch(() => []) : [];
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

  if (requiresSubscription && !activeSubscription?.allowed) {
    return (
      <main className="watch-page">
        <section className="watch-stage">
          <div className="watch-topbar">
            <WatchBackButton className="btn btn-ghost btn-sm watch-back">
              <ArrowLeft size={18} />
            </WatchBackButton>
          </div>
          <section className="panel watch-paywall">
            <div className="watch-paywall-icon">
              <Lock size={30} />
            </div>
            <p className="eyebrow">Episode premium</p>
            <h1>Lanjutkan dengan langganan</h1>
            <p>
              Episode 1-{FREE_EPISODE_LIMIT} bisa ditonton gratis. Masuk dan aktifkan paket untuk menonton episode {epNum} dan seterusnya.
            </p>
            <Link className="btn" href="/plans" prefetch={false}>
              Pilih paket langganan
            </Link>
          </section>
        </section>
      </main>
    );
  }

  let streamUrl: string | null = null;
  let subtitleUrl: string | null = currentStoredEpisode?.subtitleUrl ?? content.subtitleUrl ?? null;
  let streamError: string | null = null;
  let streamOptions: Array<{ label: string; url: string }> = [];
  if (PROXY_VIDEO_PROVIDERS.has(content.providerSlug)) {
    streamUrl = `/api/video-proxy?provider=${encodeURIComponent(content.providerSlug)}&contentId=${encodeURIComponent(content.clipkuContentId)}&contentDbId=${encodeURIComponent(content.id)}&ep=${epNum}`;
    streamOptions = [{ label: "Otomatis", url: streamUrl }];
  } else try {
    const v2Providers = new Set(["dramawave", "reelshort", "netshort", "melolo"]);
    let raw: unknown = null;
    if (v2Providers.has(content.providerSlug)) {
      try {
        raw = await clipku.getStreamV2(content.providerSlug, content.clipkuContentId, epNum);
      } catch {
        raw = null;
      }
    }
    if (!raw || !extractStreamUrl(raw)) {
      raw = await clipku.getStream(content.providerSlug, content.clipkuContentId, epNum, content.apiRawResponse);
    }
    let episodePayload = selectEpisodePayload(raw, content.providerSlug, epNum);
    if (content.providerSlug === "shortmax" && !extractStreamUrl(episodePayload)) {
      raw = await clipku.getShortmaxStreamV2(content.clipkuContentId, epNum, content.apiRawResponse);
      episodePayload = selectEpisodePayload(raw, content.providerSlug, epNum);
    }
    streamUrl = extractStreamUrl(episodePayload);
    subtitleUrl = extractSubtitleUrl(episodePayload) ?? subtitleUrl;
    streamOptions = collectStreamOptions(episodePayload);
    if (!streamUrl) streamError = "URL stream tidak tersedia.";
  } catch {
    streamError = content.providerSlug === "drama"
      ? "Stream Drakor membutuhkan cookie login DrakorID di server. Hubungi admin untuk memperbarui DRAKOR_COOKIE."
      : "Gagal mengambil URL stream. Coba lagi nanti.";
  }

  // Some providers return every episode in one response. Select the requested
  // item before extracting a media URL, otherwise the first episode always wins.
  function collectStreamOptions(obj: unknown, found: Array<{ label: string; url: string }> = [], depth = 0) {
    if (!obj || depth > 10) return found;
    if (Array.isArray(obj)) obj.forEach(value => collectStreamOptions(value, found, depth + 1));
    else if (typeof obj === "object") {
      const row = obj as Record<string, unknown>;
      for (const qualityKey of ["1080p", "720p", "480p", "360p"]) {
        const qualityUrl = row[qualityKey];
        if (typeof qualityUrl === "string" && /\.(m3u8|mp4)(?:[?&]|$)/i.test(qualityUrl) && !found.some(item => item.url === qualityUrl)) {
          found.push({ label: qualityKey, url: qualityUrl });
        }
      }
      const url = ["videoPath", "url", "video_url", "play_url", "hls_url", "resourceLink"]
        .map(key => row[key])
        .find(value => typeof value === "string" && /\.(m3u8|mp4)(?:[?&]|$)/i.test(value)) as string | undefined;
      if (url && !found.some(item => item.url === url)) {
        const quality = row.quality ?? row.resolution ?? row.label;
        found.push({ label: quality ? `${quality}p`.replace("pp", "p") : `Sumber ${found.length + 1}`, url });
      }
      Object.values(row).forEach(value => collectStreamOptions(value, found, depth + 1));
    }
    return found;
  }

  const proxyContext = { contentId: content.id, episode: epNum };
  if (streamUrl) streamUrl = proxyMediaUrl(streamUrl, proxyContext);
  streamOptions = streamOptions.map(option => ({ ...option, url: proxyMediaUrl(option.url, proxyContext) }));

  return (
    <main className="watch-page">
      <section className="watch-stage" id="watch-player">
        <div className="watch-topbar">
          <WatchBackButton className="btn btn-ghost btn-sm watch-back">
            <ArrowLeft size={18} />
          </WatchBackButton>
        </div>

        {streamError && (
          <div className="watch-error">
            <p>{streamError}</p>
            <Link href={`/watch/${content.id}?ep=${epNum}`} className="btn btn-ghost btn-sm">
              <RotateCcw size={16} /> Coba lagi
            </Link>
            <WatchBackButton className="btn" style={{ marginTop: 12 }}>
              Kembali
            </WatchBackButton>
            {fallbackItems.length > 0 && <div><p>Versi dari platform lain:</p>{fallbackItems.map(item => <Link key={item.id} href={`/watch/${item.id}`} className="btn btn-ghost btn-sm">{item.providerName}</Link>)}</div>}
          </div>
        )}

        {streamUrl && (
          <WatchPlayer
            src={streamUrl}
            sources={streamOptions.length ? streamOptions : [{ label: "Otomatis", url: streamUrl }]}
            subtitle={subtitleUrl ?? undefined}
            poster={content.posterUrl ?? undefined}
            contentTitle={content.title}
            contentId={content.id}
            episodeId={content.episodes.length ? currentEpisode?.id : undefined}
            episodes={episodes.map(episode => ({
              id: episode.id,
              episodeNumber: episode.episodeNumber,
              title: episode.title,
            }))}
            currentEpisodeNumber={epNum}
            previousHref={previousEpisode ? `/watch/${content.id}?ep=${previousEpisode.episodeNumber}` : undefined}
            nextHref={nextEpisode ? `/watch/${content.id}?ep=${nextEpisode.episodeNumber}` : undefined}
            resumeAtSeconds={resumeAtSeconds}
            autoplay={preference?.autoplay ?? true}
            defaultMuted={preference?.defaultMuted ?? false}
            playbackSpeed={preference?.playbackSpeed ?? 1}
            preferredQuality={preference?.preferredQuality ?? "auto"}
            saveProgress={Boolean(user)}
            fullscreenOrientation={content.type === "movie" ? "landscape" : "portrait"}
          />
        )}

        {!streamUrl && !streamError && (
          <div className="watch-loading">
            <div className="spinner" />
            <p>Memutar video...</p>
          </div>
        )}
      </section>

      <section className="watch-info">
        <div className="watch-identity">
          <h1>{content.title}</h1>
          <div className="watch-badges">
            <span className="watch-badge accent">{episodes.length} Episode</span>
            <span className="watch-badge">{content.providerName}</span>
            <span className="watch-badge">{content.type === "movie" ? "Movie" : "Ongoing"}</span>
            <span className="watch-badge icon"><Sparkles size={14} /></span>
          </div>
          <div className="watch-quality">
            <h2>Kualitas Video</h2>
            <p>{streamOptions.length ? "Siap diputar" : "Memuat kualitas..."}</p>
          </div>
          <div className="watch-actions-row">
            <WatchlistButton
              contentId={content.id}
              loggedIn={Boolean(user)}
              initialSaved={Boolean(saved)}
              saveText="Tambah ke Favorit"
              savedText="Sudah Difavorit"
            />
          </div>
          <div className="watch-tags">
            {(content.genre as string[] | null | undefined)?.slice(0, 3).map(tag => (
              <span key={tag} className="watch-tag">{tag}</span>
            ))}
          </div>
          <section className="watch-synopsis">
            <h2>Sinopsis</h2>
            <p>{content.description}</p>
          </section>
        </div>

        <section className="watch-episodes">
          <div className="watch-episode-head">
            <h2>Daftar Episode</h2>
            <span>{epNum} / {episodes.length}</span>
          </div>
          <div className="watch-episode-list">
            {episodes.map(episode => {
              const active = episode.episodeNumber === epNum;
              const watched = watchedEpisodeNumbers.includes(episode.episodeNumber);
              const nextHref = `/watch/${content.id}?ep=${episode.episodeNumber}`;
              return (
                <Link key={episode.id} href={nextHref} className={`watch-episode-row${active ? " active" : ""}${watched ? " watched" : ""}`}>
                  <span className="watch-episode-number">{episode.episodeNumber}</span>
                  <small>{active ? "Aktif" : watched ? "Ditonton" : "Baru"}</small>
                </Link>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
