"use client";

import Link from "next/link";
import {
  Bookmark,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Languages,
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from "react";
import { normalizeProgressPosition } from "@/lib/watch-progress";
import { proxyMediaUrl } from "@/lib/stream-utils";

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary") => Promise<void>;
  unlock?: () => void;
};
type FullscreenOrientationMode = "landscape" | "portrait" | "none";
type SheetMode = "peek" | "expanded";
type SettingsView = "main" | "quality" | "audio" | "subtitle" | "speed";
const CONTROL_HIDE_DELAY_MS = 1600;

function getScreenOrientation() {
  if (typeof screen === "undefined" || !screen.orientation) return null;
  return screen.orientation as LockableScreenOrientation;
}

async function lockFullscreenOrientation(mode: FullscreenOrientationMode) {
  if (mode === "none") return;
  const orientation = getScreenOrientation();
  if (!orientation?.lock) return;
  await orientation.lock(mode).catch(() => undefined);
}

function unlockFullscreenOrientation() {
  const orientation = getScreenOrientation();
  orientation?.unlock?.();
}

export function WatchPlayer({
  src,
  sources = [],
  subtitle,
  poster,
  contentTitle,
  contentId,
  episodeId,
  episodes = [],
  currentEpisodeNumber,
  previousHref,
  nextHref,
  resumeAtSeconds = 0,
  autoplay = true,
  autoNext = true,
  defaultMuted = false,
  playbackSpeed = 1,
  preferredQuality = "auto",
  providerSlug,
  saveProgress = true,
  fullscreenOrientation = "landscape",
}: {
  src: string;
  sources?: Array<{ label: string; url: string; language?: string }>;
  subtitle?: string;
  poster?: string;
  contentTitle?: string;
  contentId: string;
  episodeId?: string;
  episodes?: Array<{ id: string; episodeNumber: number; title: string | null }>;
  currentEpisodeNumber?: number;
  previousHref?: string;
  nextHref?: string;
  resumeAtSeconds?: number;
  autoplay?: boolean;
  autoNext?: boolean;
  defaultMuted?: boolean;
  playbackSpeed?: number;
  preferredQuality?: string;
  providerSlug?: string;
  saveProgress?: boolean;
  fullscreenOrientation?: FullscreenOrientationMode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const subtitleTrackRef = useRef<HTMLTrackElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const sheetDragRef = useRef<{ pointerId: number; startY: number; startOffset: number; lastY: number; lastTime: number; velocity: number } | null>(null);
  const sheetCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const switchRequestIdRef = useRef(0);
  const resumeApplied = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [episodeOpen, setEpisodeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("main");
  const [shareOpen, setShareOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("peek");
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [sheetClosing, setSheetClosing] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(defaultMuted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState(subtitle);
  const [captionsEnabled, setCaptionsEnabled] = useState(Boolean(subtitle));
  const [speed, setSpeed] = useState(playbackSpeed);
  const [episodeNumber, setEpisodeNumber] = useState(currentEpisodeNumber ?? 1);
  const [episodeStateId, setEpisodeStateId] = useState(episodeId);
  const [switchingEpisode, setSwitchingEpisode] = useState<number | null>(null);
  const [switchError, setSwitchError] = useState("");
  const [availableSources, setAvailableSources] = useState(sources);
  const [activeSrc, setActiveSrc] = useState(
    sources.find(source => preferredQuality !== "auto" && source.label.toLowerCase().includes(preferredQuality.toLowerCase()))?.url ?? src,
  );
  const activeSource = availableSources.find(source => source.url === activeSrc);
  const activeLanguage = activeSource?.language;
  const languages = [...new Set(availableSources.map(source => source.language).filter((value): value is string => Boolean(value)))];
  const visibleQualitySources = activeLanguage
    ? availableSources.filter(source => source.language === activeLanguage)
    : availableSources;
  const activeQualityLabel = `${activeLanguage ? `${activeLanguage} · ` : ""}${activeSource?.label ?? "Otomatis"}`;
  const portraitDramaMode = fullscreenOrientation === "portrait";
  const portraitPlayerMode = portraitDramaMode && fullscreen;
  const portraitSheetOpen = portraitPlayerMode && (episodeOpen || settingsOpen || shareOpen);
  const draggableSheetMode = portraitPlayerMode || mobileViewport;
  const draggableSheetOpen = draggableSheetMode && (episodeOpen || settingsOpen || shareOpen);
  const hasPreviousEpisode = episodes.some(item => item.episodeNumber === episodeNumber - 1);
  const hasNextEpisode = episodes.some(item => item.episodeNumber === episodeNumber + 1);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = String(total % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let cancelled = false;
    let destroyHls: (() => void) | undefined;

    const isHls = /\.m3u8(?:[?&#]|$)/i.test(activeSrc);
    const canPlayHlsNatively = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (isHls) {
      video.removeAttribute("src");
      video.load();
      void import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
          });
          destroyHls = () => hls.destroy();
          hls.attachMedia(video);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            if (!cancelled) hls.loadSource(activeSrc);
          });
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!cancelled && autoplay) void video.play().catch(() => undefined);
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal || cancelled) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else hls.destroy();
          });
          return;
        }
        if (canPlayHlsNatively) {
          video.src = activeSrc;
          if (autoplay) void video.play().catch(() => undefined);
        }
      });
    setCurrentTime(0);
    setDuration(0);

    } else {
      video.currentTime = 0;
      video.src = activeSrc;
      video.load();
      if (autoplay) void video.play().catch(() => undefined);
    }

    return () => {
      cancelled = true;
      destroyHls?.();
    };
  }, [activeSrc, autoplay]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 760px)");
    const sync = () => setMobileViewport(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const preferred = sources.find(source =>
      preferredQuality !== "auto" && source.label.toLowerCase().includes(preferredQuality.toLowerCase()),
    );
    resumeApplied.current = false;
    setActiveSrc(preferred?.url ?? src);
  }, [preferredQuality, sources, src]);

  const cancelAutoplay = useCallback(() => undefined, []);

  const showControls = useCallback((autoHide = true) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControlsVisible(true);
    if (autoHide) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROL_HIDE_DELAY_MS);
    }
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.setAttribute("referrerpolicy", "no-referrer");
    video.muted = defaultMuted;
    video.volume = 1;
    video.playbackRate = speed;
    let lastSent = 0;
    const save = (force = false) => {
      if (!saveProgress) return;
      if (!video.duration) return;
      const positionSeconds = normalizeProgressPosition(video.currentTime, video.duration);
      if (!force && Math.abs(positionSeconds - lastSent) < 10) return;
      lastSent = positionSeconds;
      void fetch("/api/me/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentId,
          episodeId: episodeStateId,
          positionSeconds,
          durationSeconds: Math.floor(video.duration),
        }),
        keepalive: true,
      });
    };
    const handlePause = () => save(true);
    const handlePlay = () => setPlaying(true);
    const handlePaused = () => setPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      save();
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setCurrentTime(video.currentTime || 0);
    };
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePaused);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    const next = () => {
      save(true);
      if (!autoNext) return;
      const nextEpisode = episodes.find(item => item.episodeNumber === episodeNumber + 1);
      if (!nextEpisode) return;
      cancelAutoplay();
      void switchEpisode(nextEpisode.episodeNumber);
    };
    video.addEventListener("ended", next);
    const restorePosition = () => {
      const isInitialEpisode = episodeNumber === (currentEpisodeNumber ?? 1) && episodeStateId === episodeId;
      if (!isInitialEpisode || resumeApplied.current || !resumeAtSeconds || resumeAtSeconds <= 0 || !Number.isFinite(video.duration)) return;
      const target = Math.min(Math.max(0, resumeAtSeconds), Math.max(0, video.duration - 1));
      if (target > 0) {
        video.currentTime = target;
        setCurrentTime(target);
        resumeApplied.current = true;
      }
    };
    video.addEventListener("loadedmetadata", restorePosition);
    video.addEventListener("canplay", restorePosition);
    return () => {
      save(true);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePaused);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", next);
      video.removeEventListener("loadedmetadata", restorePosition);
      video.removeEventListener("canplay", restorePosition);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      cancelAutoplay();
    };
  }, [activeSrc, autoNext, cancelAutoplay, contentId, currentEpisodeNumber, defaultMuted, episodeId, episodeNumber, episodeStateId, episodes, resumeAtSeconds, saveProgress, speed]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed]);

  const positionSubtitleCues = useCallback(() => {
    const track = subtitleTrackRef.current?.track;
    const cues = track?.cues;
    if (!cues) return;
    Array.from(cues).forEach(cue => {
      const positioned = cue as VTTCue;
      if (typeof positioned.line !== "undefined") {
        positioned.snapToLines = false;
        positioned.line = providerSlug === "netshort" ? 66 : 76;
        positioned.position = 50;
        positioned.size = 86;
        positioned.align = "center";
      }
    });
  }, [providerSlug]);

  useEffect(() => {
    setAvailableSources(sources);
  }, [sources]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    Array.from(video.textTracks).forEach(track => {
      track.mode = captionsEnabled ? "showing" : "disabled";
    });
    positionSubtitleCues();
  }, [captionsEnabled, activeSubtitle, positionSubtitleCues]);

  useEffect(() => {
    setActiveSubtitle(subtitle);
    setCaptionsEnabled(Boolean(subtitle));
  }, [subtitle]);

  useEffect(() => {
    const handleFullscreen = () => {
      const active = document.fullscreenElement === shellRef.current;
      setFullscreen(active);
      if (active) void lockFullscreenOrientation(fullscreenOrientation);
      else {
        unlockFullscreenOrientation();
        setShareOpen(false);
        if (portraitDramaMode) {
          setEpisodeOpen(false);
          setSettingsOpen(false);
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreen);
      unlockFullscreenOrientation();
    };
  }, [fullscreenOrientation]);

  function togglePlay() {
    if (Date.now() < suppressClickUntilRef.current) return;
    const video = ref.current;
    if (!video) return;
    cancelAutoplay();
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
    showControls(true);
  }

  function seek(value: number) {
    const video = ref.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = value;
    setCurrentTime(value);
    showControls(true);
  }

  function seekBy(seconds: number) {
    const video = ref.current;
    if (!video || !Number.isFinite(video.duration)) return;
    seek(Math.min(Math.max(0, video.currentTime + seconds), video.duration));
  }

  function toggleMute() {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    showControls(true);
  }

  async function shareVideo() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = contentTitle || `Episode ${episodeNumber}`;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  function openShareSheet() {
    clearSheetCloseTimer();
    setSheetClosing(false);
    setShareOpen(true);
    setEpisodeOpen(false);
    setSettingsOpen(false);
    setSheetMode("peek");
    setSheetDragOffset(0);
  }

  function openEpisodeSheet() {
    clearSheetCloseTimer();
    setSheetClosing(false);
    setEpisodeOpen(true);
    setSettingsOpen(false);
    setSettingsView("main");
    setShareOpen(false);
    setSheetMode("peek");
    setSheetDragOffset(0);
  }

  function openSettingsPanel(view: SettingsView = "main") {
    clearSheetCloseTimer();
    setSheetClosing(false);
    setSettingsOpen(true);
    setSettingsView(view);
    setEpisodeOpen(false);
    setShareOpen(false);
    setSheetMode("peek");
    setSheetDragOffset(0);
  }

  function clearSheetCloseTimer() {
    if (!sheetCloseTimer.current) return;
    clearTimeout(sheetCloseTimer.current);
    sheetCloseTimer.current = null;
  }

  function finishClosePortraitSheet() {
    setEpisodeOpen(false);
    setSettingsOpen(false);
    setShareOpen(false);
    setSheetMode("peek");
    setSheetDragOffset(0);
    setSheetClosing(false);
  }

  function closePortraitSheet(animated = true) {
    clearSheetCloseTimer();
    if (!animated || !draggableSheetMode) {
      finishClosePortraitSheet();
      return;
    }
    setSheetClosing(true);
    setSheetDragOffset(typeof window === "undefined" ? 720 : Math.max(window.innerHeight, 720));
    sheetCloseTimer.current = setTimeout(() => {
      sheetCloseTimer.current = null;
      finishClosePortraitSheet();
    }, 220);
  }

  function getSheetStyle(): CSSProperties | undefined {
    if (!draggableSheetMode) return undefined;
    const grow = Math.max(0, -sheetDragOffset);
    const drop = Math.max(0, sheetDragOffset);
    return {
      "--sheet-drag-grow": `${grow}px`,
      transform: `translateY(${drop}px)`,
    } as CSSProperties;
  }

  function handleSheetPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!draggableSheetMode || sheetClosing) return;
    const panel = event.currentTarget.closest(".portrait-bottom-sheet");
    if (!(panel instanceof HTMLElement)) return;
    const now = performance.now();
    sheetDragRef.current = { pointerId: event.pointerId, startY: event.clientY, startOffset: sheetDragOffset, lastY: event.clientY, lastTime: now, velocity: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    panel.classList.add("is-dragging");
  }

  function handleSheetPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const delta = event.clientY - drag.startY;
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastTime = now;
    setSheetDragOffset(Math.min(260, Math.max(-180, drag.startOffset + delta)));
  }

  function handleSheetPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientY - drag.startY;
    const velocity = drag.velocity;
    sheetDragRef.current = null;
    const panel = event.currentTarget.closest(".portrait-bottom-sheet");
    if (panel instanceof HTMLElement) panel.classList.remove("is-dragging");
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (delta > 104 || velocity > 0.7) {
      closePortraitSheet();
      return;
    }
    setSheetDragOffset(0);
    if (delta < -56) {
      setSheetMode("expanded");
      return;
    }
    if (delta > 42) setSheetMode("peek");
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    showControls(true);
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!portraitPlayerMode || !start) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (episodeOpen || settingsOpen || shareOpen) return;
    if (absY >= 70 && absY >= absX * 1.25) {
      if (dy < 0 && hasNextEpisode) void switchEpisode(episodeNumber + 1);
      if (dy > 0 && hasPreviousEpisode) void switchEpisode(episodeNumber - 1);
      return;
    }
    if (absX < 18 && absY < 18) {
      const now = Date.now();
      const lastTap = lastTapRef.current;
      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
      if (lastTap && now - lastTap.time < 320 && Math.abs(touch.clientX - lastTap.x) < 44 && Math.abs(touch.clientY - lastTap.y) < 44) {
        const width = shellRef.current?.clientWidth || window.innerWidth;
        if (touch.clientX < width * 0.45) {
          suppressClickUntilRef.current = now + 450;
          seekBy(-10);
          return;
        }
        if (touch.clientX > width * 0.55) {
          suppressClickUntilRef.current = now + 450;
          seekBy(10);
        }
      }
    }
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      unlockFullscreenOrientation();
    } else {
      await shell.requestFullscreen().catch(() => undefined);
      await lockFullscreenOrientation(fullscreenOrientation);
    }
    showControls(false);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select") return;
      }
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (!fullscreen) return;
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        togglePlay();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-10);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(10);
        return;
      }
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMute();
        return;
      }
      if (event.key === "PageUp" && hasPreviousEpisode) {
        event.preventDefault();
        void switchEpisode(episodeNumber - 1);
        return;
      }
      if (event.key === "PageDown" && hasNextEpisode) {
        event.preventDefault();
        void switchEpisode(episodeNumber + 1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [episodeNumber, fullscreen, hasNextEpisode, hasPreviousEpisode, toggleFullscreen]);

  async function switchEpisode(targetEpisodeNumber: number) {
    if (!Number.isFinite(targetEpisodeNumber) || targetEpisodeNumber < 1 || switchingEpisode === targetEpisodeNumber) return;
    const target = episodes.find(item => item.episodeNumber === targetEpisodeNumber);
    if (!target) return;
    const requestId = ++switchRequestIdRef.current;
    setSwitchError("");
    setSwitchingEpisode(targetEpisodeNumber);
    try {
      const response = await fetch(`/api/watch/${encodeURIComponent(contentId)}?episode=${targetEpisodeNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (switchRequestIdRef.current !== requestId) return;
      if (!response.ok) throw new Error(result.message || "Gagal memuat episode.");
      if (!result?.url || typeof result.url !== "string") throw new Error("Episode berikutnya belum tersedia.");
      const nextSource = proxyMediaUrl(String(result.url), { contentId, episode: targetEpisodeNumber });
      const nextSources: Array<{ label: string; url: string; language?: string }> = Array.isArray(result.sources)
        ? result.sources.filter((source: unknown): source is { label: string; url: string; language?: string } => {
            if (!source || typeof source !== "object") return false;
            const row = source as Record<string, unknown>;
            return typeof row.label === "string" && typeof row.url === "string";
          })
        : [];
      const preferredNextSource = nextSources.find(source => source.language === activeLanguage && source.label === activeSource?.label)
        ?? nextSources.find(source => source.language === activeLanguage)
        ?? nextSources[0];
      const nextSubtitle = typeof result.subtitle === "string" && result.subtitle ? result.subtitle : undefined;
      const video = ref.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      setCurrentTime(0);
      setDuration(0);
      setEpisodeNumber(targetEpisodeNumber);
      setEpisodeStateId(target.id);
      setActiveSubtitle(nextSubtitle);
      setCaptionsEnabled(Boolean(nextSubtitle));
      setAvailableSources(nextSources.length ? nextSources : [{ label: "Otomatis", url: nextSource }]);
      resumeApplied.current = false;
      setEpisodeOpen(false);
      setSettingsOpen(false);
      setShareOpen(false);
      setActiveSrc(preferredNextSource?.url ?? nextSource);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("ep", String(targetEpisodeNumber));
      window.history.replaceState({}, "", nextUrl.toString());
    } catch (error) {
      if (switchRequestIdRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : "Gagal memuat episode.";
      setSwitchError(message.includes("Playback URL belum ditemukan") ? "Episode berikutnya belum tersedia." : message);
    } finally {
      if (switchRequestIdRef.current === requestId) setSwitchingEpisode(null);
    }
  }

  return (
    <div
      ref={shellRef}
      className={`watch-player-shell${controlsVisible ? " controls-visible" : ""}${portraitPlayerMode ? " portrait-drama-player" : ""}`}
      onMouseMove={() => showControls(true)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={ref}
        {...{ referrerPolicy: "no-referrer" }}
        crossOrigin={activeSrc.startsWith("/api/") ? "anonymous" : undefined}
        autoPlay={autoplay}
        controls={false}
        preload="metadata"
        className="watch-video"
        poster={poster}
        playsInline
        onClick={togglePlay}
        onPlay={() => { cancelAutoplay(); showControls(true); }}
        onPause={() => { showControls(false); }}
      >
        {activeSubtitle && (
          <track
            ref={subtitleTrackRef}
            key={activeSubtitle}
            kind="subtitles"
            src={activeSubtitle}
            srcLang="id"
            label="Indonesia"
            default
            onLoad={positionSubtitleCues}
          />
        )}
        Browser Anda tidak mendukung pemutar video.
      </video>

      {portraitPlayerMode && (
        <>
          <div className="portrait-player-top">
            <button type="button" className="portrait-player-back" onClick={() => history.back()} aria-label="Kembali">
              <ChevronLeft size={24} />
            </button>
            <strong>{contentTitle || "Clipku"}</strong>
            <span>EP.{episodeNumber}</span>
          </div>

          <div className="portrait-player-side" aria-label="Aksi video">
            <button type="button" onClick={() => undefined} aria-label="Simpan video">
              <Bookmark size={24} />
              <span>Simpan</span>
            </button>
            <button type="button" onClick={openEpisodeSheet} aria-label="Pilih episode">
              <ListVideo size={24} />
              <span>Episode</span>
            </button>
            <button
              type="button"
              onClick={() => openSettingsPanel()}
              aria-label="Pengaturan player"
            >
              <Settings size={24} />
              <span>Setelan</span>
            </button>
            <button type="button" onClick={openShareSheet} aria-label="Bagikan video">
              <Share2 size={24} />
              <span>Bagikan</span>
            </button>
          </div>

          {switchingEpisode ? <div className="portrait-switching">Memuat EP.{switchingEpisode}</div> : null}
          {controlsVisible ? (
            <div className="portrait-seek-hints" aria-hidden="true">
              <span>−10</span>
              <span>+10</span>
            </div>
          ) : null}
        </>
      )}

      <button type="button" className="player-big-toggle" onClick={togglePlay} aria-label={playing ? "Jeda" : "Putar"}>
        {playing ? <Pause size={42} fill="currentColor" /> : <Play size={42} fill="currentColor" />}
      </button>

      <div className="player-top-actions">
        <button type="button" className="player-icon-btn" onClick={() => { episodeOpen ? closePortraitSheet() : openEpisodeSheet(); }} aria-label="Daftar episode">
          <ListVideo size={20} />
        </button>
        <button type="button" className="player-icon-btn" onClick={() => { settingsOpen ? closePortraitSheet() : openSettingsPanel(); }} aria-label="Pengaturan player">
          <Settings size={20} />
        </button>
      </div>

      <div
        className={`player-episode-controls episode-navigation${controlsVisible ? " visible" : ""}`}
        aria-label="Navigasi episode"
        onClick={event => event.stopPropagation()}
      >
        {episodes.some(item => item.episodeNumber === episodeNumber - 1) && (
          <button type="button" className="player-control episode-control" aria-label="Episode sebelumnya" onClick={() => void switchEpisode(episodeNumber - 1)}>
            <ChevronLeft size={20} /><span>Sebelumnya</span>
          </button>
        )}
        {episodes.some(item => item.episodeNumber === episodeNumber + 1) && (
          <button type="button" className="player-control episode-control" aria-label="Episode berikutnya" onClick={() => void switchEpisode(episodeNumber + 1)}>
            <span>Berikutnya</span><ChevronRight size={20} />
          </button>
        )}
      </div>

      <div className={`player-quick-actions${controlsVisible ? " visible" : ""}`} aria-label="Kontrol cepat">
        {episodes.some(item => item.episodeNumber === episodeNumber - 1) && (
          <button type="button" className="player-round-btn" aria-label="Episode sebelumnya" onClick={() => void switchEpisode(episodeNumber - 1)}>
            <ChevronLeft size={22} />
          </button>
        )}
        <button type="button" className="player-round-btn" onClick={() => seekBy(-10)} aria-label="Mundur 10 detik">
          <RotateCcw size={22} /><span>10</span>
        </button>
        <button type="button" className="player-round-btn" onClick={() => seekBy(10)} aria-label="Maju 10 detik">
          <RotateCw size={22} /><span>10</span>
        </button>
        {episodes.some(item => item.episodeNumber === episodeNumber + 1) && (
          <button type="button" className="player-round-btn" aria-label="Episode berikutnya" onClick={() => void switchEpisode(episodeNumber + 1)}>
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      <div className={`player-bottom-controls${controlsVisible ? " visible" : ""}`}>
        <div className="player-time-row">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, duration)}
            step={1}
            value={Math.min(currentTime, duration || currentTime)}
            onChange={event => seek(Number(event.target.value))}
            aria-label="Posisi video"
          />
          <span>{formatTime(duration)}</span>
        </div>
        <div className="player-command-row">
          <button type="button" className="player-icon-btn" onClick={togglePlay} aria-label={playing ? "Jeda" : "Putar"}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button type="button" className="player-icon-btn" onClick={() => seekBy(-10)} aria-label="Mundur 10 detik">
            <RotateCcw size={19} />
          </button>
          <button type="button" className="player-icon-btn" onClick={() => seekBy(10)} aria-label="Maju 10 detik">
            <RotateCw size={19} />
          </button>
          <button type="button" className="player-icon-btn" onClick={toggleMute} aria-label={muted ? "Aktifkan suara" : "Matikan suara"}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          {episodes.some(item => item.episodeNumber === episodeNumber - 1) && (
            <button type="button" className="player-pill-btn" aria-label="Episode sebelumnya" onClick={() => void switchEpisode(episodeNumber - 1)}>
              <ChevronLeft size={17} /> Prev
            </button>
          )}
          {episodes.some(item => item.episodeNumber === episodeNumber + 1) && (
            <button type="button" className="player-pill-btn" aria-label="Episode berikutnya" onClick={() => void switchEpisode(episodeNumber + 1)}>
              Next <ChevronRight size={17} />
            </button>
          )}
          <button type="button" className="player-pill-btn" onClick={() => { settingsOpen ? closePortraitSheet() : openSettingsPanel(); }}>
            <Settings size={17} /> {activeQualityLabel}
          </button>
          {activeSubtitle && (
            <button type="button" className={`player-icon-btn${captionsEnabled ? " active" : ""}`} onClick={() => setCaptionsEnabled(value => !value)} aria-label="Subtitle">
              <Captions size={20} />
            </button>
          )}
          <button type="button" className="player-icon-btn" onClick={toggleFullscreen} aria-label={fullscreen ? "Keluar fullscreen" : "Fullscreen"}>
            {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {draggableSheetOpen && <button type="button" className={`portrait-sheet-backdrop${sheetClosing ? " closing" : ""}`} onClick={() => closePortraitSheet()} aria-label="Tutup panel" />}

      {episodeOpen && (
        <div
          className={`player-panel player-episode-panel portrait-bottom-sheet ${sheetMode}${sheetClosing ? " closing" : ""}`}
          style={getSheetStyle()}
        >
          <div
            className="portrait-sheet-drag-zone"
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={handleSheetPointerUp}
            aria-hidden="true"
          />
          <div className="player-panel-head">
            <strong>Pilih Episode</strong>
            <span>{episodeNumber ?? "-"} / {episodes.length || "-"}</span>
          </div>
          <div className="player-episode-grid">
            {episodes.map(episode => (
              <button
                key={episode.id}
                type="button"
                className={episode.episodeNumber === episodeNumber ? "active" : ""}
                aria-current={episode.episodeNumber === episodeNumber ? "page" : undefined}
                disabled={switchingEpisode === episode.episodeNumber}
                onClick={() => void switchEpisode(episode.episodeNumber)}
              >
                {switchingEpisode === episode.episodeNumber ? "..." : episode.episodeNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          className={`player-panel player-settings-panel portrait-bottom-sheet ${sheetMode}${sheetClosing ? " closing" : ""}`}
          style={getSheetStyle()}
        >
          <div
            className="portrait-sheet-drag-zone"
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={handleSheetPointerUp}
            aria-hidden="true"
          />
          <div className="player-panel-head player-settings-head">
            {settingsView !== "main" && (
              <button type="button" className="player-settings-back" onClick={() => setSettingsView("main")} aria-label="Kembali ke pengaturan">
                <ChevronLeft size={18} />
              </button>
            )}
            <strong>
              {settingsView === "main" && "Pengaturan"}
              {settingsView === "quality" && "Kualitas"}
              {settingsView === "audio" && "Bahasa Audio"}
              {settingsView === "subtitle" && "Subtitle"}
              {settingsView === "speed" && "Kecepatan"}
            </strong>
          </div>

          {settingsView === "main" && (
            <div className="player-settings-menu">
              <button type="button" className="player-setting-row" onClick={() => setSettingsView("quality")}>
                <span><Gauge size={16} /> Kualitas</span>
                <small>{activeQualityLabel}</small>
                <ChevronRight size={17} />
              </button>
              <button type="button" className="player-setting-row" onClick={() => setSettingsView("audio")} disabled={languages.length <= 1}>
                <span><Languages size={16} /> Bahasa Audio</span>
                <small>{activeLanguage ?? "Tidak tersedia"}</small>
                <ChevronRight size={17} />
              </button>
              <button type="button" className="player-setting-row" onClick={() => setSettingsView("subtitle")}>
                <span><Captions size={16} /> Subtitle</span>
                <small>{activeSubtitle ? (captionsEnabled ? "Indonesia" : "Mati") : "Tidak tersedia"}</small>
                <ChevronRight size={17} />
              </button>
              <button type="button" className="player-setting-row" onClick={() => setSettingsView("speed")}>
                <span><Gauge size={16} /> Kecepatan</span>
                <small>{speed}x</small>
                <ChevronRight size={17} />
              </button>
            </div>
          )}

          {settingsView === "quality" && (
            <div className="player-setting-group compact-list">
              {visibleQualitySources.map(source => (
                <button
                  key={source.url}
                  type="button"
                  className={source.url === activeSrc ? "active" : ""}
                  onClick={() => { setActiveSrc(source.url); resumeApplied.current = false; }}
                >
                  {source.label}
                  {source.url === activeSrc && <Check size={15} />}
                </button>
              ))}
            </div>
          )}

          {settingsView === "audio" && (
            <div className="player-setting-group compact-list">
              {languages.length > 1 ? languages.map(language => (
                <button
                  key={language}
                  type="button"
                  className={language === activeLanguage ? "active" : ""}
                  onClick={() => {
                    const next = availableSources.find(source => source.language === language && source.label === activeSource?.label)
                      ?? availableSources.find(source => source.language === language);
                    if (next) {
                      setActiveSrc(next.url);
                      resumeApplied.current = false;
                    }
                  }}
                >
                  {language}{language === activeLanguage && <Check size={15} />}
                </button>
              )) : <p className="player-setting-empty">Bahasa audio tidak tersedia untuk sumber ini.</p>}
            </div>
          )}

          {settingsView === "subtitle" && (
            <div className="player-setting-group compact-list">
              <button type="button" className={!captionsEnabled ? "active" : ""} onClick={() => setCaptionsEnabled(false)}>
                Mati {!captionsEnabled && <Check size={15} />}
              </button>
              {activeSubtitle ? (
                <button type="button" className={captionsEnabled ? "active" : ""} onClick={() => setCaptionsEnabled(true)}>
                  Indonesia {captionsEnabled && <Check size={15} />}
                </button>
              ) : <p className="player-setting-empty">Subtitle tidak tersedia untuk episode ini.</p>}
            </div>
          )}

          {settingsView === "speed" && (
            <div className="player-setting-group compact-list">
              {[0.75, 1, 1.25, 1.5, 2].map(value => (
                <button key={value} type="button" className={speed === value ? "active" : ""} onClick={() => setSpeed(value)}>
                  {value}x {speed === value && <Check size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {shareOpen && (
        <div
          className={`player-panel portrait-share-panel portrait-bottom-sheet ${sheetMode}${sheetClosing ? " closing" : ""}`}
          style={getSheetStyle()}
        >
          <div
            className="portrait-sheet-drag-zone"
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={handleSheetPointerUp}
            aria-hidden="true"
          />
          <div className="player-panel-head">
            <strong>Bagikan Video</strong>
          </div>
          <div className="portrait-share-grid">
            <a href={`https://wa.me/?text=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`} target="_blank" rel="noreferrer">
              <span className="portrait-share-icon whatsapp">WA</span>
              WhatsApp
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`} target="_blank" rel="noreferrer">
              <span className="portrait-share-icon facebook">f</span>
              Facebook
            </a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`} target="_blank" rel="noreferrer">
              <span className="portrait-share-icon twitter">X</span>
              Twitter
            </a>
            <button type="button" onClick={() => void shareVideo()}>
              <span className="portrait-share-icon copy">⧉</span>
              Salin Link
            </button>
          </div>
        </div>
      )}

          {switchError && (
        <div className="player-toast" role="status" aria-live="polite">{switchError}</div>
      )}

    </div>
  );
}
