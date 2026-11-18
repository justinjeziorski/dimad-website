"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { authFetch } from "@/lib/dimad-auth-client";
import {
  readWorkspaceCache,
  readWorkspaceEntry,
  setWorkspacePreloadStatus,
  takeWorkspaceHydration,
  WORKSPACE_ENDPOINTS,
  WORKSPACE_INTEGRATION_KEYS,
  writeWorkspaceCache,
  writeWorkspaceEntry,
  type WorkspaceCacheEntry,
  type WorkspaceCacheSnapshot,
  type WorkspaceIntegrationKey,
  type WorkspacePreloadStatus
} from "@/lib/workspace-data-cache";

export { takeWorkspaceHydration };

type WorkspaceDataContextValue = {
  snapshot: WorkspaceCacheSnapshot;
  preloadStatus: WorkspacePreloadStatus;
  preloadAllWorkspaceData: () => Promise<WorkspaceCacheSnapshot>;
  getEntry: (key: WorkspaceIntegrationKey) => WorkspaceCacheEntry | null;
  invalidate: (key?: WorkspaceIntegrationKey) => void;
};

const WorkspaceDataContext = createContext<WorkspaceDataContextValue | null>(null);

function postPreloadStatus(status: WorkspacePreloadStatus, detail?: string) {
  if (typeof window === "undefined") return;
  const payload = { type: "dimad-workspace-preload", status, detail: detail || "" };
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, window.location.origin);
    }
    window.postMessage(payload, window.location.origin);
  } catch {
    /* ignore */
  }
}

export async function preloadAllWorkspaceData(): Promise<WorkspaceCacheSnapshot> {
  setWorkspacePreloadStatus("syncing");
  postPreloadStatus("syncing", "Syncing live metrics…");

  const results = await Promise.allSettled(
    WORKSPACE_INTEGRATION_KEYS.map(async (key) => {
      const path = WORKSPACE_ENDPOINTS[key];
      const { res, data } = await authFetch(path);
      const entry: WorkspaceCacheEntry = {
        data: (data || {}) as Record<string, unknown>,
        fetchedAt: Date.now(),
        ok: res.ok,
        status: res.status
      };
      writeWorkspaceEntry(key, entry);
      return { key, entry };
    })
  );

  const snap = readWorkspaceCache();
  const settled = results.filter((r) => r.status === "fulfilled").length;
  const preloadStatus: WorkspacePreloadStatus =
    settled === 0 ? "partial" : settled < WORKSPACE_INTEGRATION_KEYS.length ? "partial" : "ready";
  const next = { ...snap, preloadStatus, updatedAt: Date.now() };
  writeWorkspaceCache(next);
  postPreloadStatus(
    preloadStatus,
    preloadStatus === "ready" ? "All systems synced" : "Metrics partially synced"
  );
  return next;
}

function emptyWorkspaceSnapshot(): WorkspaceCacheSnapshot {
  return { entries: {}, preloadStatus: "idle", updatedAt: 0 };
}

export function WorkspaceDataProvider({ children }: { children: ReactNode }) {
  // Empty on SSR + first client paint; hydrate from sessionStorage after mount.
  const [snapshot, setSnapshot] = useState<WorkspaceCacheSnapshot>(emptyWorkspaceSnapshot);
  const inflight = useRef<Promise<WorkspaceCacheSnapshot> | null>(null);

  useEffect(() => {
    setSnapshot(readWorkspaceCache());
  }, []);

  const preload = useCallback(async () => {
    if (inflight.current) return inflight.current;
    inflight.current = preloadAllWorkspaceData()
      .then((next) => {
        setSnapshot(next);
        return next;
      })
      .finally(() => {
        inflight.current = null;
      });
    return inflight.current;
  }, []);

  const getEntry = useCallback((key: WorkspaceIntegrationKey) => readWorkspaceEntry(key), []);

  const invalidate = useCallback((key?: WorkspaceIntegrationKey) => {
    const snap = readWorkspaceCache();
    if (!key) {
      const cleared = { entries: {}, preloadStatus: "idle" as const, updatedAt: Date.now() };
      writeWorkspaceCache(cleared);
      setSnapshot(cleared);
      return;
    }
    const entries = { ...snap.entries };
    delete entries[key];
    const next = { ...snap, entries, updatedAt: Date.now() };
    writeWorkspaceCache(next);
    setSnapshot(next);
  }, []);

  const value = useMemo<WorkspaceDataContextValue>(
    () => ({
      snapshot,
      preloadStatus: snapshot.preloadStatus,
      preloadAllWorkspaceData: preload,
      getEntry,
      invalidate
    }),
    [snapshot, preload, getEntry, invalidate]
  );

  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

export function useWorkspaceData() {
  const ctx = useContext(WorkspaceDataContext);
  if (!ctx) {
    return {
      snapshot: readWorkspaceCache(),
      preloadStatus: readWorkspaceCache().preloadStatus as WorkspacePreloadStatus,
      preloadAllWorkspaceData,
      getEntry: readWorkspaceEntry,
      invalidate: () => undefined
    } satisfies WorkspaceDataContextValue;
  }
  return ctx;
}

