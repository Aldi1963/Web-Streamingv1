"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

export function WatchTools({ contentId, episode }: { contentId: string; episode: number }) {
  const [message, setMessage] = useState("");
  async function report() {
    const reason = prompt("Jelaskan masalah video:");
    if (!reason) return;
    const response = await fetch("/api/reports", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentId, episode, reason }),
    });
    setMessage((await response.json()).message);
  }
  return <div className="watch-tools">
    <button type="button" className="btn btn-ghost btn-sm" onClick={report} aria-label="Laporkan masalah video">
      <Flag size={15} /> <span className="watch-report-label">Laporkan video</span>
    </button>
    {message && <span>{message}</span>}
  </div>;
}
