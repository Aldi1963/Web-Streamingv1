"use client";

import Link from "next/link";
import { ListVideo, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Episode = {
  id: string;
  episodeNumber: number;
  title: string | null;
  thumbnailUrl: string | null;
};

export function EpisodePopup({
  contentId,
  episodes,
  currentEpisode,
  watchedEpisodeNumbers = [],
}: {
  contentId: string;
  episodes: Episode[];
  currentEpisode: number;
  watchedEpisodeNumbers?: number[];
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const watchedSet = new Set(watchedEpisodeNumbers);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    activeRef.current?.scrollIntoView({ block: "center" });
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!episodes.length) return null;

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm episode-popup-trigger" onClick={() => setOpen(true)}>
        <ListVideo size={17} /> Semua Episode
        <span className="episode-count">{episodes.length}</span>
      </button>

      {open && (
        <div className="episode-popup-overlay" onClick={() => setOpen(false)} role="presentation">
          <section
            className="episode-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="episode-popup-title"
            onClick={event => event.stopPropagation()}
          >
            <header className="episode-popup-header">
              <div>
                <h2 id="episode-popup-title">Semua Episode</h2>
                <p>{episodes.length} episode tersedia</p>
              </div>
              <button ref={closeRef} type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Tutup daftar episode">
                <X size={21} />
              </button>
            </header>

            <div className="episode-popup-list">
              {episodes.map(episode => {
                const active = episode.episodeNumber === currentEpisode;
                const watched = watchedSet.has(episode.episodeNumber);
                return (
                  <Link
                    ref={active ? activeRef : undefined}
                    key={episode.id}
                    href={`/watch/${contentId}?ep=${episode.episodeNumber}`}
                    className={`episode-popup-item${active ? " active" : ""}${watched ? " watched" : ""}`}
                    aria-current={active ? "page" : undefined}
                    aria-label={`Tonton episode ${episode.episodeNumber}`}
                    onClick={() => setOpen(false)}
                  >
                    <span>{episode.episodeNumber}</span>
                    <small>{active ? "Aktif" : watched ? "Ditonton" : "Baru"}</small>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
