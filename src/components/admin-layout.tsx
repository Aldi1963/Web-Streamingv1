"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CreditCard, Database, ExternalLink, Film, Home, Menu, Settings, ShieldCheck, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

type AdminGroup = { label: string; restricted?: boolean; items: Array<[string, string, LucideIcon]> };

const groups: AdminGroup[] = [
  { label: "Operasional", items: [
    ["/admin/dashboard", "Ringkasan", Home],
    ["/admin/reports", "Laporan video", Activity],
  ] },
  { label: "Manajemen", restricted: true, items: [
    ["/admin/users", "Pengguna", Users],
    ["/admin/monetization", "Monetisasi", CreditCard],
  ] },
  { label: "Konten & sistem", items: [
    ["/admin/catalog", "Katalog", Film],
    ["/admin/integrations", "Integrasi", Database],
  ] },
  { label: "Sistem", restricted: true, items: [
    ["/admin/settings", "Pengaturan", Settings],
  ] },
];

export function AdminLayout({ role, title, children }: { role: string; title: string; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const contentManager = role === "CONTENT_MANAGER";
  const visibleGroups = groups.filter(group => !(contentManager && group.restricted));
  const activeHref = visibleGroups.flatMap(group => group.items)
    .filter(([href]) => pathname === href || pathname.startsWith(`${href}/`))
    .sort(([a],[b]) => b.length - a.length)[0]?.[0];
  useEffect(() => setOpen(false), [pathname]);
  return <div className="admin-portal">
    {open && <button className="admin-backdrop" aria-label="Tutup menu admin" onClick={() => setOpen(false)} />}
    <aside className={`admin-portal-sidebar${open ? " open" : ""}`}>
      <div className="admin-portal-brand"><Link href="/admin/dashboard"><span className="admin-brand-mark">C+</span><span className="admin-brand-copy"><strong>CLIPKU</strong><small>CONTROL CENTER</small></span></Link><button onClick={() => setOpen(false)} aria-label="Tutup sidebar"><X size={20}/></button></div>
      <nav aria-label="Navigasi Control Center">
        {visibleGroups.map(group => <div className="admin-nav-group" key={group.label}>
          <span>{group.label}</span>
          {group.items.map(([href,label,Icon]) => <Link key={href} href={href} className={activeHref === href ? "active" : ""}><Icon size={18}/>{label}</Link>)}
        </div>)}
      </nav>
      <div className="admin-portal-footer">
        <div className="admin-role"><ShieldCheck size={17}/><span><small>Akses aktif</small><strong>{role.replaceAll("_"," ")}</strong></span></div>
        <Link href="/dashboard">Kembali ke akun</Link>
      </div>
    </aside>
    <div className="admin-portal-main">
      <header className="admin-portal-header">
        <button className="admin-menu-button" onClick={() => setOpen(true)} aria-label="Buka menu admin"><Menu size={22}/></button>
        <div><p>Control Center</p><h1>{title}</h1></div>
        <Link className="btn btn-secondary btn-sm admin-view-site" href="/"><ExternalLink size={15}/>Lihat situs</Link>
      </header>
      <div className="admin-portal-content">{children}</div>
    </div>
  </div>;
}
