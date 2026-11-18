"use client";

/**
 * Zero-blocking dashboard hydration.
 * Uses useSyncExternalStore so SSR/hydration stay identical, then the client
 * snapshot reads localStorage synchronously after hydrate for sub-100ms paint.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  PLATFORM_FRESH_MS,
  hydrateFromLegacyCaches,
  readLocalPlatformSnapshot,
  subscribePlatformSnapshot,
  type PlatformSnapshot
} from "@/lib/cache/platformSyncEngine";
import { perfMark } from "@/lib/perf/timing";
import {
  isLedgerCacheFresh,
  readLocalLedgerCache,
  subscribeLedgerCache,
  type LedgerCachePayload
} from "@/lib/revenue/ledgerCache";
import { generateMockLedger } from "@/lib/revenue/ledgerEngine";
import type { UnifiedTransaction } from "@/lib/revenue/types";

/** Fixed anchor so SSR + hydration structural fallback never drift. */
const STRUCTURAL_NOW = new Date("2025-06-15T12:00:00.000Z");

export type InstantDashboardState = {
  ledger: UnifiedTransaction[];
  usingMock: boolean;
  syncedAt: string | null;
  warnings: string[];
  fromCache: boolean;
  /** True when painted from cache/fallback — never waits on network. */
  hasInstantData: boolean;
  /** Cache was written recently (e.g. welcome boot) — skip aggressive live sync. */
  cacheFresh: boolean;
  platform: PlatformSnapshot | null;
  revenueTotals: PlatformSnapshot["revenueTotals"];
  tickers: PlatformSnapshot["tickers"];
};

const structuralCache = new Map<string, LedgerCachePayload>();
const ledgerClientCache = new Map<string, { key: string; payload: LedgerCachePayload }>();
const platformClientCache = new Map<string, { key: string; snapshot: PlatformSnapshot | null }>();

function structuralLedger(uid: string): LedgerCachePayload {
  const hit = structuralCache.get(uid);
  if (hit) return hit;
  const payload: LedgerCachePayload = {
    uid,
    syncedAt: STRUCTURAL_NOW.toISOString(),
    usingMock: true,
    entries: generateMockLedger(uid, STRUCTURAL_NOW),
    warnings: ["structural_fallback"]
  };
  structuralCache.set(uid, payload);
  return payload;
}

function ledgerCacheKey(uid: string): string {
  if (typeof window === "undefined") return "server";
  try {
    return window.localStorage.getItem("dimad_financial_ledger_v1") || `structural:${uid}`;
  } catch {
    return `structural:${uid}`;
  }
}

function platformCacheKey(uid: string): string {
  if (typeof window === "undefined") return "server";
  try {
    return window.localStorage.getItem("dimad_platform_snapshot_v1") || `none:${uid}`;
  } catch {
    return `none:${uid}`;
  }
}

function readLedgerClient(uid: string): LedgerCachePayload {
  const t0 = performance.now();
  const key = ledgerCacheKey(uid);
  const hit = ledgerClientCache.get(uid);
  if (hit && hit.key === key) return hit.payload;

  const cached = readLocalLedgerCache(uid);
  const payload =
    cached?.entries?.length ? cached : structuralLedger(uid);
  ledgerClientCache.set(uid, { key, payload });
  perfMark("client.instant.readLedger", {
    ms: Number((performance.now() - t0).toFixed(2)),
    entries: payload.entries.length,
    fromLocalStorage: Boolean(cached?.entries?.length),
    usingMock: payload.usingMock
  });
  return payload;
}

function readPlatformClient(uid: string): PlatformSnapshot | null {
  const key = platformCacheKey(uid);
  const hit = platformClientCache.get(uid);
  if (hit && hit.key === key) return hit.snapshot;

  const snapshot = readLocalPlatformSnapshot(uid) || hydrateFromLegacyCaches(uid);
  platformClientCache.set(uid, { key, snapshot });
  return snapshot;
}

/**
 * Instant last-known dashboard state. Never awaits network.
 * Safe for SSR: server + hydration use structural fallback; client then swaps to cache.
 */
export function useInstantDashboardState(uid = "user"): InstantDashboardState {
  const subscribeLedger = useCallback(
    (onChange: () => void) => subscribeLedgerCache(onChange),
    []
  );
  const getLedgerSnapshot = useCallback(() => readLedgerClient(uid), [uid]);
  const getLedgerServerSnapshot = useCallback(() => structuralLedger(uid), [uid]);

  const ledgerPayload = useSyncExternalStore(
    subscribeLedger,
    getLedgerSnapshot,
    getLedgerServerSnapshot
  );

  const subscribePlatform = useCallback(
    (onChange: () => void) => subscribePlatformSnapshot(onChange),
    []
  );
  const getPlatformSnapshot = useCallback(() => readPlatformClient(uid), [uid]);
  const getPlatformServerSnapshot = useCallback(() => null, []);

  const platform = useSyncExternalStore(
    subscribePlatform,
    getPlatformSnapshot,
    getPlatformServerSnapshot
  );

  return useMemo(() => {
    const localHit = typeof window !== "undefined" ? readLocalLedgerCache(uid) : null;
    const fromCache = Boolean(localHit?.entries?.length) && !ledgerPayload.warnings?.includes("structural_fallback");
    return {
      ledger: ledgerPayload.entries,
      usingMock: Boolean(ledgerPayload.usingMock),
      syncedAt: ledgerPayload.syncedAt || null,
      warnings: ledgerPayload.warnings || [],
      fromCache,
      hasInstantData: ledgerPayload.entries.length > 0,
      cacheFresh:
        isLedgerCacheFresh(localHit || (fromCache ? ledgerPayload : null)) ||
        Boolean(platform?.updatedAt && Date.now() - platform.updatedAt <= PLATFORM_FRESH_MS),
      platform,
      revenueTotals: platform?.revenueTotals || null,
      tickers: platform?.tickers || []
    };
  }, [ledgerPayload, platform, uid]);
}
