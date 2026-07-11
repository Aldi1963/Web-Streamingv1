import Link from "next/link";
import { Play, Star } from "lucide-react";
import { ContentCardMetrics } from "@/components/content-card-metrics";
import { OptimizedImage } from "@/components/optimized-image";

type ContentItem = {
  id: string;
  title: string;
  slug: string;
  providerName: string;
  type: string;
  posterUrl?: string | null;
  rating?: number | null;
  viewCount?: number;
  providerViewCount?: number;
  episodeCount?: number;
};

export function ContentGrid({
  title,
  items = [],
  viewAllHref = "/terbaru",
}: {
  title: string;
  items?: Array<ContentItem>;
  viewAllHref?: string | null;
}) {
  const display: Array<ContentItem> = items.length
    ? items
    : Array.from({ length: 6 }, (_, i) => ({
        id: String(i),
        title: "Konten akan tampil setelah sinkronisasi",
        slug: "#",
        providerName: "Clipku API",
        type: "Premium",
        posterUrl: null,
      }));

  return (
    <section className="section">
      {title && <div className="section-header">
        <h2>{title}</h2>
        {viewAllHref && <Link className="section-link" href={viewAllHref} prefetch={false}>
          Lihat semua →
        </Link>}
      </div>}
      <div className="grid">
        {display.map((item) => (
          <Link
            href={item.slug === "#" ? "/terbaru" : `/drama/${item.slug}`}
            className="card"
            key={item.id}
            prefetch={false}
          >
            <div className="card-poster">
              {item.posterUrl ? (
                <OptimizedImage src={item.posterUrl} alt={item.title} />
              ) : (
                <div className="placeholder">
                  <span><Play size={30} /></span>
                </div>
              )}
              {item.rating ? (
                <span className="card-badge-rating">
                  <Star size={10} fill="currentColor" />
                  {item.rating.toFixed(1).replace(".0", "")}
                </span>
              ) : null}
            </div>
            <div className="card-body">
              <h3>{item.title}</h3>
              <ContentCardMetrics views={item.providerViewCount || item.viewCount} rating={item.rating} episodes={item.episodeCount} />
              <div className="meta">
                {item.providerName}
                <span className="dot" />
                {item.type}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
