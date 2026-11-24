"use client";

import { useEffect } from "react";
import {
  THEME_STORAGE_KEY,
  applyDocumentTheme,
  resolveThemeFromLocation,
  type AppTheme
} from "@/lib/theme/bootstrap";

function asTheme(value: unknown): AppTheme {
  return value === "light" ? "light" : "dark";
}

/** Keeps React iframes / routes in sync with dashboard theme via storage + postMessage. */
export default function ThemeSync() {
  useEffect(() => {
    // Prefer ?theme= from parent paintFrame, then storage.
    applyDocumentTheme(resolveThemeFromLocation());
    try {
      window.parent?.postMessage({ type: "dimad-theme-request" }, "*");
    } catch {
      /* top-level or blocked */
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      // Ignore storage when URL explicitly pins theme.
      try {
        const q = new URLSearchParams(window.location.search).get("theme");
        if (q === "light" || q === "dark") return;
      } catch {
        /* continue */
      }
      applyDocumentTheme(asTheme(event.newValue));
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== "dimad-theme") return;
      applyDocumentTheme(asTheme(data.theme));
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
