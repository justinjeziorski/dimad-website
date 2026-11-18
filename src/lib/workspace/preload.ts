"use client";

import { authFetch } from "@/lib/auth/client";
import {
  readWorkspaceCache,
  setWorkspacePreloadStatus,
  WORKSPACE_ENDPOINTS,
  WORKSPACE_INTEGRATION_KEYS,
  writeWorkspaceCache,
  writeWorkspaceEntry,
  type WorkspaceCacheEntry,
  type WorkspaceCacheSnapshot,
  type WorkspacePreloadStatus
} from "@/lib/cache/workspace-data-cache";

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

/** Fetch every workspace integration endpoint and write the session cache. */
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
