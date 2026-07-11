"use client";

import { useEffect, useRef } from "react";

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

function getScreenOrientation() {
  if (typeof screen === "undefined" || !screen.orientation) return null;
  return screen.orientation as LockableScreenOrientation;
}

export function AnimeVideoPlayer({
  source,
  poster,
}: {
  source: string;
  poster?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const lockLandscape = () => {
      if (document.fullscreenElement === video) {
        void getScreenOrientation()?.lock?.("landscape").catch(() => undefined);
      } else {
        getScreenOrientation()?.unlock?.();
      }
    };
    document.addEventListener("fullscreenchange", lockLandscape);
    video.addEventListener("webkitbeginfullscreen", lockLandscape);
    video.addEventListener("webkitendfullscreen", lockLandscape);
    return () => {
      document.removeEventListener("fullscreenchange", lockLandscape);
      video.removeEventListener("webkitbeginfullscreen", lockLandscape);
      video.removeEventListener("webkitendfullscreen", lockLandscape);
      getScreenOrientation()?.unlock?.();
    };
  }, []);

  return (
    <video
      ref={ref}
      className="anime-player"
      src={source}
      controls
      playsInline
      preload="metadata"
      poster={poster}
    />
  );
}
