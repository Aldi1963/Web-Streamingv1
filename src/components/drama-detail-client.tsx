"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export function DramaDescription({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const shouldTruncate = text.length > 300;
  const displayText = expanded || !shouldTruncate ? text : text.slice(0, 300) + "...";

  return (
    <div>
      <p className="drama-desc">{displayText}</p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: -8, marginBottom: 16 }}
        >
          {expanded ? <><ChevronUp size={16} /> Sembunyikan</> : <><ChevronDown size={16} /> Lihat Deskripsi Lengkap</>}
        </button>
      )}
    </div>
  );
}

export function EpisodeList({
  episodes,
  contentId,
  watchedEpisodeNumbers = [],
  activeEpisodeNumber,
}: {
  episodes: Array<{
    id: string;
    episodeNumber: number;
    title: string | null;
    thumbnailUrl: string | null;
  }>;
  contentId: string;
  watchedEpisodeNumbers?: number[];
  activeEpisodeNumber?: number | null;
}) {
  if (!episodes.length) return null;
  const watchedSet = new Set(watchedEpisodeNumbers);

  return (
    <section className="section">
      <div className="section-header">
        <h2>📺 Episode ({episodes.length})</h2>
      </div>
      <div className="detail-episode-grid">
        {episodes.map((ep) => (
          <Link
            key={ep.id}
            className={`detail-episode-item${activeEpisodeNumber === ep.episodeNumber ? " active" : ""}${watchedSet.has(ep.episodeNumber) ? " watched" : ""}`}
            href={`/watch/${contentId}?ep=${ep.episodeNumber}`}
            aria-label={`Tonton episode ${ep.episodeNumber}`}
            aria-current={activeEpisodeNumber === ep.episodeNumber ? "page" : undefined}
          >
            <span>{ep.episodeNumber}</span>
            <small>{activeEpisodeNumber === ep.episodeNumber ? "Aktif" : watchedSet.has(ep.episodeNumber) ? "Ditonton" : "Baru"}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
