import Link from "next/link";
import { Clock3, Play } from "lucide-react";
import { isProgressCompleted } from "@/lib/watch-progress";
import { OptimizedImage } from "@/components/optimized-image";

type ProgressContent = {
  id: string;
  title: string;
  slug: string;
  providerName: string;
  type: string;
  posterUrl?: string | null;
  episodes?: Array<{
    id: string;
    episodeNumber: number;
  }>;
};

export type WatchProgressItem = {
  id: string;
  contentId: string;
  episodeId: string | null;
  positionSeconds: number;
  durationSeconds: number;
  lastWatchedAt: Date;
  content: ProgressContent;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function progressPercent(positionSeconds: number, durationSeconds: number) {
  if (!durationSeconds) return 0;
  return Math.min(100, Math.max(0, Math.round((positionSeconds / durationSeconds) * 100)));
}

function resumeHref(item: WatchProgressItem) {
  const episode = item.content.episodes?.find((ep) => ep.id === item.episodeId);
  return episode ? `/watch/${item.contentId}?ep=${episode.episodeNumber}` : `/watch/${item.contentId}`;
}

export function WatchProgressGrid({
  title,
  items,
  emptyLabel,
  emptyText,
  showResumeButton = false,
  }: {
  title: string;
  items: WatchProgressItem[];
  emptyLabel: string;
  emptyText: string;
  showResumeButton?: boolean;
}) {
  if (!items.length) {
    return (
      <section className="section">
        <div className="section-header">
          <h2>{title}</h2>
        </div>
        <div className="empty-state">
          <h2>{emptyLabel}</h2>
          <p>{emptyText}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2>{title}</h2>
        {showResumeButton && (
          <Link href="/history" className="btn btn-ghost btn-sm" prefetch={false}>
            Riwayat
          </Link>
        )}
      </div>
      <div className="grid continue-grid history-grid">
        {items.map((item) => {
          const episode = item.content.episodes?.find((ep) => ep.id === item.episodeId);
          const href = resumeHref(item);
          const percent = progressPercent(item.positionSeconds, item.durationSeconds);
          const completed = isProgressCompleted(item.positionSeconds, item.durationSeconds);
          return (
            <Link href={href} className="card progress-card" key={item.id} prefetch={false}>
              <div className="card-poster">
                {item.content.posterUrl ? (
                  <OptimizedImage src={item.content.posterUrl} alt={item.content.title} />
                ) : (
                  <div className="placeholder">
                    <span><Play size={30} /></span>
                  </div>
                )}
                <span className="card-badge-rating progress-badge">
                  {episode ? `Ep ${episode.episodeNumber}` : "Lanjut"}
                </span>
                <span className={`progress-state${completed ? " completed" : ""}`}>
                  {completed ? "Selesai" : "Lanjut"}
                </span>
                <div className="progress-overlay">
                  <div className="progress-overlay-bar">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
              <div className="card-body">
                <h3>{item.content.title}</h3>
                <div className="meta">
                  {item.content.providerName}
                  <span className="dot" />
                  {item.content.type}
                </div>
                <div className="progress-meta">
                  <span><Clock3 size={12} />{formatTime(item.positionSeconds)} / {formatTime(item.durationSeconds)}</span>
                  <strong>{percent}%</strong>
                </div>
                <span className={`progress-resume${completed ? " replay" : ""}`}>
                  <Play size={14} fill="currentColor" />
                  <span>{completed ? "Tonton lagi" : "Lanjut menonton"}</span>
                  {episode && <small>Ep {episode.episodeNumber}</small>}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
