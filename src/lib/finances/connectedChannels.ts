import { readLocalPlatformSnapshot } from "@/lib/cache/platformSyncEngine";
import type { LedgerSource, UnifiedTransaction } from "@/lib/revenue/types";

const SOURCE_OPTIONS: LedgerSource[] = [
  "stripe",
  "shopify",
  "gumroad",
  "patreon",
  "lemon_squeezy",
  "plaid",
  "manual"
];

function mapIntegrationKey(key: string): LedgerSource | null {
  const k = key.toLowerCase();
  if (k === "lemon" || k === "lemon_squeezy" || k === "lemonsqueezy") return "lemon_squeezy";
  if (SOURCE_OPTIONS.includes(k as LedgerSource)) return k as LedgerSource;
  return null;
}

/** Channels currently connected (or present in a live ledger). Manual is always available. */
export function resolveConnectedChannels(
  ledger: UnifiedTransaction[],
  _usingMock: boolean,
  uid = "user"
): Set<LedgerSource> {
  const connected = new Set<LedgerSource>(["manual"]);

  try {
    const snap = readLocalPlatformSnapshot(uid);
    if (snap?.balances?.plaidConnected) connected.add("plaid");
    for (const row of snap?.integrations || []) {
      if (!row?.connected) continue;
      const mapped = mapIntegrationKey(String(row.key || ""));
      if (mapped) connected.add(mapped);
    }
  } catch {
    // ignore cache read failures
  }

  // Ledger activity (live or demo) unlocks the channel for graph filtering.
  for (const row of ledger) {
    if (SOURCE_OPTIONS.includes(row.source)) connected.add(row.source);
  }

  return connected;
}

export { SOURCE_OPTIONS as FINANCE_CHANNEL_OPTIONS };
