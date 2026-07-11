"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    };
    const idleCallback = window.requestIdleCallback?.(register, { timeout: 3000 });
    const fallbackTimer = idleCallback === undefined
      ? window.setTimeout(register, 3000)
      : undefined;

    return () => {
      if (idleCallback !== undefined) window.cancelIdleCallback?.(idleCallback);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };
  }, []);
  return null;
}
