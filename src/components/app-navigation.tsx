"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Film, Flame, Globe, Home, Menu, Search, Settings, Shield, Tv, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; Icon: LucideIcon };

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/browse", label: "Browse", Icon: Search },
  { href: "/popular", label: "Populer", Icon: Flame },
  { href: "/short-drama", label: "Short Drama", Icon: Tv },
  { href: "/movies", label: "Movie", Icon: Film },
  { href: "/drakor", label: "Drakor", Icon: Globe },
];

const dashboardItems = [
  { href: "/dashboard", label: "Ringkasan", Icon: Home },
  { href: "/dashboard/profile", label: "Profil", Icon: User },
  { href: "/dashboard/subscription", label: "Langganan", Icon: Shield },
  { href: "/dashboard/payments", label: "Pembayaran", Icon: Film },
  { href: "/dashboard/devices", label: "Perangkat", Icon: Tv },
  { href: "/dashboard/history", label: "Riwayat", Icon: Flame },
  { href: "/dashboard/favorites", label: "Favorit", Icon: Globe },
  { href: "/dashboard/preferences", label: "Preferensi", Icon: Settings },
  { href: "/dashboard/security", label: "Keamanan", Icon: Shield },
];

const adminItems = [
  { href: "/admin/dashboard", label: "Dashboard Admin", Icon: Home },
  { href: "/admin/users", label: "Pengguna", Icon: User },
  { href: "/admin/subscriptions", label: "Langganan", Icon: Shield },
  { href: "/admin/payments", label: "Pembayaran", Icon: Film },
  { href: "/admin/devices", label: "Perangkat", Icon: Tv },
  { href: "/admin/reports", label: "Laporan Video", Icon: Flame },
  { href: "/admin/contents", label: "Konten", Icon: Film },
  { href: "/admin/providers", label: "Provider", Icon: Globe },
  { href: "/admin/plans", label: "Paket", Icon: Shield },
  { href: "/admin/api-clipku", label: "API Clipku", Icon: Globe },
  { href: "/admin/settings", label: "Pengaturan Web", Icon: Settings },
  { href: "/admin/seo", label: "SEO", Icon: Search },
  { href: "/admin/payment-settings", label: "Pengaturan Pembayaran", Icon: Settings },
  { href: "/admin/error-logs", label: "Monitoring & Log", Icon: Flame },
];

function navigationFor(pathname: string, role?: string) {
  if (pathname.startsWith("/admin")) {
    if (role === "CONTENT_MANAGER") {
      return adminItems.filter(item => [
        "/admin/dashboard", "/admin/reports", "/admin/contents", "/admin/providers",
        "/admin/api-clipku",
      ].includes(item.href));
    }
    return adminItems;
  }
  if (pathname.startsWith("/dashboard")) return dashboardItems;
  return items;
}

function active(pathname: string, href: string, navigation: NavItem[]) {
  const matched = navigation
    .filter(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  if (matched) return matched === href;
  if (href === "/" || href === "/dashboard") return pathname === href;
  return false;
}

function groupName(pathname: string, href: string) {
  if (pathname.startsWith("/dashboard")) {
    if (href === "/dashboard") return "Ringkasan";
    if (/\/(profile|security|preferences|devices)$/.test(href)) return "Akun & keamanan";
    if (/\/(subscription|payments|invoices)$/.test(href)) return "Langganan & tagihan";
    return "Koleksi saya";
  }
  if (pathname.startsWith("/admin")) {
    if (href === "/admin/dashboard") return "Ringkasan";
    if (/\/(users|devices)$/.test(href)) return "Pengguna & akses";
    if (/\/(subscriptions|payments|plans)$/.test(href)) return "Monetisasi";
    if (/\/(contents|providers|reports)$/.test(href)) return "Konten";
    if (href.includes("/api-clipku")) return "Integrasi API";
    if (/\/(settings|seo|payment-settings)$/.test(href)) return "Konfigurasi";
    return "Monitoring";
  }
  return "Navigasi";
}

function NavigationLinks({ pathname, navigation }: { pathname: string; navigation: NavItem[] }) {
  const groups = navigation.reduce<Record<string, NavItem[]>>((result, item) => {
    const name = groupName(pathname, item.href);
    (result[name] ||= []).push(item);
    return result;
  }, {});
  const grouped = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  return <>{Object.entries(groups).map(([name, group]) => {
    const containsActive = group.some(item => active(pathname, item.href, navigation));
    const links = group.map(({ href, label, Icon }) => <Link
      key={href}
      href={href}
      className={`sidebar-link${active(pathname, href, navigation) ? " active" : ""}`}
      aria-current={active(pathname, href, navigation) ? "page" : undefined}
    ><Icon size={20} className="sidebar-icon" />{label}</Link>);
    if (!grouped || name === "Ringkasan") return <div className="sidebar-group" key={name}>{grouped && <span className="sidebar-group-label">{name}</span>}{links}</div>;
    return <details className="sidebar-group" key={name} open={containsActive}>
      <summary>{name}</summary>
      <div className="sidebar-group-links">{links}</div>
    </details>;
  })}</>;
}

export function SidebarNavigation({ role }: { role?: string }) {
  const pathname = usePathname();
  const navigation = navigationFor(pathname, role);
  return (
    <nav className="sidebar-nav" aria-label="Navigasi utama">
      <NavigationLinks pathname={pathname} navigation={navigation} />
    </nav>
  );
}

export function MobileMenu({ loggedIn, role }: { loggedIn: boolean; role?: string }) {
  const pathname = usePathname();
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role || "");
  const navigation = navigationFor(pathname, role);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return <>
    <button type="button" className="mobile-menu-trigger" aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen(true)}>
      <Menu size={23} />
    </button>
    {open && <div className="mobile-drawer-overlay" onClick={() => setOpen(false)}>
      <aside className="mobile-drawer" aria-label="Menu utama" onClick={event => event.stopPropagation()}>
        <div className="mobile-drawer-head">
          <Link className="brand" href="/">CLIPKU+</Link>
          <button type="button" className="mobile-menu-trigger" aria-label="Tutup menu" onClick={() => setOpen(false)}><X size={23} /></button>
        </div>
        <nav className="sidebar-nav">
          <NavigationLinks pathname={pathname} navigation={navigation} />
        </nav>
        <div className="mobile-drawer-footer">
          {isAdmin && <Link href="/admin/dashboard" className="sidebar-link"><Shield size={20} />Control Center</Link>}
          {isAdmin && <Link href="/admin/settings" className="sidebar-link"><Settings size={20} />Pengaturan web</Link>}
          <Link href={loggedIn ? "/dashboard" : "/login"} className="sidebar-link"><User size={20} />{loggedIn ? "Akun saya" : "Masuk / Daftar"}</Link>
          <Link href="/plans" className="btn">Lihat paket</Link>
        </div>
      </aside>
    </div>}
  </>;
}

export function SearchForm({ compact = false }: { compact?: boolean }) {
  const params = useSearchParams();
  return (
    <form action="/browse" method="GET" className={`search-form${compact ? " search-sidebar" : ""}`}>
      <input
        type="search"
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder={compact ? "Cari drama..." : "Cari..."}
        className="search-input"
        aria-label="Cari judul, genre, atau provider"
      />
      <button type="submit" className="search-btn" aria-label="Cari"><Search size={compact ? 18 : 16} /></button>
    </form>
  );
}
