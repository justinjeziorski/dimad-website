"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FALLBACK_HEADER_IMAGE,
  clearHeaderPhotoFallbackCache,
  resolveHeaderBackground,
  type HeaderPhotoResult
} from "@/lib/headerImage";

export type UseHeaderBackgroundResult = {
  currentSrc: string;
  incomingSrc: string;
  photo: HeaderPhotoResult | null;
  ready: boolean;
  promoteIncoming: (src: string) => void;
};

/**
 * City-first header background with country fallback + crossfade on city change.
 */
export function useHeaderBackground(city: string, country: string): UseHeaderBackgroundResult {
  const [photo, setPhoto] = useState<HeaderPhotoResult | null>(null);
  const [currentSrc, setCurrentSrc] = useState(FALLBACK_HEADER_IMAGE);
  const [incomingSrc, setIncomingSrc] = useState("");
  const [ready, setReady] = useState(false);
  const requestGen = useRef(0);
  const currentSrcRef = useRef(currentSrc);
  currentSrcRef.current = currentSrc;

  useEffect(() => {
    const gen = ++requestGen.current;
    let cancelled = false;

    (async () => {
      // Clear a prior fallback miss for this city so we actually retry Unsplash.
      clearHeaderPhotoFallbackCache(city, country);

      let result: HeaderPhotoResult;
      try {
        result = await resolveHeaderBackground({ city, country });
      } catch (err) {
        console.warn("[header-background] resolve failed", err);
        result = {
          imageUrl: FALLBACK_HEADER_IMAGE,
          matchedLevel: "fallback"
        };
      }

      if (cancelled || gen !== requestGen.current) return;

      setPhoto(result);
      const nextUrl = result.imageUrl || FALLBACK_HEADER_IMAGE;

      if (nextUrl === currentSrcRef.current) {
        setIncomingSrc("");
        setReady(true);
        return;
      }

      setIncomingSrc(nextUrl);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [city, country]);

  const promoteIncoming = useCallback((src: string) => {
    if (!src) return;
    setCurrentSrc(src);
    currentSrcRef.current = src;
    setIncomingSrc((prev) => (prev === src ? "" : prev));
  }, []);

  return { currentSrc, incomingSrc, photo, ready, promoteIncoming };
}
