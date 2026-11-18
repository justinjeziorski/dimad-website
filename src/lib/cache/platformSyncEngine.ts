/**
 * Platform-wide last-known-state cache.
 * Fast path: localStorage (<100ms). Durable path: IndexedDB + Firestore.
 */

import { adaptLivePayloads } from "@/lib/revenue/adapters";
import { perfMark, perfStart, perfTime } from "@/lib/perf/timing";
import { readLocalLedgerCache, writeLocalLedgerCache } from "@/lib/revenue/ledgerCache";
import {
  readWorkspaceCache,
  writeWorkspaceCache,
  type WorkspaceCacheEntry,
  type WorkspaceCacheSnapshot,
  type WorkspaceIntegrationKey
} from "@/lib/workspace-data-cache";

export const PLATFORM_CACHE_LS_KEY = "dimad_platform_snapshot_v1";
export const PLATFORM_CACHE_IDB_NAME = "dimad_platform_cache";
export const PLATFORM_CACHE_IDB_STORE = "snapshots";
export const PLATFORM_CACHE_IDB_KEY = "current";

/** Fresh enough to skip the full-screen overlay. */
export const PLATFORM_FRESH_MS = 5 * 60 * 1000;
/** Stale after this — show sync overlay and refresh. */
export const PLATFORM_STALE_MS = 18 * 60 * 60 * 1000;
export const PLATFORM_MODULE_TIMEOUT_MS = 3000;

export type PlatformSyncPhaseId =
  | "gateway"
  | "ledgers"
  | "markets"
  | "integrations"
  | "workspace"
  | "complete";

export type PlatformSyncPhase = {
  id: PlatformSyncPhaseId;
  label: string;
  weight: number;
};

export const PLATFORM_SYNC_PHASES: PlatformSyncPhase[] = [
  { id: "gateway", label: "Establishing secure gateway session…", weight: 0.12 },
  { id: "ledgers", label: "Synchronizing encrypted financial ledgers…", weight: 0.28 },
  { id: "markets", label: "Updating market feed tickers…", weight: 0.2 },
  { id: "integrations", label: "Refreshing integration handshakes…", weight: 0.25 },
  { id: "workspace", label: "Finalizing workspace state…", weight: 0.15 },
  { id: "complete", label: "Command Center ready", weight: 0 }
];

export type PlatformTicker = {
  symbol: string;
  price: number | null;
  change: number | null;
  percent: number | null;
};

export type PlatformRevenueTotals = {
  gross: number;
  net: number;
  expenses: number;
  profit: number;
  entryCount: number;
};

export type PlatformIntegrationStatus = {
  key: string;
  connected: boolean;
  label?: string;
};

export type PlatformModuleCache = {
  ok: boolean;
  fetchedAt: number;
  data: Record<string, unknown>;
  warning?: string;
};

export type PlatformSnapshot = {
  version: 1;
  uid: string;
  updatedAt: number;
  closedAt?: number;
  revenueTotals: PlatformRevenueTotals | null;
  tickers: PlatformTicker[];
  balances: {
    plaidConnected: boolean;
    institutionName: string;
  };
  integrations: PlatformIntegrationStatus[];
  modules: Partial<Record<string, PlatformModuleCache>>;
  workspace?: WorkspaceCacheSnapshot;
  environment?: {
    city?: string;
    timezone?: string;
    weatherSummary?: string;
  };
};

export type PlatformSyncProgressEvent = {
  type: "dimad-platform-sync";
  phase: PlatformSyncPhaseId;
  detail: string;
  progress: number;
  status: "syncing" | "ready" | "partial" | "error";
  fromCache: boolean;
  snapshot?: PlatformSnapshot | null;
};

function emptySnapshot(uid = "user"): PlatformSnapshot {
  return {
    version: 1,
    uid,
    updatedAt: 0,
    revenueTotals: null,
    tickers: [],
    balances: { plaidConnected: false, institutionName: "" },
    integrations: [],
    modules: {}
  };
}

export function isPlatformSnapshotFresh(snap: PlatformSnapshot | null | undefined, now = Date.now()) {
  if (!snap?.updatedAt) return false;
  return now - snap.updatedAt <= PLATFORM_FRESH_MS;
}

export function isPlatformSnapshotStale(snap: PlatformSnapshot | null | undefined, now = Date.now()) {
  if (!snap?.updatedAt) return true;
  return now - snap.updatedAt > PLATFORM_STALE_MS;
}

export function readLocalPlatformSnapshot(uid = "user"): PlatformSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLATFORM_CACHE_LS_KEY);
    if (!raw) return hydrateFromLegacyCaches(uid);
    const parsed = JSON.parse(raw) as PlatformSnapshot;
    if (!parsed || parsed.version !== 1) return hydrateFromLegacyCaches(uid);
    if (parsed.uid && parsed.uid !== uid && parsed.uid !== "user" && uid !== "user") {
      return hydrateFromLegacyCaches(uid);
    }
    return parsed;
  } catch {
    return hydrateFromLegacyCaches(uid);
  }
}

/** Seed a usable snapshot from existing revenue/workspace caches for sub-100ms paint. */
export function hydrateFromLegacyCaches(uid = "user"): PlatformSnapshot | null {
  if (typeof window === "undefined") return null;
  const ledger = readLocalLedgerCache(uid);
  const workspace = readWorkspaceCache();
  if (!ledger?.entries?.length && !workspace.updatedAt) return null;

  let gross = 0;
  let net = 0;
  let expenses = 0;
  for (const row of ledger?.entries || []) {
    if (row.type === "REVENUE") {
      gross += row.amount || 0;
      net += (row.amount || 0) - (row.feeAmount || 0);
    } else if (row.type === "EXPENSE" && !row.excluded && row.businessPersonal !== "personal") {
      expenses += row.amount || 0;
    }
  }

  const integrations: PlatformIntegrationStatus[] = Object.entries(workspace.entries || {}).map(
    ([key, entry]) => ({
      key,
      connected: Boolean(entry?.ok && (entry.data as { connected?: boolean })?.connected),
      label: key
    })
  );

  const plaid = workspace.entries?.plaid?.data as
    | { connected?: boolean; institutionName?: string }
    | undefined;

  const snap: PlatformSnapshot = {
    version: 1,
    uid,
    updatedAt: Math.max(ledger?.syncedAt ? Date.parse(ledger.syncedAt) || 0 : 0, workspace.updatedAt || 0),
    revenueTotals: ledger?.entries?.length
      ? {
          gross,
          net,
          expenses,
          profit: net - expenses,
          entryCount: ledger.entries.length
        }
      : null,
    tickers: [],
    balances: {
      plaidConnected: Boolean(plaid?.connected),
      institutionName: String(plaid?.institutionName || "")
    },
    integrations,
    modules: {},
    workspace
  };
  return snap.updatedAt ? snap : null;
}

export const PLATFORM_SNAPSHOT_EVENT = "dimad-platform-snapshot";

export function writeLocalPlatformSnapshot(snapshot: PlatformSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLATFORM_CACHE_LS_KEY, JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent(PLATFORM_SNAPSHOT_EVENT, { detail: snapshot }));
  } catch {
    /* quota */
  }
  void writeIdbPlatformSnapshot(snapshot);
}

export function subscribePlatformSnapshot(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onCustom = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === PLATFORM_CACHE_LS_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener(PLATFORM_SNAPSHOT_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PLATFORM_SNAPSHOT_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(PLATFORM_CACHE_IDB_NAME, 1);
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PLATFORM_CACHE_IDB_STORE)) {
          db.createObjectStore(PLATFORM_CACHE_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
    } catch {
      resolve(null);
    }
  });
}

export async function writeIdbPlatformSnapshot(snapshot: PlatformSnapshot) {
  const db = await openIdb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(PLATFORM_CACHE_IDB_STORE, "readwrite");
      tx.objectStore(PLATFORM_CACHE_IDB_STORE).put(snapshot, PLATFORM_CACHE_IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    } finally {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
  });
}

export async function readIdbPlatformSnapshot(): Promise<PlatformSnapshot | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(PLATFORM_CACHE_IDB_STORE, "readonly");
      const req = tx.objectStore(PLATFORM_CACHE_IDB_STORE).get(PLATFORM_CACHE_IDB_KEY);
      req.onsuccess = () => {
        const val = req.result as PlatformSnapshot | undefined;
        resolve(val?.version === 1 ? val : null);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => {
        try {
          db.close();
        } catch {
          /* ignore */
        }
      };
    } catch {
      resolve(null);
    }
  });
}

/** Instant hydrate: localStorage → IndexedDB → legacy caches. */
export async function hydratePlatformSnapshot(uid = "user"): Promise<PlatformSnapshot | null> {
  const local = readLocalPlatformSnapshot(uid);
  if (local?.updatedAt) return local;
  const idb = await readIdbPlatformSnapshot();
  if (idb?.updatedAt) {
    writeLocalPlatformSnapshot(idb);
    return idb;
  }
  return hydrateFromLegacyCaches(uid);
}

export function broadcastPlatformSync(event: Omit<PlatformSyncProgressEvent, "type">) {
  if (typeof window === "undefined") return;
  const payload: PlatformSyncProgressEvent = { type: "dimad-platform-sync", ...event };
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, window.location.origin);
    }
    window.postMessage(payload, window.location.origin);
  } catch {
    /* ignore */
  }
}

async function fetchWithTimeout(
  path: string,
  token: string | undefined,
  timeoutMs: number
): Promise<{ ok: boolean; data: Record<string, unknown>; status: number; warning?: string }> {
  const label = `platform.fetch.${path.split("?")[0]}`;
  return perfTime(label, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const res = await fetch(path, {
        headers,
        credentials: "include",
        cache: "no-store",
        signal: controller.signal
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: res.ok, data, status: res.status };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        ok: false,
        data: {},
        status: 0,
        warning: aborted ? "timeout" : "network_error"
      };
    } finally {
      clearTimeout(timer);
    }
  });
}

function summarizeRevenue(entries: Array<Record<string, unknown>>): PlatformRevenueTotals {
  let gross = 0;
  let net = 0;
  let expenses = 0;
  for (const row of entries) {
    const amount = Number(row.amount || 0);
    const fee = Number(row.feeAmount || 0);
    if (row.type === "REVENUE") {
      gross += amount;
      net += amount - fee;
    } else if (
      row.type === "EXPENSE" &&
      !row.excluded &&
      row.businessPersonal !== "personal"
    ) {
      expenses += amount;
    }
  }
  return { gross, net, expenses, profit: net - expenses, entryCount: entries.length };
}

export type RunPlatformSyncOptions = {
  uid?: string;
  token?: string;
  force?: boolean;
  minDurationMs?: number;
  onProgress?: (event: Omit<PlatformSyncProgressEvent, "type">) => void;
};

export async function runPlatformSync(options: RunPlatformSyncOptions = {}): Promise<{
  snapshot: PlatformSnapshot;
  status: "ready" | "partial";
  fromCache: boolean;
}> {
  const uid = options.uid || "user";
  const token = options.token;
  const minDurationMs = options.minDurationMs ?? 0;
  const started = Date.now();
  const total = perfStart("platform.runPlatformSync.total");
  const cached = (await hydratePlatformSnapshot(uid)) || emptySnapshot(uid);
  let fromCache = Boolean(cached.updatedAt);
  perfMark("platform.runPlatformSync.localHydrate", {
    updatedAt: cached.updatedAt,
    hasTotals: Boolean(cached.revenueTotals)
  });

  const emit = (
    phase: PlatformSyncPhaseId,
    detail: string,
    progress: number,
    status: PlatformSyncProgressEvent["status"] = "syncing"
  ) => {
    const event = { phase, detail, progress, status, fromCache, snapshot: cached };
    options.onProgress?.(event);
    broadcastPlatformSync(event);
  };

  emit("gateway", PLATFORM_SYNC_PHASES[0].label, 0.05);

  /**
   * BOTTLENECK FIX: do NOT call /api/revenue/sync here.
   * That route already self-fetches Stripe/Plaid/Shopify/etc. Calling it alongside
   * the same providers created a nested same-origin waterfall (often 6–12s).
   * Fetch each provider once; assemble the ledger client-side via adaptLivePayloads.
   */
  const jobs = {
    ledger: fetchWithTimeout("/api/revenue/ledger", token, PLATFORM_MODULE_TIMEOUT_MS),
    market: fetchWithTimeout("/api/market", token, PLATFORM_MODULE_TIMEOUT_MS),
    stripe: fetchWithTimeout("/api/integrations/stripe/metrics", token, PLATFORM_MODULE_TIMEOUT_MS),
    plaid: fetchWithTimeout("/api/plaid/data", token, PLATFORM_MODULE_TIMEOUT_MS),
    shopify: fetchWithTimeout("/api/shopify/data?range=week", token, PLATFORM_MODULE_TIMEOUT_MS),
    gumroad: fetchWithTimeout("/api/gumroad/data", token, PLATFORM_MODULE_TIMEOUT_MS),
    patreon: fetchWithTimeout("/api/patreon/data", token, PLATFORM_MODULE_TIMEOUT_MS),
    lemon: fetchWithTimeout("/api/lemonsqueezy/data", token, PLATFORM_MODULE_TIMEOUT_MS),
    youtube: fetchWithTimeout("/api/youtube/data", token, PLATFORM_MODULE_TIMEOUT_MS),
    x: fetchWithTimeout("/api/x/data", token, PLATFORM_MODULE_TIMEOUT_MS),
    mailerlite: fetchWithTimeout("/api/mailerlite/data", token, PLATFORM_MODULE_TIMEOUT_MS),
    location: fetchWithTimeout("/api/location/ip", token, PLATFORM_MODULE_TIMEOUT_MS),
    remoteCache: fetchWithTimeout("/api/platform/cache", token, PLATFORM_MODULE_TIMEOUT_MS)
  };

  emit("gateway", "Secure session established", 0.12);
  emit("ledgers", PLATFORM_SYNC_PHASES[1].label, 0.22);
  emit("markets", PLATFORM_SYNC_PHASES[2].label, 0.4);
  emit("integrations", PLATFORM_SYNC_PHASES[3].label, 0.55);

  const integrationKeys = [
    "stripe",
    "plaid",
    "shopify",
    "gumroad",
    "patreon",
    "lemon",
    "youtube",
    "x",
    "mailerlite"
  ] as const;

  // Single parallel wave — no nested /api/revenue/sync.
  const wave = perfStart("platform.runPlatformSync.parallelWave");
  const [remote, ledgerRes, marketRes, ...integrationSettled] = await Promise.all([
    jobs.remoteCache,
    jobs.ledger,
    jobs.market,
    ...integrationKeys.map((key) => jobs[key])
  ]);
  wave.end({ providers: integrationKeys.length + 3 });

  if (remote.ok && remote.data?.snapshot && typeof remote.data.snapshot === "object") {
    const remoteSnap = remote.data.snapshot as PlatformSnapshot;
    if (remoteSnap.updatedAt > (cached.updatedAt || 0)) {
      Object.assign(cached, remoteSnap);
      fromCache = true;
      writeLocalPlatformSnapshot(cached);
    }
  }

  if (marketRes.ok && Array.isArray(marketRes.data.quotes)) {
    cached.tickers = (marketRes.data.quotes as PlatformTicker[]).slice(0, 12);
    cached.modules.market = { ok: true, fetchedAt: Date.now(), data: marketRes.data };
    fromCache = false;
  } else {
    cached.modules.market = {
      ok: false,
      fetchedAt: Date.now(),
      data: {},
      warning: marketRes.warning || "market_cache_fallback"
    };
  }

  const integrationResults = integrationKeys.map((key, i) => ({
    key,
    result: integrationSettled[i]
  }));

  const firestoreLedger = Array.isArray(ledgerRes.data.entries)
    ? (ledgerRes.data.entries as Array<Record<string, unknown>>)
    : null;
  let resolvedLedger: Array<Record<string, unknown>> | null = null;

  const workspace = readWorkspaceCache();
  const integrations: PlatformIntegrationStatus[] = [];

  for (const { key, result } of integrationResults) {
    const connected = Boolean(result.ok && result.data.connected);
    integrations.push({ key, connected, label: key });
    cached.modules[key] = {
      ok: result.ok,
      fetchedAt: Date.now(),
      data: result.data,
      warning: result.warning
    };
    if (result.ok) {
      const entry: WorkspaceCacheEntry = {
        data: result.data,
        fetchedAt: Date.now(),
        ok: result.ok,
        status: result.status
      };
      workspace.entries[key as WorkspaceIntegrationKey] = entry;
      fromCache = false;
    }
  }

  const plaidData = cached.modules.plaid?.data as
    | { connected?: boolean; institutionName?: string }
    | undefined;
  cached.balances = {
    plaidConnected: Boolean(plaidData?.connected) || cached.balances.plaidConnected,
    institutionName: String(plaidData?.institutionName || cached.balances.institutionName || "")
  };
  cached.integrations = integrations;
  workspace.updatedAt = Date.now();
  workspace.preloadStatus = integrationResults.every((r) => r.result.ok)
    ? "ready"
    : integrationResults.some((r) => r.result.ok)
      ? "partial"
      : workspace.preloadStatus || "partial";
  writeWorkspaceCache(workspace);
  cached.workspace = workspace;

  // Prefer live adapted provider rows; fall back to Firestore ledger cache.
  const byKey = Object.fromEntries(integrationResults.map((r) => [r.key, r.result])) as Record<
    string,
    { ok: boolean; data: Record<string, unknown> }
  >;
  const adapted = adaptLivePayloads(uid, {
    stripe: byKey.stripe?.ok ? byKey.stripe.data : null,
    shopify: byKey.shopify?.ok ? byKey.shopify.data : null,
    gumroad: byKey.gumroad?.ok ? byKey.gumroad.data : null,
    patreon: byKey.patreon?.ok ? byKey.patreon.data : null,
    lemon: byKey.lemon?.ok ? byKey.lemon.data : null,
    plaid: byKey.plaid?.ok ? byKey.plaid.data : null
  });
  if (adapted.length) {
    resolvedLedger = adapted as unknown as Array<Record<string, unknown>>;
  } else if (firestoreLedger?.length) {
    resolvedLedger = firestoreLedger;
  }

  if (resolvedLedger?.length) {
    const syncedAt = new Date().toISOString();
    cached.revenueTotals = summarizeRevenue(resolvedLedger);
    cached.modules.revenue = {
      ok: true,
      fetchedAt: Date.now(),
      data: { entryCount: resolvedLedger.length, syncedAt }
    };
    writeLocalLedgerCache({
      uid,
      syncedAt,
      usingMock: false,
      entries: resolvedLedger as never,
      warnings: adapted.length ? [] : ["firestore_ledger_fallback"]
    });
    fromCache = !adapted.length;
    perfMark("platform.ledger.written", {
      entries: resolvedLedger.length,
      source: adapted.length ? "adaptLivePayloads" : "firestore_ledger"
    });
  } else if (cached.revenueTotals) {
    cached.modules.revenue = {
      ok: false,
      fetchedAt: Date.now(),
      data: {},
      warning: ledgerRes.warning || "ledger_cache_fallback"
    };
  }

  emit("workspace", PLATFORM_SYNC_PHASES[4].label, 0.88);

  const locationRes = await jobs.location;
  if (locationRes.ok) {
    cached.environment = {
      city: String(locationRes.data.city || locationRes.data.region || ""),
      timezone: String(locationRes.data.timezone || ""),
      weatherSummary: String(locationRes.data.weather || locationRes.data.summary || "")
    };
    cached.modules.environment = { ok: true, fetchedAt: Date.now(), data: locationRes.data };
  }

  cached.uid = uid;
  cached.updatedAt = Date.now();
  writeLocalPlatformSnapshot(cached);

  // Persist to Firestore (best-effort, non-blocking for UI completion timing).
  void fetch("/api/platform/cache", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ snapshot: cached })
  }).catch(() => null);

  const elapsed = Date.now() - started;
  if (minDurationMs > 0 && elapsed < minDurationMs) {
    await new Promise((r) => setTimeout(r, minDurationMs - elapsed));
  }

  const failedModules = Object.values(cached.modules).filter((m) => m && !m.ok).length;
  const status: "ready" | "partial" = failedModules > 2 ? "partial" : "ready";

  emit(
    "complete",
    status === "ready" ? "All systems synchronized" : "Systems partially synchronized — using secure cache",
    1,
    status
  );

  total.end({ status, fromCache, elapsedMs: Date.now() - started });
  return { snapshot: cached, status, fromCache };
}

/** Persist last-known state on session close / tab hide. */
export function bindPlatformSessionPersistence(uid = "user") {
  if (typeof window === "undefined") return () => undefined;

  const persist = () => {
    const snap = readLocalPlatformSnapshot(uid) || hydrateFromLegacyCaches(uid);
    if (!snap) return;
    const closed: PlatformSnapshot = { ...snap, closedAt: Date.now(), updatedAt: snap.updatedAt || Date.now() };
    writeLocalPlatformSnapshot(closed);
    let token = (window as unknown as { __dimadIdToken?: string }).__dimadIdToken || "";
    if (!token) {
      try {
        token = decodeURIComponent(
          document.cookie.match(/(?:^|; )dimad_fb_token=([^;]*)/)?.[1] || ""
        );
      } catch {
        token = "";
      }
    }
    const body = JSON.stringify({ snapshot: closed });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        const qs = token ? `?beacon=1&id_token=${encodeURIComponent(token)}` : "?beacon=1";
        navigator.sendBeacon(`/api/platform/cache${qs}`, blob);
      }
    } catch {
      /* ignore */
    }
  };

  window.addEventListener("pagehide", persist);
  window.addEventListener("beforeunload", persist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });

  return () => {
    window.removeEventListener("pagehide", persist);
    window.removeEventListener("beforeunload", persist);
  };
}
