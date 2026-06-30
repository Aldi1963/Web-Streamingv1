"use client";

import Link from "next/link";
import { Crown, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BottomNavigation, MobileMenu, SearchForm, SidebarNavigation } from "@/components/app-navigation";

const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index);

export function AppShell({
  children,
  userName,
  role,
}: {
  children: React.ReactNode;
  userName?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const isolated = pathname.startsWith("/admin/") || pathname.startsWith("/watch/");
  if (isolated) return children;

  return <div className="app-layout">
    <aside className="sidebar site-sidebar">
      <Link className="brand" href="/" prefetch={false}>CLIPKU+</Link>
      <Suspense><SearchForm compact /></Suspense>
      <SidebarNavigation role={role} />
      <div className="sidebar-section">
        <span className="sidebar-label">Tahun</span>
        <div className="sidebar-years">
          {years.map((year) => <Link key={year} href={`/browse?year=${year}`} className="sidebar-year" prefetch={false}>{year}</Link>)}
        </div>
      </div>
      <div className="sidebar-footer">
        <Link href={userName ? "/dashboard" : "/login"} className="sidebar-link" prefetch={false}>
          <User size={20} className="sidebar-icon" /> {userName || "Masuk / Daftar"}
        </Link>
        <Link href="/plans" className="btn btn-sm" style={{ width: "100%", justifyContent: "center", gap: 6 }} prefetch={false}>
          <Crown size={16} /> Langganan
        </Link>
      </div>
    </aside>
    <main className="main-content">
      <header className="mobile-header">
        <MobileMenu loggedIn={Boolean(userName)} role={role} />
        <Link className="brand" href="/" prefetch={false}>CLIPKU+</Link>
        <Suspense><SearchForm /></Suspense>
        <Link href={userName ? "/dashboard" : "/login"} className="btn btn-sm" prefetch={false}>
          {userName ? "Akun" : "Masuk"}
        </Link>
      </header>
      {children}
      <BottomNavigation loggedIn={Boolean(userName)} />
    </main>
  </div>;
}
