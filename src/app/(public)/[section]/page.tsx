import { ContentGrid } from "@/components/content-grid";
import { CollectionShowcase } from "@/components/collection-showcase";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
const titles: Record<string,string> = { "short-drama":"Short Drama", movies:"Movie", drakor:"Drakor", "privacy-policy":"Kebijakan Privasi", terms:"Syarat dan Ketentuan", "forgot-password":"Lupa Password" };
const movieTabs = [
  { key: "all", label: "Semua" },
  { key: "indonesia", label: "Indonesia", keywords: ["indonesia", "indo"] },
  { key: "global", label: "Global", keywords: ["global", "international", "english", "usa", "america"] },
  { key: "hollywood", label: "Hollywood", keywords: ["hollywood", "usa", "america", "english"] },
  { key: "asia", label: "Asia", keywords: ["asia", "korea", "japan", "china", "thai", "vietnam"] },
  { key: "horror", label: "Horror", keywords: ["horror", "seram", "thiller", "thriller", "supranatural"] },
];
export default async function Section({ params, searchParams }: { params: Promise<{ section: string }>; searchParams?: Promise<{ tab?: string }> }) {
  const [{ section }, sp] = await Promise.all([
    params,
    (searchParams ?? Promise.resolve({})) as Promise<{ tab?: string }>,
  ]);
  const title = titles[section]; if (!title) notFound();
  if (["privacy-policy","terms"].includes(section)) return <main className="shell legal-page"><h1>{title}</h1><div className="panel"><p>Layanan menyediakan akses streaming melalui penyedia yang terhubung dengan Clipku. Pengguna wajib mematuhi hukum, hak cipta, batas usia, dan ketentuan masing-masing penyedia.</p><h2>Data dan akun</h2><p>Data akun, perangkat, progres menonton, dan transaksi digunakan untuk menjalankan layanan serta menjaga keamanan akun. URL media tidak disimpan sebagai file video lokal.</p><h2>Kontak dan perubahan</h2><p>Ketentuan dapat diperbarui mengikuti perubahan layanan. Pengguna akan melihat versi terbaru pada halaman ini.</p></div></main>;
  if (section === "forgot-password") notFound();
  if (section === "short-drama") redirect("/movies");
  if (section === "movies") {
    const where = { type: "movie", isActive: true };
    const items = await db.content.findMany({
      where,
      take: 60,
      orderBy: [{ rating: "desc" }, { lastSyncedAt: "desc" }],
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
        category: true,
        language: true,
      },
    }).catch(() => []);

    return (
      <CollectionShowcase
        title={title}
        sectionLabel="Movie"
        pageHref={`/${section}`}
        activeSection="movies"
        tabs={movieTabs}
        activeTab={sp.tab ?? "all"}
        items={items}
      />
    );
  }

  const where = { type: "short-drama", isActive: true, OR: [{ language: { contains: "Korea" } }, { category: { contains: "Korea" } }, { providerName: { contains: "Korea" } }] };
  const items = await db.content.findMany({ where, take: 30, orderBy: { lastSyncedAt: "desc" } }).catch(() => []);
  return <main className="shell"><h1>{title}</h1><ContentGrid title="" items={items}/></main>;
}
