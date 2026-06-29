"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function WatchlistButton({
  contentId,
  initialSaved = false,
  loggedIn = false,
}: {
  contentId: string;
  initialSaved?: boolean;
  loggedIn?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setBusy(true);
    const next = !saved;
    const response = await fetch("/api/me/watchlist", {
      method: next ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentId }),
    });
    if (response.ok) setSaved(next);
    setBusy(false);
  }

  return (
    <button
      type="button"
      className={`wl-btn${saved ? " saved" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
    >
      <Heart size={17} fill={saved ? "currentColor" : "none"} />
      {busy ? "Memproses…" : saved ? "Tersimpan" : "Simpan"}
    </button>
  );
}
