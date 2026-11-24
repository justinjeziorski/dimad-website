"use client";

import { useEffect, useRef, useState } from "react";
import {
  CITY_BACKDROP_FALLBACK,
  resolveCityBackdrop,
  type ResolvedBackdrop
} from "@/lib/city/backdropCache";

export type UseCityBackdropResult = {
  /** Ready-to-render URL (blob: or http(s)/relative). Empty until first resolve settles. */
  src: string;
  ready: boolean;
  source: ResolvedBackdrop["source"] | null;
};

/**
 * Persistent city backdrop: localStorage meta (7d) + Cache API bytes.
 * Dark gradient should always paint underneath; this only supplies the photo layer.
 */
export function useCityBackdrop(city: string): UseCityBackdropResult {
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<ResolvedBackdrop["source"] | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestGen = useRef(0);

  useEffect(() => {
    const gen = ++requestGen.current;
    let cancelled = false;

    (async () => {
      const result = await resolveCityBackdrop(city);
      if (cancelled || gen !== requestGen.current) {
        if (result.displayUrl.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(result.displayUrl);
          } catch {
            /* ignore */
          }
        }
        return;
      }

      if (objectUrlRef.current && objectUrlRef.current !== result.displayUrl) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch {
          /* ignore */
        }
      }
      objectUrlRef.current = result.displayUrl.startsWith("blob:") ? result.displayUrl : null;
      setSrc(result.displayUrl || CITY_BACKDROP_FALLBACK);
      setSource(result.source);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return { src, ready, source };
}
