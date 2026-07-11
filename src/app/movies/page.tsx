import Link from "next/link";
import { ArrowLeft, Film, Home, Search, Star } from "lucide-react";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type MovieItem = {
  id: string;
  slug: string;
  title: string;
  posterUrl: string | null;
  providerName: string;
  type: string;
  rating: number | null;
  viewCount: number;
  providerViewCount: number;
  episodeCount: number | null;
  apiRawResponse: unknown;
};

const tabs = [
  { key: "all", label: "Semua", match: () => true },
  { key: "indonesia", label: "Indonesia", match: (item: MovieItem) => rawText(item).includes("indonesia") },
  { key: "global", label: "Global", match: () => true },
  { key: "hollywood", label: "Hollywood", match: (item: MovieItem) => includesAny(rawText(item), ["amerika serikat", "britania raya", "united states", "hollywood"]) },
  { key: "asia", label: "Asia", match: (item: MovieItem) => !includesAny(rawText(item), ["amerika serikat", "britania raya", "united states"]) },
  { key: "horror", label: "Horror", match: (item: MovieItem) => rawText(item).includes("horror") },
  { key: "animasi", label: "Animasi", match: (item: MovieItem) => rawText(item).includes("animasi") || rawText(item).includes("animation") },
] as const;

type PageProps = { searchParams: Promise<{ tab?: string; q?: string }> };

export default async function MoviesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = tabs.find(tab => tab.key === params.tab)?.key ?? "all";
  const query = params.q?.trim().toLowerCase() ?? "";
  const active = tabs.find(tab => tab.key === activeTab) ?? tabs[0];

  const allItems = await db.content.findMany({
    where: { providerSlug: "moviebox", type: "movie", isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      posterUrl: true,
      providerName: true,
      type: true,
      rating: true,
      viewCount: true,
      providerViewCount: true,
      episodeCount: true,
      apiRawResponse: true,
    },
    orderBy: [{ lastSyncedAt: "desc" }, { rating: "desc" }],
    take: 1600,
  }).catch(() => []);

  const filtered = allItems.filter(item => active.match(item)).filter(item => !query || rawText(item).includes(query));

  return (
    <main className="movies-page">
      <div className="movies-topbar">
        <Link href="/" prefetch={false} aria-label="Kembali" className="movies-icon-btn">
          <ArrowLeft size={22} />
        </Link>
        <div className="movies-title-block">
          <div className="movies-kicker">MovieBox</div>
          <h1>Movie</h1>
        </div>
        <Link href="/terbaru" prefetch={false} aria-label="Cari" className="movies-icon-btn">
          <Search size={22} />
        </Link>
      </div>

      <nav className="movies-nav" aria-label="Navigasi koleksi">
        <Link href="/" prefetch={false} className="movies-nav-item">
          <Home size={17} /> <span>Home</span>
        </Link>
        <Link href="/movies" prefetch={false} aria-current="page" className="movies-nav-item active">
          <Film size={17} /> <span>Movies</span>
        </Link>
      </nav>

      <div className="movies-chips" aria-label="Kategori movie">
        {tabs.map(tab => {
          const href = tab.key === "all" ? "/movies" : `/movies?tab=${tab.key}`;
          const isActive = tab.key === activeTab;
          return (
            <Link key={tab.key} href={href} prefetch={false} aria-current={isActive ? "page" : undefined} className={`movies-chip${isActive ? " active" : ""}`}>
              {tab.label}
            </Link>
          );
        })}
      </div>

      <section className="movies-section" aria-labelledby="movies-heading">
        <div className="movies-section-head">
          <div>
            <p className="movies-eyebrow">Movie</p>
            <h2 id="movies-heading">{active.label}</h2>
          </div>
        </div>

        {filtered.length ? (
          <div className="movies-grid">
            {filtered.map((item) => {
              const rating = displayRating(item);
              return (
                <Link key={item.id} href={`/drama/${item.slug}`} prefetch={false} className="movies-card">
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt={item.title} loading="lazy" decoding="async" />
                  ) : (
                    <div className="movies-placeholder">
                      <Star size={24} />
                    </div>
                  )}
                  <div className="movies-overlay" />
                  <span className="movies-badge movies-badge-type">Movie</span>
                  {rating ? (
                    <span className="movies-badge movies-badge-rating">
                      <Star size={12} fill="currentColor" />
                      {rating}
                    </span>
                  ) : null}
                  <div className="movies-copy">
                    <h3>{item.title}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="movies-empty">
            <p>Belum ada judul untuk filter ini.</p>
            <Link href="/movies" prefetch={false} className="btn btn-sm">Kembali ke semua</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function raw(item: MovieItem) {
  return item.apiRawResponse && typeof item.apiRawResponse === "object" ? item.apiRawResponse as Record<string, unknown> : {};
}

function rawText(item: MovieItem) {
  const data = raw(item);
  return [item.title, item.providerName, item.type, data.genre, data.countryName, data.title, data.subjectType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle));
}

function displayRating(item: MovieItem) {
  const value = Number(item.rating ?? raw(item).imdbRatingValue ?? raw(item).imdbRate ?? 0);
  return Number.isFinite(value) ? value : 0;
}
