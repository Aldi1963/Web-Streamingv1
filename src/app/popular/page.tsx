import Link from "next/link";
import { Flame, Play, Star } from "lucide-react";
import { db } from "@/lib/db";
import { PopularFilters } from "@/components/popular-filters";
import { ContentCardMetrics } from "@/components/content-card-metrics";
import { OptimizedImage } from "@/components/optimized-image";

export const dynamic = "force-dynamic";

const PER_PAGE = 18;

type PopularParams = {
  provider?: string;
  page?: string;
  language?: string;
  genre?: string;
  status?: string;
  duration?: string;
};

export default async function PopularPage({
  searchParams,
}: {
  searchParams: Promise<PopularParams>;
}) {
  const params = await searchParams;
  const provider = params.provider?.trim();
  const language = params.language?.trim() ?? "";
  const genre = params.genre?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const duration = params.duration?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1") || 1);

  const [providers, languageRows, genreRows] = await Promise.all([
    db.content.groupBy({
      by: ["providerName", "providerSlug"],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { providerSlug: "desc" } },
    }).catch(() => []),
    db.content.findMany({
      where: { isActive: true, language: { not: null } },
      distinct: ["language"],
      select: { language: true },
      orderBy: { language: "asc" },
    }).catch(() => []),
    db.content.findMany({
      where: { isActive: true, genre: { not: undefined } },
      select: { genre: true },
      take: 5000,
    }).catch(() => []),
  ]);

  const selectedProvider = providers.find((item) => item.providerSlug === provider);
  const where = {
    isActive: true,
    ...(selectedProvider ? { providerSlug: selectedProvider.providerSlug } : {}),
    ...(language ? { language } : {}),
    ...(genre ? { genre: { array_contains: genre } } : {}),
    ...(status === "completed"
      ? { category: { contains: "Selesai" } }
      : status === "ongoing"
        ? { NOT: { category: { contains: "Selesai" } } }
        : {}),
    ...(duration === "short"
      ? { duration: { lt: 600 } }
      : duration === "medium"
        ? { duration: { gte: 600, lte: 1800 } }
        : duration === "long"
          ? { duration: { gt: 1800 } }
          : {}),
  };
  const genres = Array.from(new Set(genreRows.flatMap((row) =>
    Array.isArray(row.genre) ? row.genre.filter((item): item is string => typeof item === "string") : []
  ))).sort((a, b) => a.localeCompare(b));

  const [items, total] = await Promise.all([
    db.content.findMany({
      where,
      orderBy: [{ trendingScore: "desc" }, { viewCount: "desc" }, { rating: "desc" }, { lastSyncedAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, slug: true, title: true, posterUrl: true, providerName: true, type: true,
        rating: true, viewCount: true, providerViewCount: true, episodeCount: true,
      },
    }).catch(() => []),
    db.content.count({ where }).catch(() => 0),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (selectedProvider) query.set("provider", selectedProvider.providerSlug);
    if (language) query.set("language", language);
    if (genre) query.set("genre", genre);
    if (status) query.set("status", status);
    if (duration) query.set("duration", duration);
    if (target > 1) query.set("page", String(target));
    return `/popular${query.size ? `?${query}` : ""}`;
  };

  return (
    <main className="shell">
      <div className="section-header">
        <h1><Flame size={26} style={{ marginRight: 8, verticalAlign: "middle" }} />Populer</h1>
      </div>

      <PopularFilters
        provider={selectedProvider?.providerSlug ?? ""}
        language={language}
        genre={genre}
        status={status}
        duration={duration}
        providers={providers.map((item) => ({
          value: item.providerSlug,
          label: `${item.providerName.replace(" Short Drama", "").replace(" Short", "")} (${item._count})`,
        }))}
        languages={languageRows.flatMap((item) => item.language ? [{ value: item.language, label: item.language }] : [])}
        genres={genres.map((item) => ({ value: item, label: item }))}
      />

      <p className="muted result-summary">
        {total} konten populer{selectedProvider ? ` dari ${selectedProvider.providerName}` : ""}
      </p>

      {items.length ? (
        <div className="grid">
          {items.map((item, index) => (
            <Link href={`/drama/${item.slug}`} className="card" key={item.id} prefetch={false}>
              <div className="card-poster">
                {item.posterUrl ? (
                  <OptimizedImage src={item.posterUrl} alt={item.title} priority={index < 3} />
                ) : (
                  <div className="placeholder"><span><Play size={30} /></span></div>
                )}
                {item.rating != null && (
                  <span className="card-badge-rating"><Star size={10} fill="currentColor" /> {item.rating}</span>
                )}
              </div>
              <div className="card-body">
                <h3>{item.title}</h3>
                <ContentCardMetrics views={item.providerViewCount || item.viewCount} rating={item.rating} episodes={item.episodeCount} />
                <div className="meta">{item.providerName}<span className="dot" />{item.type}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Belum ada konten populer</h2>
          <p>Pilih platform lain untuk melihat konten.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
          {page > 1 && <Link href={pageHref(page - 1)} className="btn btn-ghost btn-sm">← Sebelumnya</Link>}
          <span style={{ padding: "8px 16px", color: "var(--muted)" }}>{page} / {totalPages}</span>
          {page < totalPages && <Link href={pageHref(page + 1)} className="btn btn-ghost btn-sm">Selanjutnya →</Link>}
        </div>
      )}
    </main>
  );
}
