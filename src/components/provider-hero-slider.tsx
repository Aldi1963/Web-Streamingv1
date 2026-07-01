"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, Play, Star } from "lucide-react";
import { WatchlistButton } from "@/components/watchlist-button";
import { OptimizedImage } from "@/components/optimized-image";

type HeroItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  posterUrl: string | null;
  bannerUrl: string | null;
  providerName: string;
  rating: number | null;
  type: string;
  releaseYear: number | null;
};

export function ProviderHeroSlider({ items, providerName, loggedIn, savedIds }: {
  items: HeroItem[];
  providerName?: string;
  loggedIn: boolean;
  savedIds: string[];
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => setActive(current => (current + 1) % items.length), 6000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const move = (direction: number) => {
    setActive(current => (current + direction + items.length) % items.length);
  };

  return (
    <section className="featured-slider" aria-label={`Drama populer ${providerName ?? "semua provider"}`}>
      {items.map((item, index) => (
        <article className={`featured-slide${index === active ? " active" : ""}`} key={item.id} aria-hidden={index !== active}>
          {(item.bannerUrl || item.posterUrl) && <OptimizedImage src={item.bannerUrl || item.posterUrl || ""} alt="" className="featured-bg" width={1280} height={720} sizes="100vw" quality={65} priority={index === 0} />}
          <div className="featured-overlay" />
          <div className="featured-info">
            <div className="featured-poster">{item.posterUrl && <OptimizedImage src={item.posterUrl} alt={item.title} priority={index === 0} sizes="(max-width: 768px) 90px, 180px" />}</div>
            <div className="featured-details">
              <span className="featured-provider">Drama Populer · {item.providerName}</span>
              <h2>{item.title}</h2>
              <div className="featured-meta">
                {item.rating && <span className="tag genre"><Star size={12} fill="currentColor" />{item.rating}</span>}
                <span className="tag">{item.type}</span>
                {item.releaseYear && <span className="tag">{item.releaseYear}</span>}
              </div>
              {item.description && <p className="featured-desc">{item.description.slice(0, 150)}{item.description.length > 150 ? "…" : ""}</p>}
              <div className="featured-actions">
                <Link href={`/watch/${item.id}`} className="btn btn-lg"><Play size={18} /> Tonton</Link>
                <Link href={`/drama/${item.slug}`} className="btn btn-lg btn-secondary" prefetch={false}><Info size={18} /> Detail</Link>
                <WatchlistButton contentId={item.id} loggedIn={loggedIn} initialSaved={savedIds.includes(item.id)} />
              </div>
            </div>
          </div>
        </article>
      ))}
      {items.length > 1 && <>
        <button className="featured-arrow featured-prev" onClick={() => move(-1)} aria-label="Drama sebelumnya"><ChevronLeft /></button>
        <button className="featured-arrow featured-next" onClick={() => move(1)} aria-label="Drama berikutnya"><ChevronRight /></button>
        <div className="featured-dots">
          {items.map((item, index) => <button className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Tampilkan ${item.title}`} key={item.id} />)}
        </div>
      </>}
    </section>
  );
}
