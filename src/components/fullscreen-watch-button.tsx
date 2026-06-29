"use client";

import { useEffect, useRef, useState } from "react";
import { VideoPlayer } from "./video-player";

export function FullscreenWatchButton({ contentId }: { contentId: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setOpen(false); };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function watch() {
    setOpen(true);
    try { await container.current?.requestFullscreen({ navigationUI: "hide" }); }
    catch { /* Fixed viewport overlay remains available. */ }
  }

  async function close() {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    setOpen(false);
  }

  return <>
    <button className="button" onClick={watch}>▶ Tonton Sekarang</button>
    <div ref={container} className={`watch-overlay ${open ? "open" : ""}`}>
      {open && <>
        <button className="watch-close" onClick={close} aria-label="Tutup player">✕</button>
        <VideoPlayer contentId={contentId} />
      </>}
    </div>
  </>;
}
