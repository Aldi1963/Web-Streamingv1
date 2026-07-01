import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DramaDescription, EpisodeList } from "@/components/drama-detail-client";
import { Play, Lock, Clapperboard } from "lucide-react";
import { WatchlistButton } from "@/components/watchlist-button";
import { auth } from "@/services/auth-service";
import { ContentGrid } from "@/components/content-grid";
import { episodesWithFallback } from "@/lib/episodes";
import { isProgressCompleted } from "@/lib/watch-progress";
import { OptimizedImage } from "@/components/optimized-image";

export const dynamic = "force-dynamic";

export default async function DramaDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await auth.currentUser();
  const item = await db.content
    .findUnique({
      where: { slug },
      include: { episodes: { orderBy: { episodeNumber: "asc" } } },
    })
    .catch(() => null);

  if (!item) notFound();
  const [saved, related] = await Promise.all([
    user ? db.watchlist.findUnique({ where: { userId_contentId: { userId: user.id, contentId: item.id } } }).catch(() => null) : null,
    db.content.findMany({
      where: { isActive: true, id: { not: item.id }, type: item.type },
      take: 6,
      orderBy: [{ rating: "desc" }, { lastSyncedAt: "desc" }],
    }).catch(() => []),
  ]);

  const bannerUrl = item.bannerUrl || item.posterUrl;
  const episodes = episodesWithFallback(item.episodes, item.apiRawResponse, item.id);
  const progress = user ? await db.watchProgress.findMany({
    where: { userId: user.id, contentId: item.id },
    orderBy: { lastWatchedAt: "desc" },
  }).catch(() => []) : [];
  const watchedEpisodeNumbers = progress
    .filter(entry => isProgressCompleted(entry.positionSeconds, entry.durationSeconds))
    .map(entry => entry.episodeId ? item.episodes.find(ep => ep.id === entry.episodeId)?.episodeNumber : undefined)
    .filter((value): value is number => typeof value === "number");
  const activeProgress = progress[0];
  const activeEpisodeNumber = activeProgress?.episodeId
    ? item.episodes.find(ep => ep.id === activeProgress.episodeId)?.episodeNumber
    : episodes[0]?.episodeNumber ?? null;
  const genres = (item.genre as string[]) ?? [];
  const metaItems = [
    item.providerName,
    item.type,
    item.releaseYear && String(item.releaseYear),
    item.language,
    item.rating && `⭐ ${item.rating}`,
    item.duration && `${item.duration} min`,
  ].filter(Boolean);

  return (
    <main>
      {/* Banner */}
      {bannerUrl && (
        <div className="drama-banner">
          <OptimizedImage src={bannerUrl} alt="" width={1280} height={720} sizes="100vw" quality={65} priority />
          <div className="drama-banner-overlay" />
        </div>
      )}

      {/* Content */}
      <div className="drama-detail">
        {/* Poster */}
        <div className="drama-poster">
          {item.posterUrl ? (
            <OptimizedImage src={item.posterUrl} alt={item.title} width={570} height={855} sizes="(max-width: 768px) 140px, 280px" priority />
          ) : (
            <div className="placeholder"><span><Clapperboard size={40} /></span></div>
          )}
        </div>

        {/* Info */}
        <div className="drama-info">
          {/* Breadcrumb */}
          <div className="drama-breadcrumb">
            <Link href="/browse" prefetch={false}>Browse</Link>
            <span>/</span>
            <Link href={`/${item.type === "movie" ? "movies" : "short-drama"}`} prefetch={false}>
              {item.type === "movie" ? "Movie" : "Short Drama"}
            </Link>
          </div>

          <h1>{item.title}</h1>

          {/* Meta tags */}
          <div className="drama-meta">
            {metaItems.map((m, i) => (
              <span key={i} className="tag">{m}</span>
            ))}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="drama-meta">
              {genres.map((g) => (
                <span key={g} className="tag genre">{g}</span>
              ))}
            </div>
          )}

          {/* Description with expand */}
          <DramaDescription text={item.description} />

          {/* Actions */}
          <div className="drama-actions">
            <Link href={`/watch/${item.id}`} className="btn btn-lg">
              <Play size={18} /> Tonton Sekarang
            </Link>
            <Link href="/plans" className="btn btn-lg btn-secondary" prefetch={false}>
              <Lock size={18} /> Berlangganan
            </Link>
            <WatchlistButton contentId={item.id} loggedIn={Boolean(user)} initialSaved={Boolean(saved)} />
          </div>
        </div>
      </div>

      {/* Episodes */}
      <EpisodeList
        episodes={episodes}
        contentId={item.id}
        watchedEpisodeNumbers={watchedEpisodeNumbers}
        activeEpisodeNumber={activeEpisodeNumber}
      />
      <ContentGrid title="Rekomendasi serupa" items={related} />
    </main>
  );
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await db.content
    .findUnique({ where: { slug }, select: { title: true, description: true, posterUrl: true } })
    .catch(() => null);

  if (!item) return { title: "Drama tidak ditemukan" };

  return {
    title: item.title,
    description: item.description?.slice(0, 160) ?? "Tonton drama seru di Clipku Streaming",
    alternates: { canonical: `/drama/${slug}` },
    openGraph: {
      title: item.title,
      description: item.description?.slice(0, 160),
      url: `/drama/${slug}`,
      type: "video.movie" as const,
      images: item.posterUrl ? [item.posterUrl] : [],
    },
  };
}
