import Link from "next/link";
import { Layers3, Play, Star } from "lucide-react";
import { db } from "@/lib/db";
import { CatalogProviderLink } from "@/components/catalog-provider-link";
import { ContentCardMetrics } from "@/components/content-card-metrics";
import { OptimizedImage } from "@/components/optimized-image";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

const providerLogos: Record<string, string> = {
  melolo: "/provider-logos/melolo.jpg",
  dramabox: "/provider-logos/dramabox.jpg",
  reelshort: "/provider-logos/reelshort.jpg",
  moviebox: "/provider-logos/moviebox.jpg",
  freereels: "/provider-logos/freereels.jpg",
  shortmax: "/provider-logos/shortmax.jpg",
  meloshort: "/provider-logos/meloshort.jpg",
  goodshort: "/provider-logos/goodshort.jpg",
  pinedrama: "/provider-logos/pinedrama.jpg",
  dramanova: "/provider-logos/dramanova.jpg",
  flickreels: "/provider-logos/flickreels.jpg",
  netshort: "/provider-logos/netshort.jpg",
  dramawave: "/provider-logos/dramawave.jpg",
};

type CatalogTab = "rekomendasi" | "terbaru" | "popular";
type CatalogParams = {
  tab?: string;
  provider?: string;
  page?: string;
  q?: string;
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogParams>;
}) {
  const params = await searchParams;
  const tab = normalizeTab(params.tab);
  const provider = params.provider?.trim();
  const search = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1") || 1);

  const providers = await db.content.groupBy({
    by: ["providerName", "providerSlug"],
    where: { isActive: true, type: "short-drama" },
    _count: true,
    orderBy: { _count: { providerSlug: "desc" } },
  }).catch(() => []);

  const selectedProvider = providers.find((item) => item.providerSlug === provider);
  const where = {
    isActive: true,
    type: "short-drama",
    ...(selectedProvider ? { providerSlug: selectedProvider.providerSlug } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search } },
        { providerName: { contains: search } },
        { description: { contains: search } },
      ],
    } : {}),
  };

  const [items, total] = await Promise.all([
    db.content.findMany({
      where,
      orderBy: orderForTab(tab),
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, slug: true, title: true, posterUrl: true, providerName: true, type: true,
        rating: true, viewCount: true, providerViewCount: true, episodeCount: true, lastSyncedAt: true,
      },
    }).catch(() => []),
    db.content.count({ where }).catch(() => 0),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const providerLabel = selectedProvider?.providerName.replace(" Short Drama", "").replace(" Short", "");
  const activeMeta = metaForTab(tab);
  const pageHref = (target: number) => {
    const query = new URLSearchParams({ tab });
    if (selectedProvider) query.set("provider", selectedProvider.providerSlug);
    if (search) query.set("q", search);
    if (target > 1) query.set("page", String(target));
    return `/katalog?${query}`;
  };
  const providerHref = (slug?: string) => {
    const query = new URLSearchParams({ tab });
    if (search) query.set("q", search);
    if (slug) query.set("provider", slug);
    return `/katalog?${query}`;
  };
  const resultTitle = search
    ? `Hasil pencarian "${search}"`
    : providerLabel ? `${activeMeta.resultPrefix} ${providerLabel}` : activeMeta.resultAll;

  return (
    <main className="shell catalog-page">
      <section className="catalog-filter" aria-labelledby="catalog-provider-heading">
        <div className="catalog-filter-head">
          <div>
            <p className="popular-eyebrow" id="catalog-provider-heading">Provider drama</p>
            <h2>{providerLabel ? `${activeMeta.providerPrefix} ${providerLabel}` : activeMeta.providerAll}</h2>
          </div>
          <span>{selectedProvider ? `${selectedProvider._count} drama` : `${providers.length} provider`}</span>
        </div>
        <div className="home-provider-list popular-provider-list">
          <CatalogProviderLink
            href={providerHref()}
            className={`home-provider-card${selectedProvider ? "" : " active"}`}
            aria-current={selectedProvider ? undefined : "page"}
          >
            <span className="home-provider-logo provider-logo-all"><Layers3 size={24} /></span>
            <span className="home-provider-copy"><strong>Semua</strong><small>Provider</small></span>
          </CatalogProviderLink>
          {providers.map((item, index) => (
            <CatalogProviderLink
              href={providerHref(item.providerSlug)}
              className={`home-provider-card provider-tone-${index % 8}${selectedProvider?.providerSlug === item.providerSlug ? " active" : ""}`}
              key={item.providerSlug}
              aria-current={selectedProvider?.providerSlug === item.providerSlug ? "page" : undefined}
            >
              <span className="home-provider-logo" aria-hidden="true">
                {providerLogos[item.providerSlug] ? (
                  <img src={providerLogos[item.providerSlug]} alt="" width={42} height={42} loading="lazy" decoding="async" />
                ) : item.providerName.charAt(0).toUpperCase()}
              </span>
              <span className="home-provider-copy">
                <strong>{item.providerName.replace(" Short Drama", "").replace(" Short", "")}</strong>
                <small>{item._count} drama</small>
              </span>
            </CatalogProviderLink>
          ))}
        </div>
      </section>

      <section className="popular-results">
        <div className="popular-grid-head">
          <div>
            <p>{activeMeta.resultEyebrow}</p>
            <h2>{resultTitle}</h2>
          </div>
          <span>Halaman {page} / {totalPages}</span>
        </div>
        {items.length ? (
          <div className={`popular-grid${tab === "terbaru" ? " latest-grid" : ""}`}>
            {items.map((item, index) => {
              const rating = item.rating ?? 0;
              const views = item.providerViewCount || item.viewCount || 0;
              return (
                <Link href={`/drama/${item.slug}`} className={`popular-card${tab === "terbaru" ? " latest-card" : ""}`} key={item.id} prefetch={false}>
                  <div className="card-poster">
                    {item.posterUrl ? (
                      <OptimizedImage src={item.posterUrl} alt={item.title} priority={index < 3} />
                    ) : (
                      <div className="placeholder"><span><Play size={30} /></span></div>
                    )}
                    {tab === "popular" && <span className="popular-rank">#{(page - 1) * PER_PAGE + index + 1}</span>}
                    {tab === "terbaru" && <span className="latest-badge">Baru</span>}
                    <span className="card-badge-rating"><Star size={10} fill="currentColor" /> {rating ? rating.toFixed(1).replace(".0", "") : "0"}</span>
                  </div>
                  <div className="card-body">
                    <h3>{item.title}</h3>
                    <ContentCardMetrics views={views} rating={rating} episodes={item.episodeCount} />
                    <div className="meta">{item.providerName}<span className="dot" />{tab === "terbaru" ? formatDate(item.lastSyncedAt) : item.type}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <h2>{search ? "Hasil tidak ditemukan" : "Belum ada konten"}</h2>
            <p>{search ? `Tidak ada drama yang cocok dengan "${search}".` : "Pilih provider atau tab lain untuk melihat konten."}</p>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <div className="pagination-bar">
          {page > 1 && <Link href={pageHref(page - 1)} className="btn btn-ghost btn-sm">Sebelumnya</Link>}
          <span className="pagination-current">{page} / {totalPages}</span>
          {page < totalPages && <Link href={pageHref(page + 1)} className="btn btn-ghost btn-sm">Selanjutnya</Link>}
        </div>
      )}
    </main>
  );
}

function normalizeTab(value: string | undefined): CatalogTab {
  if (value === "popular" || value === "populer") return "popular";
  if (value === "terbaru") return "terbaru";
  return "rekomendasi";
}

function orderForTab(tab: CatalogTab) {
  if (tab === "popular") return [{ trendingScore: "desc" as const }, { viewCount: "desc" as const }, { rating: "desc" as const }, { lastSyncedAt: "desc" as const }];
  if (tab === "terbaru") return [{ lastSyncedAt: "desc" as const }, { updatedAt: "desc" as const }];
  return [{ providerViewCount: "desc" as const }, { trendingScore: "desc" as const }, { rating: "desc" as const }, { lastSyncedAt: "desc" as const }];
}

function metaForTab(tab: CatalogTab) {
  if (tab === "popular") return {
    providerPrefix: "Populer di",
    providerAll: "Semua konten populer",
    resultEyebrow: "Trending sekarang",
    resultPrefix: "Populer di",
    resultAll: "Semua konten populer",
  };
  if (tab === "terbaru") return {
    providerPrefix: "Terbaru dari",
    providerAll: "Semua update provider",
    resultEyebrow: "Update terbaru",
    resultPrefix: "Video terbaru",
    resultAll: "Video terbaru semua provider",
  };
  return {
    providerPrefix: "Rekomendasi dari",
    providerAll: "Rekomendasi semua provider",
    resultEyebrow: "Pilihan untuk ditonton",
    resultPrefix: "Rekomendasi",
    resultAll: "Rekomendasi semua provider",
  };
}

function formatDate(value: Date | null) {
  if (!value) return "Terbaru";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(value);
}
