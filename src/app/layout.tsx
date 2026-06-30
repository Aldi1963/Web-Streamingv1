import "./globals.css";
import "./fullscreen.css";
import Link from "next/link";
import { User, Crown, Settings, Shield } from "lucide-react";
import { Suspense } from "react";
import { BottomNavigation, MobileMenu, SearchForm, SidebarNavigation } from "@/components/app-navigation";
import { auth } from "@/services/auth-service";
import type { Metadata } from "next";

const appUrl = process.env.APP_URL || "https://drama.clipku.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "Clipku Streaming", template: "%s | Clipku Streaming" },
  description: "Streaming legal dari provider Clipku API",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Clipku Streaming",
    locale: "id_ID",
    url: "/",
  },
  robots: { index: true, follow: true },
};

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await auth.currentUser();
  const isAdmin = Boolean(user && ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(user.role));
  return (
    <html lang="id">
      <body>
        <div className="app-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <Link className="brand" href="/" prefetch={false}>CLIPKU+</Link>

            <Suspense><SearchForm compact /></Suspense>
            <SidebarNavigation />

            <div className="sidebar-section">
              <span className="sidebar-label">Tahun</span>
              <div className="sidebar-years">
                {years.map(y => (
                  <Link key={y} href={`/browse?year=${y}`} className="sidebar-year" prefetch={false}>{y}</Link>
                ))}
              </div>
            </div>

            <div className="sidebar-footer">
              {isAdmin && <Link href="/admin/dashboard" className="sidebar-link" prefetch={false}>
                <Shield size={20} className="sidebar-icon" /> Control Center
              </Link>}
              {isAdmin && <Link href="/admin/settings" className="sidebar-link" prefetch={false}>
                <Settings size={20} className="sidebar-icon" /> Pengaturan Web
              </Link>}
              <Link href={user ? "/dashboard" : "/login"} className="sidebar-link" prefetch={false}>
                <User size={20} className="sidebar-icon" /> {user ? user.name : "Masuk / Daftar"}
              </Link>
              <Link href="/plans" className="btn btn-sm" style={{ width: "100%", justifyContent: "center", gap: 6 }} prefetch={false}>
                <Crown size={16} /> Langganan
              </Link>
            </div>
          </aside>

          {/* Main */}
          <main className="main-content">
            {/* Mobile top bar */}
            <header className="mobile-header">
              <MobileMenu loggedIn={Boolean(user)} isAdmin={isAdmin} />
              <Link className="brand" href="/" prefetch={false}>CLIPKU+</Link>
              <Suspense><SearchForm /></Suspense>
              <Link href={user ? "/dashboard" : "/login"} className="btn btn-sm" prefetch={false}>
                {user ? "Akun" : "Masuk"}
              </Link>
            </header>
            {children}

            {/* Mobile Bottom Nav */}
            <BottomNavigation loggedIn={Boolean(user)} />
          </main>
        </div>
      </body>
    </html>
  );
}
