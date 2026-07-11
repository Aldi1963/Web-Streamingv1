import Link from "next/link";
import { ArrowLeft, Film, Home, Search, Star } from "lucide-react";
import { ContentCardMetrics } from "@/components/content-card-metrics";

type ShowcaseItem = {
  id: string;
  slug: string;
  title: string;
  posterUrl?: string | null;
  providerName: string;
  type: string;
  rating?: number | null;
  viewCount?: number;
  providerViewCount?: number;
  episodeCount?: number;
  category?: string | null;
  language?: string | null;
};

type ShowcaseTab = {
  key: string;
  label: string;
  keywords?: string[];
};

type CollectionShowcaseProps = {
  title: string;
  sectionLabel: string;
  pageHref: string;
  activeSection: "movies" | "series";
  tabs: ShowcaseTab[];
  activeTab: string;
  items: ShowcaseItem[];
  countLabel?: string;
};

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase();
}

function matchesTab(item: ShowcaseItem, tab: ShowcaseTab) {
  if (!tab.keywords?.length) return true;
  const haystack = [
    item.title,
    item.providerName,
    item.type,
    item.category ?? "",
    item.language ?? "",
  ].map(normalize).join(" ");
  return tab.keywords.some(keyword => haystack.includes(keyword));
}

function buildTabHref(pageHref: string, key: string) {
  const params = new URLSearchParams();
  if (key) params.set("tab", key);
  return `${pageHref}${params.size ? `?${params}` : ""}`;
}

export function CollectionShowcase({
  title,
  sectionLabel,
  pageHref,
  activeSection,
  tabs,
  activeTab,
  items,
  countLabel,
}: CollectionShowcaseProps) {
  const selected = tabs.find(tab => tab.key === activeTab) ?? tabs[0];
  const filtered = selected ? items.filter(item => matchesTab(item, selected)) : items;
  const display = filtered.length ? filtered : items;

  return (
    <main className="shell showcase-page">
      <div className="showcase-topbar">
        <Link href="/" className="showcase-icon-link" aria-label="Kembali ke beranda" prefetch={false}>
          <ArrowLeft size={22} />
        </Link>
        <div className="showcase-titleblock">
          <span className="showcase-kicker">Clipku</span>
          <h1>{title}</h1>
        </div>
        <Link href="/terbaru" className="showcase-icon-link" aria-label="Cari konten" prefetch={false}>
          <Search size={22} />
        </Link>
      </div>

      <nav className="showcase-nav" aria-label="Navigasi koleksi">
        <Link href="/" className="showcase-nav-item" prefetch={false}>
          <Home size={17} />
          <span>Home</span>
        </Link>
        <Link href="/movies" className={`showcase-nav-item${activeSection === "movies" ? " active" : ""}`} aria-current={activeSection === "movies" ? "page" : undefined} prefetch={false}>
          <Film size={17} />
          <span>Movies</span>
        </Link>
      </nav>

      <div className="showcase-chiprow" aria-label={`${title} filters`}>
        {tabs.map(tab => {
          const active = tab.key === selected?.key;
          return (
            <Link
              key={tab.key}
              href={buildTabHref(pageHref, tab.key)}
              className={`showcase-chip${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
              prefetch={false}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <section className="showcase-section" aria-labelledby="showcase-heading">
        <div className="showcase-section-head">
          <div>
            <p className="showcase-eyebrow">{sectionLabel}</p>
            <h2 id="showcase-heading">{title}</h2>
          </div>
          {countLabel ? <span className="showcase-count">{countLabel}</span> : null}
        </div>

        {display.length ? (
          <div className="showcase-grid">
            {display.map(item => (
              <Link href={`/drama/${item.slug}`} className="showcase-card" key={item.id} prefetch={false}>
                {item.posterUrl ? (
                  <img src={item.posterUrl} alt={item.title} loading="lazy" decoding="async" />
                ) : (
                  <div className="showcase-placeholder" aria-hidden="true">
                    <span><Star size={22} /></span>
                  </div>
                )}
                <span className="showcase-badge showcase-badge-type">{sectionLabel}</span>
                {item.rating ? (
                  <span className="showcase-badge showcase-badge-rating">
                    <Star size={12} fill="currentColor" />
                    {item.rating}
                  </span>
                ) : null}
                <div className="showcase-card-overlay" />
                <div className="showcase-card-copy">
                  <h3>{item.title}</h3>
                  <ContentCardMetrics views={item.providerViewCount || item.viewCount} rating={item.rating} episodes={item.episodeCount} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="showcase-empty">
            <p>Belum ada judul untuk filter ini.</p>
            <Link href={pageHref} className="btn btn-sm" prefetch={false}>Kembali ke semua</Link>
          </div>
        )}
      </section>
    </main>
  );
}
