export type WorkspaceIntegrationKey =
  | "stripe"
  | "shopify"
  | "lemon"
  | "gumroad"
  | "patreon"
  | "youtube"
  | "x"
  | "mailerlite"
  | "plaid";

export type WorkspacePreloadStatus = "idle" | "syncing" | "ready" | "partial";

export type WorkspaceCacheEntry = {
  data: Record<string, unknown>;
  fetchedAt: number;
  ok: boolean;
  status: number;
};

export type WorkspaceCacheSnapshot = {
  entries: Partial<Record<WorkspaceIntegrationKey, WorkspaceCacheEntry>>;
  preloadStatus: WorkspacePreloadStatus;
  updatedAt: number;
};

export const WORKSPACE_CACHE_KEY = "dimad_workspace_data_v1";
export const WORKSPACE_CACHE_TTL_MS = 5 * 60 * 1000;

export const WORKSPACE_ENDPOINTS: Record<WorkspaceIntegrationKey, string> = {
  stripe: "/api/integrations/stripe/metrics",
  shopify: "/api/shopify/data?range=week",
  lemon: "/api/lemonsqueezy/data",
  gumroad: "/api/gumroad/data",
  patreon: "/api/patreon/data",
  youtube: "/api/youtube/data",
  x: "/api/x/data",
  mailerlite: "/api/mailerlite/data",
  plaid: "/api/plaid/data"
};

export const WORKSPACE_INTEGRATION_KEYS = Object.keys(WORKSPACE_ENDPOINTS) as WorkspaceIntegrationKey[];

function emptySnapshot(): WorkspaceCacheSnapshot {
  return { entries: {}, preloadStatus: "idle", updatedAt: 0 };
}

export function readWorkspaceCache(): WorkspaceCacheSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = sessionStorage.getItem(WORKSPACE_CACHE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as WorkspaceCacheSnapshot;
    if (!parsed || typeof parsed !== "object") return emptySnapshot();
    return {
      entries: parsed.entries || {},
      preloadStatus: parsed.preloadStatus || "idle",
      updatedAt: Number(parsed.updatedAt || 0)
    };
  } catch {
    return emptySnapshot();
  }
}

export function writeWorkspaceCache(next: WorkspaceCacheSnapshot) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function setWorkspacePreloadStatus(status: WorkspacePreloadStatus) {
  const snap = readWorkspaceCache();
  writeWorkspaceCache({ ...snap, preloadStatus: status, updatedAt: Date.now() });
}

export function writeWorkspaceEntry(key: WorkspaceIntegrationKey, entry: WorkspaceCacheEntry) {
  const snap = readWorkspaceCache();
  writeWorkspaceCache({
    ...snap,
    entries: { ...snap.entries, [key]: entry },
    updatedAt: Date.now()
  });
}

export function readWorkspaceEntry(key: WorkspaceIntegrationKey): WorkspaceCacheEntry | null {
  const entry = readWorkspaceCache().entries[key];
  if (!entry || !entry.fetchedAt) return null;
  if (Date.now() - entry.fetchedAt > WORKSPACE_CACHE_TTL_MS) return null;
  return entry;
}

export function workspaceEntryIsFresh(entry: WorkspaceCacheEntry | null | undefined) {
  if (!entry?.fetchedAt) return false;
  return Date.now() - entry.fetchedAt <= WORKSPACE_CACHE_TTL_MS;
}

/** Prefer fresh workspace cache; return null when missing/stale so callers can fetch. */
export function takeWorkspaceHydration(key: WorkspaceIntegrationKey): Record<string, unknown> | null {
  const entry = readWorkspaceEntry(key);
  if (!entry) return null;
  return entry.data;
}
