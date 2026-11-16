"use client";

import { useRef } from "react";
import {
  takeWorkspaceHydration,
  writeWorkspaceEntry,
  type WorkspaceIntegrationKey
} from "@/lib/workspace-data-cache";

/**
 * Returns a one-shot hydration payload from the welcome-screen preload cache.
 * After consumption (or when stale/missing), returns null so the widget fetches normally.
 */
export function useWorkspaceHydration(key: WorkspaceIntegrationKey) {
  const used = useRef(false);
  if (used.current) return null;
  const data = takeWorkspaceHydration(key);
  if (!data) return null;
  used.current = true;
  return data;
}

export function cacheWorkspaceResponse(
  key: WorkspaceIntegrationKey,
  data: Record<string, unknown>,
  ok: boolean,
  status: number
) {
  writeWorkspaceEntry(key, {
    data,
    fetchedAt: Date.now(),
    ok,
    status
  });
}
