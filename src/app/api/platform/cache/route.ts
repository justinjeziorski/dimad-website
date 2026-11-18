import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import type { PlatformSnapshot } from "@/lib/cache/platformSyncEngine";
import { perfStart, perfTime } from "@/lib/perf/timing";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function snapshotRef(uid: string) {
  return getAdminDb().collection("users").doc(uid).collection("platform_cache").doc("snapshot");
}

function sanitizeSnapshot(raw: unknown, uid: string): PlatformSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as PlatformSnapshot;
  return {
    version: 1,
    uid,
    updatedAt: Number(snap.updatedAt || Date.now()),
    closedAt: snap.closedAt ? Number(snap.closedAt) : undefined,
    revenueTotals: snap.revenueTotals || null,
    tickers: Array.isArray(snap.tickers) ? snap.tickers.slice(0, 24) : [],
    balances: snap.balances || { plaidConnected: false, institutionName: "" },
    integrations: Array.isArray(snap.integrations) ? snap.integrations.slice(0, 40) : [],
    modules: snap.modules && typeof snap.modules === "object" ? snap.modules : {},
    workspace: snap.workspace,
    environment: snap.environment
  };
}

export async function GET(req: NextRequest) {
  const total = perfStart("api.platform.cache.get.total");
  const session = await perfTime("api.platform.cache.auth", () => requireFirebaseUser(req));
  if ("error" in session) {
    total.end({ ok: false, reason: "auth" });
    return session.error;
  }
  try {
    const snap = await perfTime("api.platform.cache.firestore_read", () =>
      snapshotRef(session.uid).get()
    );
    if (!snap.exists) {
      total.end({ ok: true, cached: false });
      return NextResponse.json({ ok: true, snapshot: null, cached: false }, { headers: noStore });
    }
    const data = snap.data() || {};
    const snapshot = sanitizeSnapshot(data.snapshot || data, session.uid);
    total.end({ ok: true, cached: true });
    return NextResponse.json(
      { ok: true, snapshot, cached: true, syncedAt: data.syncedAt || snapshot?.updatedAt || null },
      { headers: noStore }
    );
  } catch (err) {
    console.error("platform_cache GET failed", err);
    total.end({ ok: false });
    return NextResponse.json(
      { ok: false, error: "platform_cache_read_failed", snapshot: null },
      { status: 500, headers: noStore }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const body = (await req.json().catch(() => ({}))) as { snapshot?: unknown };
    const snapshot = sanitizeSnapshot(body.snapshot, session.uid);
    if (!snapshot) {
      return NextResponse.json({ ok: false, error: "invalid_snapshot" }, { status: 400, headers: noStore });
    }
    const syncedAt = new Date().toISOString();
    await snapshotRef(session.uid).set(
      {
        snapshot,
        syncedAt,
        updatedAt: syncedAt,
        closedAt: snapshot.closedAt || null
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true, syncedAt }, { headers: noStore });
  } catch (err) {
    console.error("platform_cache PUT failed", err);
    return NextResponse.json(
      { ok: false, error: "platform_cache_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}

/** Beacon-friendly POST for session close. */
export async function POST(req: NextRequest) {
  return PUT(req);
}
