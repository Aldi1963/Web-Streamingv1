import Link from "next/link";
import { db } from "@/lib/db";
import { Filter, Play, Star } from "lucide-react";
import { ProviderModal } from "@/components/provider-modal";

export const dynamic = "force-dynamic";
const PER_PAGE = 24;

type BrowseParams = {
  q?: string; page?: string; provider?: string; year?: string; type?: string; sort?: string;
};

export default async function Browse({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const q = sp.q?.trim();
  const provider = sp.provider?.trim();
  const year = Number(sp.year) || undefined;
  const type = ["movie", "short-drama"].includes(sp.type ?? "") ? sp.type : undefined;
  const sort = ["latest", "rating", "title"].includes(sp.sort ?? "") ? sp.sort! : "latest";

  const where: Record<string, unknown> = { isActive: true };
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }, { providerName: { contains: q } }, { category: { contains: q } }];
  if (provider) where.providerSlug = provider;
  if (year) where.releaseYear = year;
  if (type) where.type = type;
  const orderBy = sort === "rating" ? { rating: "desc" as const } : sort === "title" ? { title: "asc" as const } : { lastSyncedAt: "desc" as const };

  const [items, total, providers] = await Promise.all([
    db.content.findMany({
      where,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy,
      select: { id: true, slug: true, title: true, posterUrl: true, providerName: true, type: true, rating: true },
    }).catch(() => []),
    db.content.count({ where }).catch(() => 0),
    db.content.groupBy({ by: ["providerName", "providerSlug"], where: { isActive: true }, _count: true }).catch(() => []),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const makeUrl = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (q) params.set("q", q);
    if (provider) params.set("provider", provider);
    if (year) params.set("year", String(year));
    if (type) params.set("type", type);
    if (sort !== "latest") params.set("sort", sort);
    return `/browse${params.size ? `?${params}` : ""}`;
  };

  return <main className="shell">
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <h1 style={{ margin: 0 }}>Jelajahi</h1>
      <ProviderModal
        providers={providers.map(p => ({ name: p.providerName, slug: p.providerSlug, count: p._count }))}
        current={provider}
        preservedQuery={new URLSearchParams(Object.entries(sp).filter((entry): entry is [string, string] => typeof entry[1] === "string")).toString()}
      />
    </div>
    <form className="filter-bar" action="/browse">
      {q && <input type="hidden" name="q" value={q} />}
      {provider && <input type="hidden" name="provider" value={provider} />}
      <Filter size={17} aria-hidden="true" />
      <select name="type" defaultValue={type ?? ""} aria-label="Tipe konten">
        <option value="">Semua tipe</option><option value="short-drama">Short Drama</option><option value="movie">Movie</option>
      </select>
      <select name="year" defaultValue={year ?? ""} aria-label="Tahun rilis">
        <option value="">Semua tahun</option>
        {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - i).map(value => <option key={value}>{value}</option>)}
      </select>
      <select name="sort" defaultValue={sort} aria-label="Urutkan">
        <option value="latest">Terbaru</option><option value="rating">Rating tertinggi</option><option value="title">Judul A–Z</option>
      </select>
      <button className="btn btn-sm" type="submit">Terapkan</button>
      {(q || provider || year || type || sort !== "latest") && <Link href="/browse" className="btn btn-ghost btn-sm">Reset</Link>}
    </form>
    <p className="muted result-summary">{total} konten{q && <> untuk “{q}”</>}{provider && <> dari {providers.find(p=>p.providerSlug===provider)?.providerName}</>}</p>

    {items.length ? <div className="grid">{items.map(item => (
      <Link href={`/drama/${item.slug}`} className="card" key={item.id} prefetch={false}>
        <div className="card-poster">{item.posterUrl ? <img src={item.posterUrl} alt={item.title} loading="lazy" decoding="async" /> : <div className="placeholder"><span><Play size={30} /></span></div>}{item.rating && <span className="card-badge-rating"><Star size={10} fill="currentColor" /> {item.rating}</span>}</div>
        <div className="card-body"><h3>{item.title}</h3><div className="meta">{item.providerName}<span className="dot" />{item.type}</div></div>
      </Link>
    ))}</div> : <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}><p style={{ fontSize: "1.2rem" }}>Tidak ada konten.</p>{(q || provider) && <Link href="/browse" className="btn" style={{ marginTop: 16 }}>Reset Filter</Link>}</div>}

    {totalPages > 1 && <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
      {page > 1 && <Link href={makeUrl(page - 1)} className="btn btn-ghost btn-sm" prefetch={false}>← Sebelumnya</Link>}
      <span style={{ padding: "8px 16px", color: "var(--muted)" }}>{page} / {totalPages}</span>
      {page < totalPages && <Link href={makeUrl(page + 1)} className="btn btn-ghost btn-sm" prefetch={false}>Selanjutnya →</Link>}
    </div>}
  </main>;
}
