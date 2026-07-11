import Link from "next/link";
import { ArrowLeft, Download, Play, Volume2 } from "lucide-react";
import { cleanAnimeSlug, getAnimeDetail, getAnimeStream } from "@/lib/anime-api";
import { notFound } from "next/navigation";
import { AnimeVideoPlayer } from "@/components/anime-video-player";

export const dynamic = "force-dynamic";

type WatchParams = { series?: string; slug?: string; episode?: string; reso?: string; mirror?: string };
type StreamOption = { link?: string; provide?: string | number; id?: string | number; reso?: string; size_kb?: number | null };

function pickSource(options: StreamOption[], mirror?: string) {
  if (!options.length) return undefined;
  if (mirror) {
    const byMirror = options.find((item, index) => String(item.id ?? index) === mirror || String(index + 1) === mirror);
    if (byMirror?.link) return byMirror.link;
  }
  return (
    options.find((item) => item.link?.includes("pixeldrain.com"))?.link ||
    options.find((item) => item.link?.includes("sjkt.animekita.org"))?.link ||
    options.find((item) => item.link?.includes("storage.animekita.org"))?.link ||
    options[0]?.link
  );
}

export default async function AnimeWatchPage({ searchParams }: { searchParams: Promise<WatchParams> }) {
  const params = await searchParams;
  const series = cleanAnimeSlug(params.series);
  const slug = cleanAnimeSlug(params.slug);
  if (!series || !slug) notFound();
  const [detail, stream] = await Promise.all([getAnimeDetail(series), getAnimeStream(slug, series, params.episode)]);
  if (!stream) notFound();
  const qualities = stream.reso?.filter((q) => (stream.streams?.[q] ?? []).length) ?? Object.keys(stream.streams ?? {});
  const selected = params.reso && qualities.includes(params.reso) ? params.reso : (qualities.includes("720p") ? "720p" : qualities[0]);
  const options = selected ? (stream.streams?.[selected] ?? []) : [];
  const source = pickSource(options, params.mirror);
  const currentEpisode = detail?.chapter?.find((item) => cleanAnimeSlug(item.url) === slug);

  return (
    <main className="shell anime-watch-page">
      <div className="showcase-topbar"><Link href={`/anime/${series}`} className="showcase-icon-link" aria-label="Kembali ke detail" prefetch={false}><ArrowLeft size={21} /></Link><div className="showcase-titleblock"><span className="showcase-kicker">Anime Player</span><h1>{detail?.judul || "Anime"}</h1></div></div>
      <section className="anime-player-panel">
        {source ? <AnimeVideoPlayer source={source} poster={detail?.cover || undefined} /> : <div className="anime-player-empty"><Play size={34} /><p>Stream belum tersedia untuk episode ini.</p></div>}
        <div className="anime-audio-note"><Volume2 size={16} /><span>Jika suara belum keluar, naikkan volume player atau pilih mirror Pixeldrain/Mirror lain di bawah.</span></div>
        <div className="anime-player-meta"><div><p className="showcase-eyebrow">Episode</p><h2>{currentEpisode?.ch || params.episode || slug}</h2></div>{source ? <a className="btn btn-sm" href={source} target="_blank" rel="noreferrer"><Download size={16} />Buka sumber</a> : null}</div>
        <div className="showcase-chiprow anime-quality-row">{qualities.map((quality) => <Link key={quality} href={`/anime/watch?series=${encodeURIComponent(series)}&slug=${encodeURIComponent(slug)}&episode=${encodeURIComponent(params.episode || "")}&reso=${encodeURIComponent(quality)}`} className={`showcase-chip${quality === selected ? " active" : ""}`} prefetch={false}>{quality}{stream.resoSize?.[quality] ? ` - ${stream.resoSize[quality]}` : ""}</Link>)}</div>
        {options.length > 1 ? <div className="anime-source-list">{options.map((item, index) => <Link href={`/anime/watch?series=${encodeURIComponent(series)}&slug=${encodeURIComponent(slug)}&episode=${encodeURIComponent(params.episode || "")}&reso=${encodeURIComponent(selected || "")}&mirror=${encodeURIComponent(String(item.id ?? index))}`} key={`${item.id}-${index}`} prefetch={false}>Mirror {index + 1} <span>{item.link?.includes("pixeldrain") ? "Pixeldrain" : item.reso || selected}</span></Link>)}</div> : null}
      </section>
    </main>
  );
}
