"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { authFetch } from "@/lib/auth/client";
import { useInstantDashboardState } from "@/hooks/useInstantDashboardState";
import { perfMark, perfStart } from "@/lib/perf/timing";
import { writeLocalLedgerCache } from "@/lib/revenue/ledgerCache";
import type { UnifiedTransaction } from "@/lib/revenue/types";

export type UseRevenueDataOptions = {
  /** When true, kick off /api/revenue/sync in the background after mount. */
  autoSync?: boolean;
  uid?: string;
};

export type PlaidSyncMeta = {
  connected: boolean;
  institutionName: string;
  timedOut?: boolean;
};

export type UseRevenueDataResult = {
  ledger: UnifiedTransaction[];
  setLedger: Dispatch<SetStateAction<UnifiedTransaction[]>>;
  usingMock: boolean;
  setUsingMock: Dispatch<SetStateAction<boolean>>;
  /** Always false when instant cache/fallback exists — never blocks first paint. */
  loading: boolean;
  /** True while a background sync is running (never blocks the UI). */
  syncing: boolean;
  warnings: string[];
  syncedAt: string | null;
  fromCache: boolean;
  plaid: PlaidSyncMeta | null;
  refresh: (opts?: { forceSync?: boolean }) => Promise<void>;
};

const REVENUE_TOKEN_WAIT_MS = 2500;

export function useRevenueData(options: UseRevenueDataOptions = {}): UseRevenueDataResult {
  const { autoSync = true, uid = "user" } = options;
  const instant = useInstantDashboardState(uid);

  const [ledgerOverride, setLedgerOverride] = useState<UnifiedTransaction[] | null>(null);
  const [usingMockOverride, setUsingMockOverride] = useState<boolean | null>(null);
  const [warnings, setWarnings] = useState<string[]>(instant.warnings);
  const [syncedAt, setSyncedAt] = useState<string | null>(instant.syncedAt);
  const [fromCache, setFromCache] = useState(instant.fromCache);
  const [syncing, setSyncing] = useState(false);
  const [plaid, setPlaid] = useState<PlaidSyncMeta | null>(null);
  const syncInFlight = useRef(false);
  const mounted = useRef(true);

  const ledger = ledgerOverride ?? instant.ledger;
  const usingMock = usingMockOverride ?? instant.usingMock;
  // Instant structural/cache data means the page is never in a blocking loading state.
  const loading = false;

  useEffect(() => {
    mounted.current = true;
    perfMark("client.revenue.mount", {
      entries: ledger.length,
      usingMock,
      cacheFresh: instant.cacheFresh,
      fromCache: instant.fromCache
    });
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep overrides in sync when the external store updates from welcome/boot writes.
  useEffect(() => {
    if (ledgerOverride) return;
    setWarnings(instant.warnings);
    setSyncedAt(instant.syncedAt);
    setFromCache(instant.fromCache);
  }, [instant.warnings, instant.syncedAt, instant.fromCache, ledgerOverride]);

  const persist = useCallback(
    (entries: UnifiedTransaction[], mock: boolean, warn: string[], at: string) => {
      writeLocalLedgerCache({
        uid,
        entries,
        usingMock: mock,
        warnings: warn,
        syncedAt: at
      });
    },
    [uid]
  );

  const setLedger: Dispatch<SetStateAction<UnifiedTransaction[]>> = useCallback((action) => {
    setLedgerOverride((prev) => {
      const base = prev ?? instant.ledger;
      return typeof action === "function" ? action(base) : action;
    });
  }, [instant.ledger]);

  const setUsingMock: Dispatch<SetStateAction<boolean>> = useCallback((action) => {
    setUsingMockOverride((prev) => {
      const base = prev ?? instant.usingMock;
      return typeof action === "function" ? action(base) : action;
    });
  }, [instant.usingMock]);

  const runSync = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    if (mounted.current) setSyncing(true);
    const span = perfStart("client.revenue.runSync");
    try {
      const { res, data } = await authFetch("/api/revenue/sync", {}, { tokenWaitMs: REVENUE_TOKEN_WAIT_MS });
      if (!mounted.current) return;
      if (!res.ok || data.ok === false) {
        setWarnings((prev) => [...prev, String(data.error || "sync_failed")]);
        span.end({ ok: false });
        return;
      }
      const entries = Array.isArray(data.entries) ? (data.entries as UnifiedTransaction[]) : [];
      const mock = Boolean(data.usingMock);
      const warn = Array.isArray(data.warnings) ? (data.warnings as string[]) : [];
      const at =
        typeof data.syncedAt === "string" ? data.syncedAt : new Date().toISOString();
      if (entries.length) {
        setLedgerOverride(entries);
        setUsingMockOverride(mock);
        setFromCache(Boolean(data.fromCache));
        persist(entries, mock, warn, at);
      }
      setWarnings(warn);
      setSyncedAt(at);
      if (data.plaid && typeof data.plaid === "object") {
        const p = data.plaid as Record<string, unknown>;
        setPlaid({
          connected: Boolean(p.connected),
          institutionName: String(p.institutionName || ""),
          timedOut: Boolean(p.timedOut)
        });
      }
      span.end({ ok: true, entries: entries.length, usingMock: mock });
    } catch {
      if (mounted.current) {
        setWarnings((prev) => [...prev, "sync_network_error"]);
      }
      span.end({ ok: false, error: "network" });
    } finally {
      syncInFlight.current = false;
      if (mounted.current) setSyncing(false);
    }
  }, [persist]);

  const refresh = useCallback(
    async (opts?: { forceSync?: boolean }) => {
      const forceSync = opts?.forceSync !== false;
      if (forceSync) await runSync();
    },
    [runSync]
  );

  // Deferred background sync — only after paint. Skip if welcome/boot just filled cache.
  useEffect(() => {
    if (!autoSync) return;
    if (instant.cacheFresh && !instant.usingMock) {
      perfMark("client.revenue.skipSync", { reason: "cache_fresh" });
      return;
    }
    const handle = window.setTimeout(() => {
      perfMark("client.revenue.deferredSync.start");
      void runSync();
    }, 50);
    return () => window.clearTimeout(handle);
    // Mount-once deferred sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync]);

  return {
    ledger,
    setLedger,
    usingMock,
    setUsingMock,
    loading,
    syncing,
    warnings,
    syncedAt,
    fromCache,
    plaid,
    refresh
  };
}
