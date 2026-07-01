import Link from "next/link";
import { db } from "@/lib/db";
import { Play, Star, Tv, Flame, ArrowRight, Layers3 } from "lucide-react";
import { auth } from "@/services/auth-service";
import { ProviderHeroSlider } from "@/components/provider-hero-slider";
import { ContentCardMetrics } from "@/components/content-card-metrics";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ provider?: string }>;
};

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

const cardSelect = {
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
} as const;

export default async function Home({ searchParams }: HomeProps) {
  const [params, user, providers] = await Promise.all([
    searchParams,
    auth.currentUser(),
    db.content.groupBy({
      by: ["providerName", "providerSlug"],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { providerSlug: "desc" } },
    }).catch(() => []),
  ]);
  const requestedProvider = params.provider?.trim();
  const activeProvider = providers.find(provider => provider.providerSlug === requestedProvider);
  const contentWhere = {
    isActive: true,
    ...(activeProvider ? { providerSlug: activeProvider.providerSlug } : {}),
  };

  const [featured, latest, popular, saved] = await Promise.all([
    db.content.findMany({
      where: { ...contentWhere, posterUrl: { not: null } },
      select: {
        id: true, slug: true, title: true, description: true, posterUrl: true,
        bannerUrl: true, providerName: true, rating: true, type: true, releaseYear: true,
      },
      take: 6,
      orderBy: [{ rating: "desc" }, { lastSyncedAt: "desc" }],
    }).catch(() => []),
    db.content.findMany({
      where: contentWhere,
      select: cardSelect,
      take: 18,
      orderBy: { lastSyncedAt: "desc" },
    }).catch(() => []),
    db.content.findMany({
      where: contentWhere,
      select: cardSelect,
      take: 18,
      orderBy: [{ rating: "desc" }, { lastSyncedAt: "desc" }],
    }).catch(() => []),
    user ? db.watchlist.findMany({
      where: { userId: user.id },
      select: { contentId: true },
    }).catch(() => []) : Promise.resolve([]),
  ]);
  const savedIds = new Set(saved.map(item => item.contentId));

  return (
    <>
      <section className="home-providers" aria-labelledby="provider-heading">
        <div className="home-provider-heading">
          <div>
            <span className="home-provider-kicker">Mau nonton dari mana?</span>
            <h1 id="provider-heading">Pilih Provider Drama</h1>
          </div>
          <span className="home-provider-summary">
            {activeProvider ? `${activeProvider._count} judul tersedia` : `${providers.length} provider tersedia`}
          </span>
        </div>
        <div className="home-provider-list">
          <Link
            href="/"
            className={`home-provider-card${activeProvider ? "" : " active"}`}
            aria-current={activeProvider ? undefined : "page"}
            prefetch={false}
          >
            <span className="home-provider-logo provider-logo-all"><Layers3 size={24} /></span>
            <span className="home-provider-copy"><strong>Semua</strong><small>Provider</small></span>
          </Link>
          {providers.map((provider, index) => (
            <Link
              href={`/?provider=${provider.providerSlug}`}
              className={`home-provider-card provider-tone-${index % 8}${activeProvider?.providerSlug === provider.providerSlug ? " active" : ""}`}
              key={provider.providerSlug}
              aria-current={activeProvider?.providerSlug === provider.providerSlug ? "page" : undefined}
              prefetch={false}
            >
              <span className="home-provider-logo" aria-hidden="true">
                {providerLogos[provider.providerSlug] ? (
                  <img
                    src={providerLogos[provider.providerSlug]}
                    alt=""
                    width={42}
                    height={42}
                    loading="lazy"
                    decoding="async"
                  />
                ) : provider.providerName.charAt(0).toUpperCase()}
              </span>
              <span className="home-provider-copy">
                <strong>{provider.providerName.replace(" Short Drama", "").replace(" Short", "")}</strong>
                <small>{provider._count} drama</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Slider */}
      {featured.length > 0 && (
        <ProviderHeroSlider
          items={featured}
          providerName={activeProvider?.providerName}
          loggedIn={Boolean(user)}
          savedIds={Array.from(savedIds)}
        />
      )}

      {/* Content Grid */}
      <section className="section">
        <div className="section-header"><h2><Tv size={22} style={{marginRight:8,verticalAlign:"middle"}} />Terbaru{activeProvider && <span className="section-provider-name"> · {activeProvider.providerName.replace(" Short Drama", "")}</span>}</h2><Link className="section-link" href={activeProvider ? `/browse?provider=${activeProvider.providerSlug}` : "/browse"} prefetch={false}>Lihat semua <ArrowRight size={16} /></Link></div>
        <div className="grid">
          {latest.map(item => (
            <Link href={`/drama/${item.slug}`} className="card" key={item.id} prefetch={false}>
              <div className="card-poster">
                {item.posterUrl ? <img src={item.posterUrl} alt={item.title} loading="lazy" decoding="async" /> : <div className="placeholder"><span><Play size={30} /></span></div>}
                {item.rating && <span className="card-badge-rating"><Star size={10} fill="currentColor" /> {item.rating}</span>}
              </div>
              <div className="card-body">
                <h3>{item.title}</h3>
                <ContentCardMetrics views={item.providerViewCount || item.viewCount} rating={item.rating} episodes={item.episodeCount} />
                <div className="meta">{item.providerName}<span className="dot" />{item.type}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2><Flame size={22} style={{marginRight:8,verticalAlign:"middle"}} />Populer{activeProvider && <span className="section-provider-name"> · {activeProvider.providerName.replace(" Short Drama", "")}</span>}</h2><Link className="section-link" href={activeProvider ? `/browse?provider=${activeProvider.providerSlug}` : "/browse"} prefetch={false}>Lihat semua <ArrowRight size={16} /></Link></div>
        <div className="grid">
          {popular.map(item => (
            <Link href={`/drama/${item.slug}`} className="card" key={item.id} prefetch={false}>
              <div className="card-poster">
                {item.posterUrl ? <img src={item.posterUrl} alt={item.title} loading="lazy" decoding="async" /> : <div className="placeholder"><span><Play size={30} /></span></div>}
                {item.rating && <span className="card-badge-rating"><Star size={10} fill="currentColor" /> {item.rating}</span>}
              </div>
              <div className="card-body">
                <h3>{item.title}</h3>
                <ContentCardMetrics views={item.providerViewCount || item.viewCount} rating={item.rating} episodes={item.episodeCount} />
                <div className="meta">{item.providerName}<span className="dot" />{item.type}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>© 2026 Clipku Streaming</span>
        <div className="footer-links">
          <Link href="/privacy-policy" prefetch={false}>Privasi</Link>
          <Link href="/terms" prefetch={false}>Ketentuan</Link>
        </div>
      </footer>
    </>
  );
}
