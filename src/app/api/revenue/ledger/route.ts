import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { perfStart, perfTime } from "@/lib/perf/timing";
import type { UnifiedTransaction } from "@/lib/revenue/types";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function snapshotRef(uid: string) {
  return getAdminDb().collection("users").doc(uid).collection("financial_ledger").doc("snapshot");
}

export async function GET(req: NextRequest) {
  const total = perfStart("api.revenue.ledger.total");
  const session = await perfTime("api.revenue.ledger.auth", () => requireFirebaseUser(req));
  if ("error" in session) {
    total.end({ ok: false, reason: "auth" });
    return session.error;
  }
  try {
    const snap = await perfTime("api.revenue.ledger.firestore_read", () =>
      snapshotRef(session.uid).get()
    );
    if (!snap.exists) {
      total.end({ ok: true, cached: false });
      return NextResponse.json(
        { ok: true, entries: [], syncedAt: null, usingMock: false, cached: false },
        { headers: noStore }
      );
    }
    const data = snap.data() || {};
    const entries = Array.isArray(data.entries) ? (data.entries as UnifiedTransaction[]) : [];
    total.end({ ok: true, cached: true, entries: entries.length });
    return NextResponse.json(
      {
        ok: true,
        entries,
        syncedAt: data.syncedAt || null,
        usingMock: Boolean(data.usingMock),
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        cached: true
      },
      { headers: noStore }
    );
  } catch (err) {
    console.error("financial_ledger GET failed", err);
    total.end({ ok: false });
    return NextResponse.json(
      { ok: false, error: "ledger_read_failed", entries: [] },
      { status: 500, headers: noStore }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      entries?: UnifiedTransaction[];
      usingMock?: boolean;
      warnings?: string[];
    };
    const entries = Array.isArray(body.entries) ? body.entries.slice(0, 2000) : [];
    const syncedAt = new Date().toISOString();
    await snapshotRef(session.uid).set(
      {
        entries,
        usingMock: Boolean(body.usingMock),
        warnings: Array.isArray(body.warnings) ? body.warnings.slice(0, 40) : [],
        syncedAt,
        updatedAt: syncedAt
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true, syncedAt, count: entries.length }, { headers: noStore });
  } catch (err) {
    console.error("financial_ledger PUT failed", err);
    return NextResponse.json({ ok: false, error: "ledger_write_failed" }, { status: 500, headers: noStore });
  }
}
