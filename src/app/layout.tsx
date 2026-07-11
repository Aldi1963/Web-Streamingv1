import "./globals.css";
import "./fullscreen.css";
import "./player-overrides.css";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { NavigationMemory } from "@/components/navigation-memory";
import { PwaRegistration } from "@/components/pwa-registration";
import { auth } from "@/services/auth-service";

export const metadata = {
  title: "Clipku Streaming",
  description: "Streaming legal dari provider Clipku API",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#e50914",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await auth.currentUser();
  return (
    <html lang="id">
      <head>
        <meta name="referrer" content="no-referrer" />
        <link rel="preconnect" href="https://wsrv.nl" />
        <link rel="dns-prefetch" href="https://wsrv.nl" />
      </head>
      <body>
        <PwaRegistration />
        <Suspense fallback={null}>
          <NavigationMemory />
        </Suspense>
        <Suspense fallback={children}>
          <AppShell userName={user?.name} role={user?.role}>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
