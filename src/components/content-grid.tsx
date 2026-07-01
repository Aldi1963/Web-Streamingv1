import Link from "next/link";
import { Play } from "lucide-react";
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
}: {
  title: string;
  items?: Array<ContentItem>;
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
        <Link className="section-link" href="/browse" prefetch={false}>
          Lihat semua →
        </Link>
      </div>}
      <div className="grid">
        {display.map((item) => (
          <Link
            href={item.slug === "#" ? "/browse" : `/drama/${item.slug}`}
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
