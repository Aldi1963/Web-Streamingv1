import Link from "next/link";
import { ArrowLeft, Play, Sparkles } from "lucide-react";
import { WatchPlayer } from "@/components/watch-player";
import { WatchBackButton } from "@/components/watch-back-button";
import { signMediaUrl } from "@/lib/media-token";

export const dynamic = "force-dynamic";

const API_BASE = process.env.DRAMA_API_BASE ?? "http://127.0.0.1:5000";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
};

type DrakorDetail = {
  status: boolean;
  id: string;
  slug?: string;
  title?: string;
  image?: string;
  synopsis?: string;
  total_episode?: number;
  episodes?: Array<{ episode: number; premium?: boolean; end?: boolean }>;
  categories?: string[];
  views?: string;
  loves?: string;
  final_url?: string;
  details?: { language?: string; country?: string };
  cast?: { main?: Array<{ name: string; role?: string }>; support?: Array<{ name: string; role?: string; note?: string | null }> };
};

type DrakorStream = {
  status: boolean;
  episode: string;
  error?: string;
  message?: string;
  login_required?: boolean;
  thumbnail?: string;
  data_stream?: Array<{ quality?: string; type?: string; url: string }>;
};

export default async function DrakorIdPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const ep = Math.max(1, Number.parseInt((await searchParams).ep ?? "1") || 1);
  const [detail, stream] = await Promise.all([fetchDetail(id), fetchStream(id, ep)]);

  if (!detail.status) {
    return (
      <main className="watch-page">
        <section className="watch-stage">
          <div className="watch-topbar">
            <WatchBackButton className="btn btn-ghost btn-sm watch-back">
              <ArrowLeft size={18} />
            </WatchBackButton>
          </div>
          <div className="watch-loading">
            <p>Konten tidak ditemukan.</p>
          </div>
        </section>
      </main>
    );
  }

  const rawStreamUrl = stream.data_stream?.[0]?.url;
  const streamToken = rawStreamUrl ? signMediaUrl(rawStreamUrl) : null;
  const streamUrl = rawStreamUrl && streamToken
    ? `/api/drakorid-proxy?url=${encodeURIComponent(rawStreamUrl)}&exp=${streamToken.expiresAt}&sig=${streamToken.signature}`
    : null;
  const title = detail.title ?? "Drakor";
  const episodes = detail.episodes ?? [];
  const current = episodes.find(item => item.episode === ep) ?? episodes[0];

  return (
    <main className="watch-page">
      <section className="watch-stage" id="watch-player">
        <div className="watch-topbar">
          <WatchBackButton className="btn btn-ghost btn-sm watch-back">
            <ArrowLeft size={18} />
          </WatchBackButton>
        </div>

        {streamUrl ? (
          <WatchPlayer
            src={streamUrl}
            sources={[{ label: "Otomatis", url: streamUrl }]}
            subtitle={undefined}
            poster={detail.image}
            contentId={`drakorid-${id}`}
            episodeId={undefined}
            episodes={[]}
            currentEpisodeNumber={ep}
            previousHref={undefined}
            nextHref={undefined}
            resumeAtSeconds={0}
            autoplay={true}
            autoNext={false}
            defaultMuted={false}
            playbackSpeed={1}
            preferredQuality="auto"
            saveProgress={false}
          />
        ) : (
          <div className="watch-loading">
            <p>{stream.login_required ? "Stream Drakor membutuhkan cookie login DrakorID di server." : stream.error || stream.message || "Stream belum tersedia."}</p>
          </div>
        )}
      </section>

      <section className="watch-info">
        <div className="watch-identity">
          <h1>{title}</h1>
          <div className="watch-badges">
            <span className="watch-badge accent">{detail.total_episode ?? episodes.length} Episode</span>
            {detail.details?.language ? <span className="watch-badge">{detail.details.language}</span> : null}
            {detail.details?.country ? <span className="watch-badge">{detail.details.country}</span> : null}
            <span className="watch-badge icon"><Sparkles size={14} /></span>
          </div>
          <section className="watch-synopsis">
            <h2>Sinopsis</h2>
            <p>{detail.synopsis ?? "Sinopsis belum tersedia."}</p>
          </section>
          <div className="watch-tags">
            {(detail.categories ?? []).slice(0, 4).map(tag => (
              <span key={tag} className="watch-tag">{tag}</span>
            ))}
          </div>
        </div>

        <section className="watch-episodes">
          <div className="watch-episode-head">
            <h2>Daftar Episode</h2>
            <span>{current?.episode ?? ep} / {episodes.length || detail.total_episode || 0}</span>
          </div>
          <div className="watch-episode-list">
            {episodes.map(episode => (
              <Link key={episode.episode} href={`/drakorid/${id}?ep=${episode.episode}`} className={`watch-episode-row${episode.episode === ep ? " active" : ""}`}>
                <span className="watch-episode-number">{episode.episode}</span>
                <small>{episode.premium ? "Premium" : "Gratis"}</small>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

async function fetchDetail(id: string): Promise<DrakorDetail> {
  const response = await fetch(`${API_BASE}/drama/detail?id=${encodeURIComponent(id)}`, { cache: "no-store" });
  return response.ok ? await response.json() as DrakorDetail : { status: false, id };
}

async function fetchStream(id: string, ep: number): Promise<DrakorStream> {
  const response = await fetch(`${API_BASE}/drama/stream?id=${encodeURIComponent(id)}&ep=${encodeURIComponent(ep)}`, { cache: "no-store" });
  return await response.json().catch(() => ({ status: false, episode: String(ep), error: "Sumber drakor tidak merespons." })) as DrakorStream;
}
