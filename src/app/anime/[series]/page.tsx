import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, Eye, ListVideo, Play, Sparkles, Star, Tv } from "lucide-react";
import { cleanAnimeSlug, getAnimeDetail } from "@/lib/anime-api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type AnimeDetailPageProps = {
  params: Promise<{ series: string }>;
};

type AnimeEpisode = {
  id?: string | number;
  ch?: string;
  url?: string;
  date?: string;
  views?: number;
};

function episodeHref(series: string, episode?: AnimeEpisode) {
  if (!episode?.url) return "/anime";
  return `/anime/watch?series=${encodeURIComponent(series)}&slug=${encodeURIComponent(cleanAnimeSlug(episode.url))}&episode=${encodeURIComponent(String(episode.ch || ""))}`;
}

function episodeLabel(episode: AnimeEpisode, fallback: number) {
  const raw = String(episode.ch || "").trim();
  if (!raw) return String(fallback);
  return raw.replace(/^episode\s*/i, "").replace(/^eps?\s*/i, "").trim() || raw;
}

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const { series } = await params;
  const anime = await getAnimeDetail(series);
  if (!anime) notFound();

  const cleanSeries = cleanAnimeSlug(anime.series_id || series);
  const episodes = anime.chapter ?? [];
  const latestEpisode = episodes[0];
  const firstEpisode = episodes[episodes.length - 1] ?? latestEpisode;
  const title = anime.judul || "Anime";
  const latestLabel = latestEpisode ? episodeLabel(latestEpisode, episodes.length) : "";
  const firstLabel = firstEpisode ? episodeLabel(firstEpisode, 1) : "";

  return (
    <main className="watch-page anime-detail-watchlike">
      <section className="anime-watch-stage">
        {anime.cover ? <img className="anime-watch-backdrop" src={anime.cover} alt="" aria-hidden="true" /> : null}
        <div className="anime-watch-shade" />

        <div className="anime-watch-topbar">
          <Link href="/anime" className="movies-icon-btn" aria-label="Kembali ke anime" prefetch={false}>
            <ArrowLeft size={22} />
          </Link>
          <div className="movies-title-block">
            <div className="movies-kicker">AnimeBox</div>
            <h1>{title}</h1>
          </div>
        </div>

        <div className="anime-watch-stage-inner">
          <Link href={episodeHref(cleanSeries, latestEpisode)} className="anime-watch-preview" prefetch={false}>
            {anime.cover ? <img src={anime.cover} alt={title} /> : <Tv size={52} />}
            <div className="anime-watch-preview-overlay" />
            <span className="anime-watch-play"><Play size={30} fill="currentColor" /></span>
            <span className="anime-watch-preview-label">Episode terbaru</span>
          </Link>

          <div className="anime-watch-copy">
            <div className="watch-badges anime-watch-badges">
              {anime.rating ? <span className="watch-badge accent"><Star size={14} fill="currentColor" /> {anime.rating}</span> : null}
              {anime.status ? <span className="watch-badge">{anime.status}</span> : null}
              {anime.type ? <span className="watch-badge">{anime.type}</span> : null}
              <span className="watch-badge">{episodes.length} Episode</span>
              <span className="watch-badge icon"><Sparkles size={14} /></span>
            </div>

            <h2>{title}</h2>
            <p>{anime.sinopsis || "Sinopsis belum tersedia untuk anime ini."}</p>

            <div className="anime-watch-actions">
              {latestEpisode ? (
                <Link href={episodeHref(cleanSeries, latestEpisode)} className="anime-watch-primary" prefetch={false}>
                  <Play size={18} fill="currentColor" /> Tonton eps {latestLabel} <ChevronRight size={18} />
                </Link>
              ) : null}
              {firstEpisode && firstEpisode !== latestEpisode ? (
                <Link href={episodeHref(cleanSeries, firstEpisode)} className="anime-watch-secondary" prefetch={false}>
                  Mulai eps {firstLabel}
                </Link>
              ) : null}
              <a href="#anime-episodes" className="anime-watch-secondary">
                <ListVideo size={17} /> Pilih episode
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="watch-info anime-watch-info">
        <div className="watch-identity anime-watch-identity">
          <div className="anime-watch-facts">
            {anime.author ? <span><small>Studio</small><strong>{anime.author}</strong></span> : null}
            {anime.published ? <span><small>Rilis</small><strong>{anime.published}</strong></span> : null}
            {anime.status ? <span><small>Status</small><strong>{anime.status}</strong></span> : null}
          </div>

          {anime.genre?.length ? (
            <div className="watch-tags">
              {anime.genre.slice(0, 8).map((genre) => <span className="watch-tag" key={genre}>{genre}</span>)}
            </div>
          ) : null}

          <section className="watch-synopsis anime-watch-synopsis">
            <h2>Sinopsis</h2>
            <p>{anime.sinopsis || "Sinopsis belum tersedia."}</p>
          </section>
        </div>

        <section className="watch-episodes anime-watch-episodes" id="anime-episodes">
          <div className="watch-episode-head">
            <h2>Daftar Episode</h2>
            <span>{episodes.length} episode</span>
          </div>

          {episodes.length ? (
            <div className="anime-watch-episode-list">
              {episodes.map((episode, index) => {
                const label = episodeLabel(episode, episodes.length - index);
                const isLatest = index === 0;
                return (
                  <Link
                    href={episodeHref(cleanSeries, episode)}
                    className={`anime-watch-episode-row${isLatest ? " active" : ""}`}
                    key={`${episode.id}-${episode.url}-${index}`}
                    prefetch={false}
                  >
                    <span className="watch-episode-number">{label}</span>
                    <small>{isLatest ? "Terbaru" : "Episode"}</small>
                    <em>
                      {episode.date ? <span><CalendarDays size={12} /> {episode.date}</span> : null}
                      {episode.views ? <span><Eye size={12} /> {episode.views.toLocaleString("id-ID")}</span> : null}
                    </em>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="movies-empty"><p>Episode belum tersedia.</p></div>
          )}
        </section>
      </section>
    </main>
  );
}
