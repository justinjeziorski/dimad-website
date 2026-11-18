"use client";

import { useEffect, useState, type CSSProperties } from "react";

type VisibleBox = { top: number; height: number };

function measureVisibleBox(): VisibleBox {
  const fallback = {
    top: typeof window !== "undefined" ? window.scrollY || 0 : 0,
    height: typeof window !== "undefined" ? window.innerHeight || 800 : 800
  };
  try {
    const frame = window.frameElement as HTMLElement | null;
    if (!frame || window.parent === window) {
      return {
        top: window.scrollY || 0,
        height: Math.max(320, window.innerHeight || 800)
      };
    }
    const rect = frame.getBoundingClientRect();
    const parentH = window.parent.innerHeight || rect.height;
    // Pixels from iframe top to the start of the parent-visible slice.
    const visibleTop = Math.max(0, -rect.top);
    const visibleBottomInParent = Math.min(rect.bottom, parentH);
    const visibleTopInParent = Math.max(rect.top, 0);
    const visibleHeight = Math.max(280, visibleBottomInParent - visibleTopInParent);
    return {
      top: visibleTop,
      height: Math.min(visibleHeight, Math.max(280, rect.height - visibleTop))
    };
  } catch {
    return fallback;
  }
}

/**
 * Overlay geometry that stays centered in the *parent-visible* portion of a
 * tall revenue iframe (content-sized frames break plain position:fixed centering).
 */
export function useIframeCenteredOverlay(active: boolean): CSSProperties {
  const [box, setBox] = useState<VisibleBox>(() =>
    typeof window !== "undefined" ? measureVisibleBox() : { top: 0, height: 800 }
  );

  useEffect(() => {
    if (!active) return;
    const update = () => setBox(measureVisibleBox());
    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    try {
      window.parent.addEventListener("scroll", update, true);
      window.parent.addEventListener("resize", update);
    } catch {
      /* cross-origin */
    }
    const interval = window.setInterval(update, 200);

    // Keep the visible slice in view when opening.
    try {
      window.parent.scrollTo({
        top: Math.max(0, (window.frameElement as HTMLElement | null)?.offsetTop || 0),
        behavior: "smooth"
      });
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      try {
        window.parent.removeEventListener("scroll", update, true);
        window.parent.removeEventListener("resize", update);
      } catch {
        /* ignore */
      }
      window.clearInterval(interval);
    };
  }, [active]);

  return {
    position: "fixed",
    top: box.top,
    left: 0,
    right: 0,
    height: box.height,
    zIndex: 80,
    display: "grid",
    placeItems: "center",
    padding: 16,
    overflow: "auto",
    boxSizing: "border-box"
  };
}
