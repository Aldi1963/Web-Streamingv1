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
  autoplay = true,
  defaultMuted = true,
  playbackSpeed = 1,
  subtitleUrl,
}: {
  src: string;
  poster?: string;
  contentId: string;
  episodeId?: string;
  previousHref?: string;
  nextHref?: string;
  resumeAtSeconds?: number;
  autoplay?: boolean;
  defaultMuted?: boolean;
  playbackSpeed?: number;
  subtitleUrl?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeApplied = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(defaultMuted);
  const [buffering, setBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
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
    video.muted = defaultMuted;
    video.playbackRate = Math.min(2, Math.max(.5, playbackSpeed));
    if (autoplay) void video.play().catch(() => {
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
  }, [autoplay, cancelAutoplay, contentId, defaultMuted, episodeId, nextHref, playbackSpeed, resumeAtSeconds]);

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

  async function reportPlayback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setReporting(true);
    const response = await fetch("/api/me/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, episodeId, category: form.get("category"), detail: form.get("detail") || undefined }),
    });
    const result = await response.json();
    setReporting(false);
    setReportMessage(result.message || "Laporan diproses.");
    if (response.ok) setReportOpen(false);
    setTimeout(() => setReportMessage(""), 4000);
  }

  return (
    <>
      <video
        ref={ref}
        src={src}
        controls
        autoPlay={autoplay}
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
        {subtitleUrl && <track kind="subtitles" src={subtitleUrl} srcLang="id" label="Indonesia" default />}
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
      <button type="button" className="player-report" onClick={() => setReportOpen(true)}>Laporkan video</button>
      {reportOpen && <div className="dialog-overlay" role="presentation" onClick={() => setReportOpen(false)}>
        <form className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="report-title" onSubmit={reportPlayback} onClick={event => event.stopPropagation()}>
          <h2 id="report-title">Laporkan masalah video</h2>
          <label>Jenis masalah<select name="category" required><option value="VIDEO_ERROR">Video tidak dapat diputar</option><option value="AUDIO">Masalah audio</option><option value="SUBTITLE">Masalah subtitle</option><option value="WRONG_EPISODE">Episode tidak sesuai</option><option value="OTHER">Lainnya</option></select></label>
          <label>Detail<textarea name="detail" maxLength={1000} rows={4} placeholder="Jelaskan masalah yang terjadi…" /></label>
          <div className="dialog-actions"><button type="button" className="btn btn-secondary" onClick={() => setReportOpen(false)}>Batal</button><button className="btn" disabled={reporting}>{reporting ? "Mengirim…" : "Kirim laporan"}</button></div>
        </form>
      </div>}
      {reportMessage && <div className="player-toast" role="status">{reportMessage}</div>}
      {autoplayNotice && nextHref && (
        <div className="player-toast" role="status" aria-live="polite">
          Episode berikutnya dimulai dalam {autoplayNotice} detik
        </div>
      )}
    </>
  );
}
