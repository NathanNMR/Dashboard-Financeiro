"use client";

import { useEffect } from "react";

/** Registra o service worker do PWA no cliente, permitindo instalar o app e usá-lo offline. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Falha silenciosa: o dashboard continua funcionando normalmente sem PWA/offline.
      });
    }
  }, []);

  return null;
}
