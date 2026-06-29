import { ContentGrid } from "@/components/content-grid";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
const titles: Record<string,string> = { "short-drama":"Short Drama", movies:"Movie", drakor:"Drakor", "privacy-policy":"Kebijakan Privasi", terms:"Syarat dan Ketentuan", "forgot-password":"Lupa Password", checkout:"Checkout" };
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const {section}=await params; const title = titles[section]; if (!title) notFound();
  if (["privacy-policy","terms"].includes(section)) return <main className="shell legal-page"><h1>{title}</h1><div className="panel"><p>Layanan menyediakan akses streaming melalui penyedia yang terhubung dengan Clipku. Pengguna wajib mematuhi hukum, hak cipta, batas usia, dan ketentuan masing-masing penyedia.</p><h2>Data dan akun</h2><p>Data akun, perangkat, progres menonton, dan transaksi digunakan untuk menjalankan layanan serta menjaga keamanan akun. URL media tidak disimpan sebagai file video lokal.</p><h2>Kontak dan perubahan</h2><p>Ketentuan dapat diperbarui mengikuti perubahan layanan. Pengguna akan melihat versi terbaru pada halaman ini.</p></div></main>;
  const where = section === "movies"
    ? { type: "movie", isActive: true }
    : section === "short-drama"
      ? { type: "short-drama", isActive: true }
      : { type: "short-drama", isActive: true, OR: [{ language: { contains: "Korea" } }, { category: { contains: "Korea" } }, { providerName: { contains: "Korea" } }] };
  const items = await db.content.findMany({ where, take: 30, orderBy: { lastSyncedAt: "desc" } }).catch(() => []);
  return <main className="shell"><h1>{title}</h1><ContentGrid title="" items={items}/></main>;
}
