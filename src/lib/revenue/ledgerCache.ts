import type { UnifiedTransaction } from "@/lib/revenue/types";

const STORAGE_KEY = "dimad_financial_ledger_v1";
export const LEDGER_CACHE_EVENT = "dimad-ledger-cache";
/** Skip redundant live sync when welcome/boot just wrote the ledger. */
export const LEDGER_CACHE_FRESH_MS = 3 * 60 * 1000;

export type LedgerCachePayload = {
  uid: string;
  syncedAt: string;
  usingMock: boolean;
  entries: UnifiedTransaction[];
  warnings?: string[];
};

export function readLocalLedgerCache(uid = "user"): LedgerCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LedgerCachePayload;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    if (parsed.uid && parsed.uid !== uid && parsed.uid !== "user" && uid !== "user") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalLedgerCache(payload: LedgerCachePayload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...payload,
        entries: payload.entries.slice(0, 2000)
      })
    );
    window.dispatchEvent(new CustomEvent(LEDGER_CACHE_EVENT, { detail: payload }));
  } catch {
    /* quota / private mode */
  }
}

export function clearLocalLedgerCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(LEDGER_CACHE_EVENT, { detail: null }));
  } catch {
    /* ignore */
  }
}

export function isLedgerCacheFresh(payload: LedgerCachePayload | null | undefined, now = Date.now()) {
  if (!payload?.syncedAt || !payload.entries?.length) return false;
  const at = Date.parse(payload.syncedAt);
  if (!Number.isFinite(at)) return false;
  return now - at <= LEDGER_CACHE_FRESH_MS;
}

export function subscribeLedgerCache(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onCustom = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener(LEDGER_CACHE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LEDGER_CACHE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
