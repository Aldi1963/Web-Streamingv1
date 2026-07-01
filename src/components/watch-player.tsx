"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeProgressPosition } from "@/lib/watch-progress";

export function WatchPlayer({
  src,
  sources = [],
  subtitle,
  poster,
  contentId,
  episodeId,
  previousHref,
  nextHref,
  resumeAtSeconds = 0,
  autoplay = true,
  defaultMuted = false,
  playbackSpeed = 1,
  preferredQuality = "auto",
}: {
  src: string;
  sources?: Array<{ label: string; url: string }>;
  subtitle?: string;
  poster?: string;
  contentId: string;
  episodeId?: string;
  previousHref?: string;
  nextHref?: string;
  resumeAtSeconds?: number;
  autoplay?: boolean;
  defaultMuted?: boolean;
  playbackSpeed?: number;
  preferredQuality?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeApplied = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [autoplayNotice, setAutoplayNotice] = useState<number | null>(null);
  const [activeSrc, setActiveSrc] = useState(
    sources.find(source => preferredQuality !== "auto" && source.label.toLowerCase().includes(preferredQuality.toLowerCase()))?.url ?? src,
  );

  useEffect(() => {
    const preferred = sources.find(source =>
      preferredQuality !== "auto" && source.label.toLowerCase().includes(preferredQuality.toLowerCase()),
    );
    resumeApplied.current = false;
    setActiveSrc(preferred?.url ?? src);
  }, [preferredQuality, sources, src]);

  const cancelAutoplay = useCallback((resetNotice = true) => {
    if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    autoplayTimer.current = null;
    if (resetNotice) setAutoplayNotice(null);
  }, []);

  const showControls = useCallback((autoHide = true) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControlsVisible(true);
    if (autoHide) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.setAttribute("referrerpolicy", "no-referrer");
    video.muted = defaultMuted;
    video.volume = 1;
    video.playbackRate = playbackSpeed;
    if (autoplay) {
      void video.play()
        .catch(() => undefined);
    }
    let lastSent = 0;
    const save = (force = false) => {
      if (!video.duration) return;
      const positionSeconds = normalizeProgressPosition(video.currentTime, video.duration);
      if (!force && Math.abs(positionSeconds - lastSent) < 10) return;
      lastSent = positionSeconds;
      void fetch("/api/me/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentId,
          episodeId,
          positionSeconds,
          durationSeconds: Math.floor(video.duration),
        }),
        keepalive: true,
      });
    };
    const handlePause = () => save(true);
    const handleTimeUpdate = () => save();
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);
    const next = () => {
      save(true);
      if (!nextHref || !autoplay) return;
      cancelAutoplay();
      setAutoplayNotice(3);
      setControlsVisible(true);
      let count = 3;
      autoplayTimer.current = setTimeout(function tick() {
        count -= 1;
        if (count <= 0) {
          autoplayTimer.current = null;
          setAutoplayNotice(null);
          location.href = nextHref;
          return;
        }
        setAutoplayNotice(count);
        autoplayTimer.current = setTimeout(tick, 1000);
      }, 1000);
    };
    video.addEventListener("ended", next);
    const restorePosition = () => {
      if (resumeApplied.current || !resumeAtSeconds || resumeAtSeconds <= 0 || !Number.isFinite(video.duration)) return;
      const target = Math.min(Math.max(0, resumeAtSeconds), Math.max(0, video.duration - 1));
      if (target > 0) {
        video.currentTime = target;
        resumeApplied.current = true;
      }
    };
    video.addEventListener("loadedmetadata", restorePosition);
    video.addEventListener("canplay", restorePosition);
    return () => {
      save(true);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", next);
      video.removeEventListener("loadedmetadata", restorePosition);
      video.removeEventListener("canplay", restorePosition);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      cancelAutoplay(false);
    };
  }, [activeSrc, autoplay, cancelAutoplay, contentId, defaultMuted, episodeId, nextHref, playbackSpeed, resumeAtSeconds]);

  return (
    <>
      <video
        ref={ref}
        {...{ referrerPolicy: "no-referrer" }}
        src={activeSrc}
        controls
        autoPlay={autoplay}
        preload="metadata"
        className="watch-video"
        poster={poster}
        playsInline
        onClick={() => { cancelAutoplay(); showControls(true); }}
        onPlay={() => { cancelAutoplay(); showControls(true); }}
        onPause={() => { showControls(false); }}
      >
        {subtitle && <track kind="subtitles" src={subtitle} srcLang="id" label="Indonesia" default />}
        Browser Anda tidak mendukung pemutar video.
      </video>
      {sources.length > 1 && <label className="quality-picker">Kualitas
        <select value={activeSrc} onChange={event => { setActiveSrc(event.target.value); resumeApplied.current = false; }}>
          {sources.map(source => <option key={source.url} value={source.url}>{source.label}</option>)}
        </select>
      </label>}
      <div
        className={`player-episode-controls episode-navigation${controlsVisible ? " visible" : ""}`}
        aria-label="Navigasi episode"
        onClick={event => event.stopPropagation()}
      >
        {previousHref && (
          <Link href={previousHref} className="player-control episode-control" aria-label="Episode sebelumnya">
            <ChevronLeft size={20} /><span>Sebelumnya</span>
          </Link>
        )}
        {nextHref && (
          <Link href={nextHref} className="player-control episode-control" aria-label="Episode berikutnya">
            <span>Berikutnya</span><ChevronRight size={20} />
          </Link>
        )}
      </div>
      {autoplayNotice && nextHref && (
        <div className="player-toast" role="status" aria-live="polite">
          Episode berikutnya dimulai dalam {autoplayNotice} detik
        </div>
      )}
    </>
  );
}
