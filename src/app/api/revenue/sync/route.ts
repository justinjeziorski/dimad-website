import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { perfMark, perfStart, perfTime } from "@/lib/perf/timing";
import { adaptLivePayloads } from "@/lib/revenue/adapters";
import { generateMockLedger } from "@/lib/revenue/ledgerEngine";
import type { LedgerSource, UnifiedTransaction } from "@/lib/revenue/types";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const noStore = { "Cache-Control": "no-store" };
const PROVIDER_TIMEOUT_MS = 3000;

type ProviderKey = "stripe" | "shopify" | "gumroad" | "patreon" | "lemon" | "plaid" | "manual";

const PROVIDERS: { key: ProviderKey; path: string; source: LedgerSource }[] = [
  { key: "stripe", path: "/api/integrations/stripe/metrics", source: "stripe" },
  { key: "shopify", path: "/api/shopify/data?range=month", source: "shopify" },
  { key: "gumroad", path: "/api/gumroad/data", source: "gumroad" },
  { key: "patreon", path: "/api/patreon/data", source: "patreon" },
  { key: "lemon", path: "/api/lemonsqueezy/data", source: "lemon_squeezy" },
  { key: "plaid", path: "/api/plaid/data", source: "plaid" },
  { key: "manual", path: "/api/revenue/manual", source: "manual" }
];

function snapshotRef(uid: string) {
  return getAdminDb().collection("users").doc(uid).collection("financial_ledger").doc("snapshot");
}

function entriesForSource(entries: UnifiedTransaction[], source: LedgerSource) {
  return entries.filter((e) => e.source === source);
}

async function readCachedLedger(uid: string): Promise<{
  entries: UnifiedTransaction[];
  syncedAt: string | null;
  usingMock: boolean;
  warnings: string[];
}> {
  try {
    const snap = await perfTime(`api.revenue.sync.firestore_read.${uid.slice(0, 6)}`, () =>
      snapshotRef(uid).get()
    );
    if (!snap.exists) return { entries: [], syncedAt: null, usingMock: false, warnings: [] };
    const data = snap.data() || {};
    return {
      entries: Array.isArray(data.entries) ? (data.entries as UnifiedTransaction[]) : [],
      syncedAt: typeof data.syncedAt === "string" ? data.syncedAt : null,
      usingMock: Boolean(data.usingMock),
      warnings: Array.isArray(data.warnings) ? (data.warnings as string[]) : []
    };
  } catch (err) {
    console.error("financial_ledger cache read failed", err);
    return { entries: [], syncedAt: null, usingMock: false, warnings: [] };
  }
}

async function writeCachedLedger(
  uid: string,
  entries: UnifiedTransaction[],
  usingMock: boolean,
  warnings: string[]
) {
  const syncedAt = new Date().toISOString();
  await perfTime("api.revenue.sync.firestore_write", () =>
    snapshotRef(uid).set(
      {
        entries: entries.slice(0, 2000),
        usingMock,
        warnings: warnings.slice(0, 40),
        syncedAt,
        updatedAt: syncedAt
      },
      { merge: true }
    )
  );
  return syncedAt;
}

/** Strict timeout via AbortController — aborted fetches stop competing for the event loop. */
async function fetchProviderJson(
  origin: string,
  path: string,
  idToken: string,
  label: string,
  timeoutMs: number
): Promise<Record<string, unknown>> {
  return perfTime(`api.revenue.sync.provider.${label}`, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${origin}${path}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
        signal: controller.signal
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      perfMark(`api.revenue.sync.provider.${label}.status`, { status: res.status });
      return { ...data, __httpStatus: res.status };
    } catch (err) {
      const aborted =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof err === "object" &&
          err !== null &&
          "name" in err &&
          (err as { name: string }).name === "AbortError");
      throw new Error(aborted ? `${label}_timeout` : `${label}_failed`);
    } finally {
      clearTimeout(timer);
    }
  });
}

export async function GET(req: NextRequest) {
  return sync(req);
}

export async function POST(req: NextRequest) {
  return sync(req);
}

async function sync(req: NextRequest) {
  const total = perfStart("api.revenue.sync.total");
  const session = await perfTime("api.revenue.sync.auth", () => requireFirebaseUser(req));
  if ("error" in session) {
    total.end({ ok: false, reason: "auth" });
    return session.error;
  }

  const origin = req.nextUrl.origin;
  const token = session.idToken;
  const cached = await readCachedLedger(session.uid);
  const warnings: string[] = [];
  perfMark("api.revenue.sync.cache_hit", {
    entries: cached.entries.length,
    syncedAt: cached.syncedAt
  });

  // Concurrent provider pulls — none can block the others past PROVIDER_TIMEOUT_MS.
  const providersSpan = perfStart("api.revenue.sync.providers_allSettled");
  const settled = await Promise.allSettled(
    PROVIDERS.map((p) =>
      fetchProviderJson(origin, p.path, token, p.key, PROVIDER_TIMEOUT_MS).then((data) => ({
        key: p.key,
        source: p.source,
        data
      }))
    )
  );
  providersSpan.end({ count: PROVIDERS.length });

  const payloads: Record<Exclude<ProviderKey, "manual">, Record<string, unknown> | null> = {
    stripe: null,
    shopify: null,
    gumroad: null,
    patreon: null,
    lemon: null,
    plaid: null
  };
  let manualEntries: UnifiedTransaction[] | null = null;
  const timedOutSources = new Set<LedgerSource>();
  const failedSources = new Set<LedgerSource>();
  const freshSources = new Set<LedgerSource>();

  settled.forEach((result, index) => {
    const meta = PROVIDERS[index];
    if (result.status === "rejected") {
      const reason =
        result.reason instanceof Error ? result.reason.message : `${meta.key}_failed`;
      console.warn(`[revenue/sync] ${reason}`);
      warnings.push(reason);
      if (reason.endsWith("_timeout")) timedOutSources.add(meta.source);
      else failedSources.add(meta.source);
      return;
    }

    const { key, source, data } = result.value;
    freshSources.add(source);
    if (key === "manual") {
      manualEntries = Array.isArray(data.entries) ? (data.entries as UnifiedTransaction[]) : [];
      return;
    }
    payloads[key] = data;
  });

  const live = adaptLivePayloads(session.uid, {
    stripe: payloads.stripe,
    shopify: payloads.shopify,
    gumroad: payloads.gumroad,
    patreon: payloads.patreon,
    lemon: payloads.lemon,
    plaid: payloads.plaid
  });

  // Start from live + manual, then fill any timed-out/failed provider from Firestore cache.
  const mergedBySource = new Map<LedgerSource, UnifiedTransaction[]>();

  for (const row of live) {
    const bucket = mergedBySource.get(row.source) || [];
    bucket.push(row);
    mergedBySource.set(row.source, bucket);
  }

  if (manualEntries) {
    mergedBySource.set("manual", manualEntries);
  }

  for (const source of [...timedOutSources, ...failedSources]) {
    if (freshSources.has(source) && source !== "manual") continue;
    if (source === "manual" && manualEntries) continue;
    const cachedRows = entriesForSource(cached.entries, source);
    if (cachedRows.length) {
      mergedBySource.set(source, cachedRows);
      warnings.push(`${source}_cache_fallback`);
    }
  }

  // Preserve any other cached sources that weren't attempted (defensive).
  for (const row of cached.entries) {
    if (!mergedBySource.has(row.source) && !freshSources.has(row.source)) {
      const bucket = mergedBySource.get(row.source) || [];
      bucket.push(row);
      mergedBySource.set(row.source, bucket);
    }
  }

  let entries = Array.from(mergedBySource.values()).flat();
  let usingMock = false;
  let fromCache = false;

  if (!entries.length) {
    if (cached.entries.length) {
      entries = cached.entries;
      fromCache = true;
      warnings.push("sync_empty_using_cache");
    } else {
      entries = generateMockLedger(session.uid);
      usingMock = true;
      warnings.push("sync_empty_using_mock");
    }
  } else if (timedOutSources.size || failedSources.size) {
    fromCache = warnings.some((w) => w.endsWith("_cache_fallback"));
  }

  const plaidPayload = payloads.plaid;
  const plaidConnected = Boolean(plaidPayload?.connected);
  const plaidInstitution = String(
    (plaidPayload?.institutionName as string | undefined) ||
      (plaidPayload?.institution as string | undefined) ||
      ""
  );
  // If Plaid timed out, infer connection from cached plaid rows.
  const plaidFromCache = timedOutSources.has("plaid") && entriesForSource(cached.entries, "plaid").length > 0;

  let syncedAt = cached.syncedAt;
  try {
    syncedAt = await writeCachedLedger(session.uid, entries, usingMock, warnings);
  } catch (err) {
    console.error("financial_ledger write failed", err);
    warnings.push("ledger_write_failed");
  }

  total.end({
    ok: true,
    entries: entries.length,
    timedOut: [...timedOutSources],
    fromCache,
    usingMock
  });
  return NextResponse.json(
    {
      ok: true,
      entries,
      usingMock,
      warnings,
      syncedAt,
      timedOut: [...timedOutSources],
      fromCache,
      plaid: {
        connected: plaidConnected || plaidFromCache,
        institutionName: plaidInstitution,
        timedOut: timedOutSources.has("plaid")
      }
    },
    { headers: noStore }
  );
}
