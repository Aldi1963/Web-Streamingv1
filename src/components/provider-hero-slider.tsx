"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, Play, Star } from "lucide-react";
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

export function ProviderHeroSlider({ items, providerName }: {
  items: HeroItem[];
  providerName?: string;
  loggedIn: boolean;
  savedIds: string[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = items.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [providerName, items.length]);

  useEffect(() => {
    if (!hasMultiple) return;

    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % items.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [hasMultiple, items.length]);

  if (!items.length) return null;

  return (
    <section className="featured-slider" aria-label={`Drama populer ${providerName ?? "semua provider"}`}>
      {items.map((item, index) => (
        <article key={item.id} className={`featured-slide ${index === activeIndex ? "active" : ""}`}>
          {(item.bannerUrl || item.posterUrl) ? (
            <OptimizedImage
              src={item.bannerUrl || item.posterUrl || ""}
              alt=""
              className="featured-bg"
              width={1280}
              height={720}
              sizes="100vw"
              priority={index === 0}
              quality={52}
            />
          ) : null}
          <div className="featured-overlay" />
          <div className="featured-info">
            <div className="featured-poster">
              {item.posterUrl ? (
                <OptimizedImage
                  src={item.posterUrl}
                  alt={item.title}
                  width={480}
                  height={720}
                  sizes="(max-width: 900px) 42vw, 220px"
                  priority={index === 0}
                  quality={62}
                />
              ) : null}
            </div>
            <div className="featured-details">
              <span className="featured-provider">Drama Populer · {item.providerName}</span>
              <h2>{item.title}</h2>
              <div className="featured-meta">
                {item.rating && <span className="tag genre"><Star size={12} fill="currentColor" />{item.rating}</span>}
                <span className="tag">{item.type}</span>
                {item.releaseYear && <span className="tag">{item.releaseYear}</span>}
              </div>
              {item.description && <p className="featured-desc">{item.description.slice(0, 150)}{item.description.length > 150 ? "..." : ""}</p>}
              <div className="featured-actions">
                <Link href={`/watch/${item.id}`} className="btn btn-lg"><Play size={18} /> Tonton</Link>
                <Link href={`/drama/${item.slug}`} className="btn btn-lg btn-secondary" prefetch={false}><Info size={18} /> Detail</Link>
              </div>
            </div>
          </div>
        </article>
      ))}

      {hasMultiple && (
        <div className="featured-dots" aria-label="Pilih slide">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === activeIndex ? "dot on" : "dot"}
              aria-label={`Tampilkan ${item.title}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
