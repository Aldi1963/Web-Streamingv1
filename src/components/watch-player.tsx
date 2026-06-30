"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, LoaderCircle, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeProgressPosition } from "@/lib/watch-progress";

export function WatchPlayer({
  src,
  poster,
  contentId,
  episodeId,
  previousHref,
  nextHref,
  resumeAtSeconds = 0,
}: {
  src: string;
  poster?: string;
  contentId: string;
  episodeId?: string;
  previousHref?: string;
  nextHref?: string;
  resumeAtSeconds?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeApplied = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [autoplayNotice, setAutoplayNotice] = useState<number | null>(null);

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
    video.muted = true;
    void video.play().catch(() => {
      // Browser mobile sering menahan autoplay sampai ada interaksi user.
    });
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
      if (!nextHref) return;
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
  }, [cancelAutoplay, contentId, episodeId, nextHref, resumeAtSeconds]);

  function seek(seconds: number) {
    const video = ref.current;
    if (!video) return;
    const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
    showControls(true);
  }

  function togglePlayback() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {
        // Refresh the media request after a transient CDN/network failure.
        video.load();
        void video.play().catch(() => undefined);
      });
      showControls(true);
    } else {
      video.pause();
      showControls(false);
    }
  }

  function toggleMuted() {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    showControls(true);
  }

  function retryPlayback() {
    const video = ref.current;
    if (!video) return;
    setPlaybackError(null);
    setBuffering(true);
    video.load();
    void video.play().catch(() => setPlaybackError("Video belum dapat diputar. Periksa koneksi lalu coba lagi."));
  }

  return (
    <>
      <video
        ref={ref}
        src={src}
        controls
        autoPlay
        muted={muted}
        preload="metadata"
        className="watch-video"
        poster={poster}
        playsInline
        onClick={() => { cancelAutoplay(); showControls(true); }}
        onPlay={() => { setPlaying(true); cancelAutoplay(); showControls(true); }}
        onPause={() => { setPlaying(false); showControls(false); }}
        onPlaying={() => { setBuffering(false); setPlaybackError(null); }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onError={() => { setBuffering(false); setPlaybackError("Video gagal dimuat dari sumber."); }}
      >
        Browser Anda tidak mendukung pemutar video.
      </video>
      <div
        className={`player-episode-controls${controlsVisible ? " visible" : ""}`}
        aria-label="Kontrol episode dan waktu"
        onClick={event => event.stopPropagation()}
      >
        {previousHref ? (
          <Link href={previousHref} className="player-control episode-control" aria-label="Episode sebelumnya">
            <ChevronLeft size={20} /><span>Sebelumnya</span>
          </Link>
        ) : (
          <button className="player-control episode-control" disabled aria-label="Tidak ada episode sebelumnya">
            <ChevronLeft size={20} /><span>Sebelumnya</span>
          </button>
        )}
        <button type="button" className="player-control seek-control" onClick={() => seek(-10)} aria-label="Mundur 10 detik">
          <RotateCcw size={21} /><span>10</span>
        </button>
        <button type="button" className="player-control playback-control" onClick={togglePlayback} aria-label={playing ? "Jeda" : "Putar"}>
          {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
        </button>
        <button type="button" className="player-control seek-control" onClick={toggleMuted} aria-label={muted ? "Aktifkan suara" : "Matikan suara"}>
          {muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
        </button>
        <button type="button" className="player-control seek-control" onClick={() => seek(10)} aria-label="Maju 10 detik">
          <RotateCw size={21} /><span>10</span>
        </button>
        {nextHref ? (
          <Link href={nextHref} className="player-control episode-control" aria-label="Episode berikutnya">
            <span>Berikutnya</span><ChevronRight size={20} />
          </Link>
        ) : (
          <button className="player-control episode-control" disabled aria-label="Tidak ada episode berikutnya">
            <span>Berikutnya</span><ChevronRight size={20} />
          </button>
        )}
      </div>
      {buffering && !playbackError && (
        <div className="player-status" role="status" aria-label="Memuat video">
          <LoaderCircle size={30} className="player-spinner" />
        </div>
      )}
      {playbackError && (
        <div className="player-status player-status-error" role="alert">
          <p>{playbackError}</p>
          <button type="button" className="btn btn-sm" onClick={retryPlayback}>Coba lagi</button>
        </div>
      )}
      {muted && !playbackError && (
        <button type="button" className="player-unmute" onClick={toggleMuted}>
          <Volume2 size={17} /> Aktifkan suara
        </button>
      )}
      {autoplayNotice && nextHref && (
        <div className="player-toast" role="status" aria-live="polite">
          Episode berikutnya dimulai dalam {autoplayNotice} detik
        </div>
      )}
    </>
  );
}
