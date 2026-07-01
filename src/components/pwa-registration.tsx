"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let reloading = false;
      const reloadOnUpdate = () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", reloadOnUpdate);
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(registration => registration.update());
      return () => navigator.serviceWorker.removeEventListener("controllerchange", reloadOnUpdate);
    }
  }, []);
  return null;
}
