"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, Clock3, Film, Flame, Globe, History, Home, Menu, ReceiptText, Search, Settings, Shield, SlidersHorizontal, Smartphone, Tv, User, X } from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

type NavItem = { href: string; label: string; Icon: LucideIcon; mobileLabel?: string };
type SearchSuggestion = {
  id: string;
  title: string;
  slug: string;
  posterUrl: string | null;
  providerName: string;
  episodeCount: number | null;
};

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/katalog?tab=terbaru", label: "Terbaru", Icon: Clock3 },
  { href: "/katalog?tab=popular", label: "Populer", Icon: Flame },
  { href: "/movies", label: "Movie", Icon: Film },
  { href: "/anime", label: "Anime", Icon: Tv },
  { href: "/drakor", label: "Drakor", Icon: Globe },
  { href: "/docs", label: "Docs", Icon: BookOpen },
];

const dashboardItems = [
  { href: "/dashboard", label: "Ringkasan", Icon: Home },
  { href: "/dashboard/subscription", label: "Langganan", Icon: Shield },
  { href: "/dashboard/payments", label: "Pembayaran", Icon: ReceiptText },
  { href: "/dashboard/history", label: "Riwayat", Icon: History },
  { href: "/dashboard/devices", label: "Perangkat", Icon: Smartphone },
  { href: "/dashboard/preferences", label: "Pengaturan", Icon: SlidersHorizontal },
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
  { href: "/admin/monetization", label: "Monetisasi", Icon: Shield },
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

function active(pathname: string, href: string, navigation: NavItem[], currentTab?: string | null) {
  if (href.startsWith("/katalog?")) {
    const targetTab = new URLSearchParams(href.split("?")[1] ?? "").get("tab");
    return pathname === "/katalog" && targetTab === (currentTab || "rekomendasi");
  }
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
    if (/\/(subscription|payments)$/.test(href)) return "Langganan & tagihan";
    if (/\/(devices|preferences)$/.test(href)) return "Akun & keamanan";
    return "Aktivitas";
  }
  if (pathname.startsWith("/admin")) {
    if (href === "/admin/dashboard") return "Ringkasan";
    if (/\/(users|devices)$/.test(href)) return "Pengguna & akses";
    if (/\/(subscriptions|payments|plans|monetization)$/.test(href)) return "Monetisasi";
    if (/\/(contents|providers|reports)$/.test(href)) return "Konten";
    if (href.includes("/api-clipku")) return "Integrasi API";
    if (/\/(settings|seo|payment-settings)$/.test(href)) return "Konfigurasi";
    return "Monitoring";
  }
  return "Navigasi";
}

function NavigationLinks({ pathname, navigation }: { pathname: string; navigation: NavItem[] }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const groups = navigation.reduce<Record<string, NavItem[]>>((result, item) => {
    const name = groupName(pathname, item.href);
    (result[name] ||= []).push(item);
    return result;
  }, {});
  const grouped = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  return <>{Object.entries(groups).map(([name, group]) => {
    const containsActive = group.some(item => active(pathname, item.href, navigation, currentTab));
    const links = group.map(({ href, label, Icon }) => <Link
      key={href}
      href={href}
      className={`sidebar-link${active(pathname, href, navigation, currentTab) ? " active" : ""}`}
      aria-current={active(pathname, href, navigation, currentTab) ? "page" : undefined}
    ><Icon size={20} className="sidebar-icon" />{label}</Link>);
    if (!grouped || name === "Ringkasan" || pathname.startsWith("/dashboard")) {
      return <div className="sidebar-group" key={name}>{grouped && <span className="sidebar-group-label">{name}</span>}{links}</div>;
    }
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
          {loggedIn && <LogoutButton />}
          <Link href="/plans" className="btn">Lihat paket</Link>
        </div>
      </aside>
    </div>}
  </>;
}

export function BottomNavigation({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const currentTab = useSearchParams().get("tab");
  const visible: NavItem[] = [items[0], items[1], items[2], items[4]];
  return <nav className="bottom-nav" aria-label="Navigasi mobile">
    {visible.map(({ href, label, mobileLabel, Icon }) => <Link
      key={href}
      href={href}
      className={`bottom-nav-item${active(pathname, href, items, currentTab) ? " active" : ""}`}
      aria-current={active(pathname, href, items, currentTab) ? "page" : undefined}
    >
      <Icon size={20} /><span>{mobileLabel ?? label}</span>
    </Link>)}
    <Link
      href={loggedIn ? "/dashboard" : "/login"}
      className={`bottom-nav-item${pathname.startsWith("/dashboard") || pathname === "/login" ? " active" : ""}`}
    >
      <User size={20} /><span>Akun</span>
    </Link>
  </nav>;
}

export function SearchForm({ compact = false }: { compact?: boolean }) {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanQuery = deferredQuery.trim();
  const showPanel = focused && query.trim().length >= 2;
  const allResultsHref = `/katalog?tab=terbaru&q=${encodeURIComponent(query.trim())}`;

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  useEffect(() => {
    if (cleanQuery.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/contents?q=${encodeURIComponent(cleanQuery)}&limit=5&sort=popular&type=short-drama`, {
        signal: controller.signal,
      })
        .then((response) => response.ok ? response.json() : [])
        .then((data) => setSuggestions(Array.isArray(data) ? data.slice(0, 5) : []))
        .catch((error) => {
          if (error?.name !== "AbortError") setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cleanQuery]);

  const openPanel = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setFocused(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setFocused(false), 240);
  };

  return (
    <form
      action="/katalog"
      method="GET"
      className={`search-form${compact ? " search-sidebar" : ""}`}
      onFocus={openPanel}
      onBlur={scheduleClose}
    >
      <input type="hidden" name="tab" value="terbaru" />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={compact ? "Cari drama..." : "Cari..."}
        className="search-input"
        aria-label="Cari judul, genre, atau provider"
        autoComplete="off"
      />
      <button type="submit" className="search-btn" aria-label="Cari"><Search size={compact ? 18 : 16} /></button>
      {showPanel && (
        <div className="search-suggest-panel" onMouseDown={(event) => event.preventDefault()}>
          {loading ? (
            <div className="search-suggest-status">Mencari drama...</div>
          ) : suggestions.length ? (
            <>
              <div className="search-suggest-list">
                {suggestions.map((item) => (
                  <Link
                    href={`/drama/${item.slug}`}
                    className="search-suggest-item"
                    key={item.id}
                    prefetch={false}
                    onClick={() => setFocused(false)}
                  >
                    <span className="search-suggest-poster">
                      {item.posterUrl ? <img src={item.posterUrl} alt="" loading="lazy" decoding="async" /> : <Film size={17} />}
                    </span>
                    <span className="search-suggest-copy">
                      <strong>{item.title}</strong>
                      <small>{item.providerName}{item.episodeCount ? ` - ${item.episodeCount} eps` : ""}</small>
                    </span>
                  </Link>
                ))}
              </div>
              <Link className="search-suggest-all" href={allResultsHref} prefetch={false} onClick={() => setFocused(false)}>
                <Search size={15} />
                Lihat semua hasil
              </Link>
            </>
          ) : (
            <div className="search-suggest-status">Tidak ada hasil cepat.</div>
          )}
        </div>
      )}
    </form>
  );
}
