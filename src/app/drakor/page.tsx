import Link from "next/link";
import { Play, Star } from "lucide-react";
import { db } from "@/lib/db";
import { ContentCardMetrics } from "@/components/content-card-metrics";
import { OptimizedImage } from "@/components/optimized-image";

export const dynamic = "force-dynamic";

const API_BASE = process.env.DRAMA_API_BASE ?? "http://127.0.0.1:5000";

const drakorTabs = [
  { key: "trending", label: "Trending", path: "/drama/trending" },
  { key: "terbaru", label: "Terbaru", path: "/drama/terbaru" },
  { key: "ongoing", label: "Ongoing", path: "/drama/ongoing" },
  { key: "slider", label: "Pilihan" , path: "/drama/slider" },
  { key: "korea", label: "Korea", path: "/drama/home/korea" },
  { key: "china", label: "China", path: "/drama/home/china" },
] as const;

type DrakorTabKey = (typeof drakorTabs)[number]["key"];

type DrakorItem = {
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
  category: string | null;
  language: string | null;
};

type ApiCard = {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  image?: string | null;
  episode?: string | number | null;
};

type ApiResult = {
  ok: boolean;
  count: number;
  items: ApiCard[];
  message?: string;
};

type PageProps = {
  searchParams: Promise<{ tab?: string; q?: string }>;
};

export default async function DrakorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = getTab(params.tab);
  const query = params.q?.trim() ?? "";
  const active = drakorTabs.find(tab => tab.key === activeTab) ?? drakorTabs[0];
  const apiPath = query ? `/drama/search?q=${encodeURIComponent(query)}` : active.path;

  const [dbItems, apiResult, allContent] = await Promise.all([
    db.content.findMany({
      where: { providerSlug: "drama", isActive: true },
      select: {
        id: true, slug: true, title: true, posterUrl: true, providerName: true, type: true,
        rating: true, viewCount: true, providerViewCount: true, episodeCount: true,
        apiRawResponse: true, category: true, language: true,
      },
      orderBy: [{ lastSyncedAt: "desc" }, { rating: "desc" }],
      take: 1200,
    }).catch(() => []),
    fetchDrakor(apiPath),
    db.content.findMany({
      where: { isActive: true },
      select: { title: true, slug: true },
      orderBy: [{ lastSyncedAt: "desc" }],
      take: 5000,
    }).catch(() => []),
  ]);

  const apiItems = apiResult.items.filter(item => item.title || item.id);
  const internalLinks = new Map(
    allContent
      .map(item => [normalizeTitle(item.title), item.slug] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])),
  );
  const filteredDb = dbItems
    .filter(item => matchDbTab(item, activeTab))
    .filter(item => !query || rawText(item).includes(query.toLowerCase()));
  return (
    <main className="drakor-page">
      <div className="movies-chips drakor-chips" aria-label="Kategori drakor">
        {drakorTabs.map(tab => {
          const isActive = tab.key === activeTab && !query;
          const href = tab.key === "trending" ? "/drakor" : `/drakor?tab=${tab.key}`;
          return (
            <Link key={tab.key} href={href} prefetch={false} aria-current={isActive ? "page" : undefined} className={`movies-chip${isActive ? " active" : ""}`}>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {apiItems.length ? (
        <section className="drakor-section">
          <div className="drakor-section-head">
            <div>
              <p className="drakor-eyebrow">{query ? "Hasil pencarian" : "Pilihan terbaru"}</p>
              <h2>{query ? `Hasil "${query}"` : active.label}</h2>
            </div>
          </div>
          <ApiGrid items={apiItems} internalLinks={internalLinks} />
        </section>
      ) : null}

      {(filteredDb.length > 0 || apiItems.length === 0) && (
        <section className="drakor-section">
          <div className="drakor-section-head">
            <div>
              <p className="drakor-eyebrow">{apiItems.length ? "Katalog lainnya" : "Katalog drakor"}</p>
              <h2>{query ? `Katalog untuk "${query}"` : active.label}</h2>
            </div>
            <span>{filteredDb.length} judul</span>
          </div>
          <DbGrid items={filteredDb} />
        </section>
      )}
    </main>
  );
}

async function fetchDrakor(path: string): Promise<ApiResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const data = await response.json() as { status?: boolean; count?: number; data?: ApiCard[]; message?: string; error?: string };
    const items = Array.isArray(data.data) ? data.data : [];
    return {
      ok: response.ok && data.status !== false,
      count: Number(data.count ?? items.length) || 0,
      items,
      message: data.message ?? data.error,
    };
  } catch (error) {
    return {
      ok: false,
      count: 0,
      items: [],
      message: error instanceof Error ? error.message : "Gagal menghubungi sumber drakor",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function ApiGrid({ items, internalLinks }: { items: ApiCard[]; internalLinks: Map<string, string> }) {
  return (
    <div className="drakor-api-grid">
      {items.map((item, index) => {
        const title = item.title || `Drakor ${item.id ?? index + 1}`;
        const normalizedTitle = normalizeTitle(title);
        const internalSlug = internalLinks.get(normalizedTitle);
        const href = internalSlug
          ? `/drama/${internalSlug}`
          : item.id
            ? `/drakorid/${encodeURIComponent(item.id)}`
            : (item.slug ? `/drama/${item.slug}` : "/drakor");
        return (
          <Link href={href} className="drakor-api-card" key={`${item.id ?? item.slug ?? title}-${index}`} prefetch={false}>
            {item.image ? <OptimizedImage src={item.image} alt={title} priority={index < 4} width={180} height={200} /> : <div className="drakor-card-placeholder"><Play size={26} /></div>}
            <div className="drakor-card-shade" />
            {item.episode ? <span className="drakor-card-badge">Ep {item.episode}</span> : null}
            <div className="drakor-card-copy">
              <h3>{title}</h3>
              <p>Drakor</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function DbGrid({ items }: { items: DrakorItem[] }) {
  if (!items.length) {
    return (
      <div className="empty-state drakor-empty">
        <h2>Belum ada judul</h2>
        <p>Coba kategori lain atau gunakan pencarian.</p>
      </div>
    );
  }
  return (
    <div className="drakor-db-grid">
      {items.map((item, index) => (
        <Link href={`/drama/${item.slug}`} className="drakor-db-card" key={item.id} prefetch={false}>
          <div className="card-poster">
            {item.posterUrl ? <OptimizedImage src={item.posterUrl} alt={item.title} priority={index < 3} /> : <div className="placeholder"><span><Play size={30} /></span></div>}
            <span className="card-badge-rating"><Star size={10} fill="currentColor" /> {item.rating ? item.rating.toFixed(1).replace(".0", "") : "0"}</span>
          </div>
          <div className="card-body">
            <h3>{item.title}</h3>
            <ContentCardMetrics views={item.providerViewCount || item.viewCount} rating={item.rating} episodes={item.episodeCount} />
            <div className="meta">{item.language || item.providerName}<span className="dot" />{item.category || "Drakor"}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function getTab(value?: string): DrakorTabKey {
  return drakorTabs.find(tab => tab.key === value)?.key ?? "trending";
}

function matchDbTab(item: DrakorItem, tab: string) {
  const text = rawText(item);
  if (tab === "korea") return text.includes("korea") || text.includes("drakor");
  if (tab === "china") return text.includes("china") || text.includes("tiongkok");
  if (tab === "ongoing") return text.includes("ongoing") || text.includes("berjalan");
  return true;
}

function rawText(item: DrakorItem) {
  const raw = item.apiRawResponse && typeof item.apiRawResponse === "object" ? item.apiRawResponse as Record<string, unknown> : {};
  return [item.title, item.providerName, item.category, item.language, raw.title, raw.category, raw.genre, raw.country, raw.status]
    .filter(Boolean).join(" ").toLowerCase();
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9\p{L}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
