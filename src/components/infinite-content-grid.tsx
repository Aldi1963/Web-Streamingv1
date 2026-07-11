"use client";

import Link from "next/link";
import { Play, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContentCardMetrics } from "@/components/content-card-metrics";
import { OptimizedImage } from "@/components/optimized-image";

type ContentItem = {
  id: string;
  title: string;
  slug: string;
  posterUrl: string | null;
  providerName: string;
  type: string;
  rating: number | null;
  viewCount: number;
  providerViewCount: number;
  episodeCount: number;
};

export function InfiniteContentGrid({
  provider,
  sort = "latest",
  initialItems,
  initialCursor,
}: {
  provider: string;
  sort?: "latest" | "popular" | "recommended";
  initialItems: ContentItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setLoading(false);
    setFailed(false);
  }, [initialItems, initialCursor, provider, sort]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({
        provider,
        paginate: "1",
        limit: "18",
        cursor,
        sort,
      });
      const response = await fetch(`/api/contents?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal memuat katalog");
      const payload = await response.json() as { items: ContentItem[]; nextCursor: string | null };
      setItems(current => {
        const known = new Set(current.map(item => item.id));
        return [...current, ...payload.items.filter(item => !known.has(item.id))];
      });
      setCursor(payload.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, provider, sort]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !cursor) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "500px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  return <>
    <div className="grid">
      {items.map(item => <Link href={`/drama/${item.slug}`} className="card" key={item.id} prefetch={false}>
        <div className="card-poster">
          {item.posterUrl
            ? <OptimizedImage src={item.posterUrl} alt={item.title} />
            : <div className="placeholder"><span><Play size={30} /></span></div>}
          {item.rating ? (
            <span className="card-badge-rating">
              <Star size={10} fill="currentColor" />
              {item.rating.toFixed(1).replace(".0", "")}
            </span>
          ) : null}
        </div>
        <div className="card-body">
          <h3>{item.title}</h3>
          <ContentCardMetrics
            views={item.providerViewCount || item.viewCount}
            rating={item.rating}
            episodes={item.episodeCount}
          />
          <div className="meta">{item.providerName}<span className="dot" />{item.type}</div>
        </div>
      </Link>)}
    </div>
    <div ref={sentinel} className="infinite-scroll-status" aria-live="polite">
      {loading && <><span className="spinner" /> Memuat konten berikutnya...</>}
      {failed && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadMore()}>Coba lagi</button>}
      {!cursor && items.length > 0 && <span>Semua konten sudah ditampilkan.</span>}
    </div>
  </>;
}
