"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { getLastContentPath } from "@/components/navigation-memory";

export function WatchBackButton({
  children,
  className,
  style,
  fallback = "/",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  fallback?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => router.push(getLastContentPath(fallback))}
    >
      {children}
    </button>
  );
}
