import { auth } from "@/services/auth-service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { clipku } from "@/services/clipku-api-service";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { WatchPlayer } from "@/components/watch-player";
import { EpisodePopup } from "@/components/episode-popup";
import { episodesWithFallback } from "@/lib/episodes";
import { extractStreamUrl, selectEpisodePayload } from "@/lib/stream-utils";

export const dynamic = "force-dynamic";

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
  const episodes = episodesWithFallback(content.episodes, content.apiRawResponse, content.id);
  const currentIndex = episodes.findIndex(ep => ep.episodeNumber === epNum);
  const currentEpisode = currentIndex >= 0 ? episodes[currentIndex] : undefined;
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

  // Fetch stream URL - deep extraction from any provider response
  let streamUrl: string | null = null;
  let streamError: string | null = null;
  try {
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
    if (!streamUrl) streamError = "URL stream tidak tersedia.";
  } catch {
    streamError = "Gagal mengambil URL stream. Coba lagi nanti.";
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
        </div>
      )}

      {streamUrl && (
        <WatchPlayer
          src={streamUrl}
          poster={content.posterUrl ?? undefined}
          contentId={content.id}
          episodeId={content.episodes.length ? currentEpisode?.id : undefined}
          previousHref={previousEpisode ? `/watch/${content.id}?ep=${previousEpisode.episodeNumber}` : undefined}
          nextHref={nextEpisode ? `/watch/${content.id}?ep=${nextEpisode.episodeNumber}` : undefined}
          resumeAtSeconds={resumeAtSeconds}
        />
      )}

      {!streamUrl && !streamError && (
        <div className="watch-loading">
          <div className="spinner" />
          <p>Memutar video...</p>
        </div>
      )}
    </main>
  );
}
