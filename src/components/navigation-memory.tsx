"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const LAST_CONTENT_PATH = "clipku:last-content-path";

function isStoredPath(path: string) {
  return Boolean(path) && !path.startsWith("/watch/") && !path.startsWith("/api/");
}

export function NavigationMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isStoredPath(pathname)) return;
    const query = searchParams.toString();
    sessionStorage.setItem(LAST_CONTENT_PATH, `${pathname}${query ? `?${query}` : ""}`);
  }, [pathname, searchParams]);

  return null;
}

export function getLastContentPath(fallback = "/") {
  if (typeof window === "undefined") return fallback;
  const stored = sessionStorage.getItem(LAST_CONTENT_PATH);
  return stored && isStoredPath(stored) ? stored : fallback;
}
