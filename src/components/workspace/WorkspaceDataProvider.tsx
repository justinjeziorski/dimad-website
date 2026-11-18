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
import {
  readWorkspaceCache,
  readWorkspaceEntry,
  takeWorkspaceHydration,
  writeWorkspaceCache,
  type WorkspaceCacheEntry,
  type WorkspaceCacheSnapshot,
  type WorkspaceIntegrationKey,
  type WorkspacePreloadStatus
} from "@/lib/cache/workspace-data-cache";
import { preloadAllWorkspaceData } from "@/lib/workspace/preload";

export { preloadAllWorkspaceData };

export { takeWorkspaceHydration };

type WorkspaceDataContextValue = {
  snapshot: WorkspaceCacheSnapshot;
  preloadStatus: WorkspacePreloadStatus;
  preloadAllWorkspaceData: () => Promise<WorkspaceCacheSnapshot>;
  getEntry: (key: WorkspaceIntegrationKey) => WorkspaceCacheEntry | null;
  invalidate: (key?: WorkspaceIntegrationKey) => void;
};

const WorkspaceDataContext = createContext<WorkspaceDataContextValue | null>(null);

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

