"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Film, Flame, Globe, Home, Menu, Search, Tv, User, X } from "lucide-react";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/browse", label: "Browse", Icon: Search },
  { href: "/popular", label: "Populer", Icon: Flame },
  { href: "/short-drama", label: "Short Drama", mobileLabel: "Drama", Icon: Tv },
  { href: "/movies", label: "Movie", Icon: Film },
  { href: "/drakor", label: "Drakor", Icon: Globe },
];

function active(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarNavigation() {
  const pathname = usePathname();
  return (
    <nav className="sidebar-nav" aria-label="Navigasi utama">
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`sidebar-link${active(pathname, href) ? " active" : ""}`}
          aria-current={active(pathname, href) ? "page" : undefined}
        >
          <Icon size={20} className="sidebar-icon" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileMenu({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
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
          {items.map(({ href, label, Icon }) => <Link key={href} href={href} className={`sidebar-link${active(pathname, href) ? " active" : ""}`}>
            <Icon size={20} className="sidebar-icon" />{label}
          </Link>)}
        </nav>
        <div className="mobile-drawer-footer">
          <Link href={loggedIn ? "/dashboard" : "/login"} className="sidebar-link"><User size={20} />{loggedIn ? "Akun saya" : "Masuk / Daftar"}</Link>
          <Link href="/plans" className="btn">Lihat paket</Link>
        </div>
      </aside>
    </div>}
  </>;
}

export function BottomNavigation({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const visible = [items[0], items[1], items[2], items[4]];
  return (
    <nav className="bottom-nav" aria-label="Navigasi mobile">
      {visible.map(({ href, mobileLabel, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`bottom-nav-item${active(pathname, href) ? " active" : ""}`}
          aria-current={active(pathname, href) ? "page" : undefined}
        >
          <Icon size={20} /><span>{mobileLabel ?? label}</span>
        </Link>
      ))}
      <Link
        href={loggedIn ? "/dashboard" : "/login"}
        className={`bottom-nav-item${pathname.startsWith("/dashboard") || pathname === "/login" ? " active" : ""}`}
      >
        <User size={20} /><span>Akun</span>
      </Link>
    </nav>
  );
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
