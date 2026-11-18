"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { waitForFirebaseToken } from "@/lib/dimad-auth-client";
import {
  bindPlatformSessionPersistence,
  hydratePlatformSnapshot,
  isPlatformSnapshotFresh,
  isPlatformSnapshotStale,
  PLATFORM_SYNC_PHASES,
  readLocalPlatformSnapshot,
  runPlatformSync,
  type PlatformSnapshot,
  type PlatformSyncPhaseId,
  type PlatformSyncProgressEvent
} from "@/lib/cache/platformSyncEngine";
import { perfMark, perfStart } from "@/lib/perf/timing";

export type UsePlatformSyncOptions = {
  /** Start sync automatically after mount (default true). */
  autoStart?: boolean;
  /** Show overlay when cache is missing/stale (default true). */
  showOverlayWhenStale?: boolean;
  /** Force a full sync even if cache is fresh. */
  force?: boolean;
  /** Minimum overlay duration for a polished handoff. */
  minDurationMs?: number;
  uid?: string;
};

export type UsePlatformSyncResult = {
  snapshot: PlatformSnapshot | null;
  phase: PlatformSyncPhaseId;
  detail: string;
  progress: number;
  status: PlatformSyncProgressEvent["status"] | "idle";
  syncing: boolean;
  overlayVisible: boolean;
  fromCache: boolean;
  stale: boolean;
  startSync: (opts?: { force?: boolean }) => Promise<void>;
  dismissOverlay: () => void;
};

export function usePlatformSync(options: UsePlatformSyncOptions = {}): UsePlatformSyncResult {
  const {
    autoStart = true,
    showOverlayWhenStale = true,
    force = false,
    minDurationMs = 1800,
    uid = "user"
  } = options;

  // Keep SSR and first client paint identical — hydrate cache only after mount.
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [phase, setPhase] = useState<PlatformSyncPhaseId>("gateway");
  const [detail, setDetail] = useState(PLATFORM_SYNC_PHASES[0].label);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UsePlatformSyncResult["status"]>("idle");
  const [syncing, setSyncing] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const inflight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  const stale = useMemo(() => isPlatformSnapshotStale(snapshot), [snapshot]);

  useEffect(() => {
    mounted.current = true;
    const unbind = bindPlatformSessionPersistence(uid);
    return () => {
      mounted.current = false;
      unbind();
    };
  }, [uid]);

  // Instant hydrate from localStorage / IndexedDB / legacy caches after mount.
  useEffect(() => {
    let cancelled = false;
    const local = readLocalPlatformSnapshot(uid);
    if (local?.updatedAt) {
      setSnapshot(local);
      setFromCache(true);
    }
    void (async () => {
      const hydrated = await hydratePlatformSnapshot(uid);
      if (cancelled || !hydrated) return;
      setSnapshot(hydrated);
      setFromCache(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const dismissOverlay = useCallback(() => {
    setFadingOut(true);
    window.setTimeout(() => {
      if (!mounted.current) return;
      setOverlayVisible(false);
      setFadingOut(false);
    }, 420);
  }, []);

  const startSync = useCallback(
    async (opts?: { force?: boolean }) => {
      if (inflight.current) return inflight.current;

      const shouldForce = Boolean(opts?.force || force);
      const current = snapshot || readLocalPlatformSnapshot(uid);
      const fresh = isPlatformSnapshotFresh(current);
      perfMark("client.platform.startSync", {
        shouldForce,
        fresh,
        hasSnapshot: Boolean(current?.updatedAt),
        overlayPolicy: showOverlayWhenStale
      });

      if (!shouldForce && fresh && current) {
        setSnapshot(current);
        setStatus("ready");
        setProgress(1);
        setPhase("complete");
        setDetail("Command Center ready");
        setOverlayVisible(false);
        perfMark("client.platform.skipSync", { reason: "fresh_cache" });
        return;
      }

      // Full-screen overlay disabled for dashboard paint — welcome gate owns its own UI.
      if (showOverlayWhenStale && shouldForce && isPlatformSnapshotStale(current)) {
        setOverlayVisible(true);
        setFadingOut(false);
        perfMark("client.platform.overlay.open", { reason: "forced_stale" });
      }

      setSyncing(true);
      setStatus("syncing");
      setProgress(0.04);
      setPhase("gateway");
      setDetail(PLATFORM_SYNC_PHASES[0].label);

      inflight.current = (async () => {
        const span = perfStart("client.platform.runPlatformSync");
        try {
          const token = await waitForFirebaseToken(4000);
          if (token && typeof window !== "undefined") {
            (window as unknown as { __dimadIdToken?: string }).__dimadIdToken = token;
          }
          const result = await runPlatformSync({
            uid,
            token: token || undefined,
            force: shouldForce,
            minDurationMs,
            onProgress: (event) => {
              if (!mounted.current) return;
              setPhase(event.phase);
              setDetail(event.detail);
              setProgress(event.progress);
              setStatus(event.status);
              setFromCache(event.fromCache);
              if (event.snapshot) setSnapshot({ ...event.snapshot });
              perfMark("client.platform.phase", {
                phase: event.phase,
                progress: event.progress,
                overlayVisible
              });
            }
          });
          if (!mounted.current) return;
          setSnapshot(result.snapshot);
          setFromCache(result.fromCache);
          setStatus(result.status);
          setProgress(1);
          setPhase("complete");
          dismissOverlay();
          span.end({ status: result.status, fromCache: result.fromCache });
        } catch {
          if (!mounted.current) return;
          setStatus("partial");
          setDetail("Using last-known secure cache");
          setProgress(1);
          dismissOverlay();
          span.end({ status: "error" });
        } finally {
          if (mounted.current) setSyncing(false);
          inflight.current = null;
        }
      })();

      return inflight.current;
    },
    [dismissOverlay, force, minDurationMs, overlayVisible, showOverlayWhenStale, snapshot, uid]
  );

  useEffect(() => {
    if (!autoStart) return;
    perfMark("client.platform.mount.autoStart");
    const handle = window.setTimeout(() => {
      void startSync({ force });
    }, 0);
    return () => window.clearTimeout(handle);
    // Mount-once platform handshake.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return {
    snapshot,
    phase,
    detail,
    progress,
    status,
    syncing,
    overlayVisible: overlayVisible || fadingOut,
    fromCache,
    stale,
    startSync,
    dismissOverlay
  };
}
