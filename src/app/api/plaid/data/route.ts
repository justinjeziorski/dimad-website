import { NextRequest, NextResponse } from "next/server";
import {
  deletePlaidIntegration,
  fetchPlaidDashboardData,
  readPlaidIntegration,
  updatePlaidAccountClasses,
  type PlaidAccountClass
} from "@/lib/plaid";
import { perfStart, perfTime } from "@/lib/perf/timing";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const total = perfStart("api.plaid.data.total");
  const session = await perfTime("api.plaid.auth", () => requireFirebaseUser(req));
  if ("error" in session) {
    total.end({ ok: false, reason: "auth" });
    return session.error;
  }

  try {
    const record = await perfTime("api.plaid.firestore_read", () =>
      readPlaidIntegration(session.uid, session.idToken)
    );
    if (!record) {
      total.end({ ok: true, connected: false });
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }
    const data = await perfTime("api.plaid.sdk_dashboard", () =>
      fetchPlaidDashboardData(session.uid, record, session.idToken)
    );
    total.end({ ok: true, connected: true });
    return NextResponse.json({ ok: true, connected: true, ...data }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "plaid_request_failed";
    console.error("Plaid data route failed", session.uid, message);
    total.end({ ok: false, error: message });
    let institutionName = "";
    let itemId = "";
    try {
      const record = await readPlaidIntegration(session.uid, session.idToken);
      institutionName = record?.institutionName || "";
      itemId = record?.itemId || "";
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      {
        ok: false,
        connected: !!(itemId || institutionName),
        error: message === "invalid_plaid_credentials" ? message : "plaid_request_failed",
        ...(itemId || institutionName
          ? {
              itemId,
              institutionName: institutionName || "Linked bank",
              accounts: [],
              recentTransactions: [],
              metrics: {
                cashAvailable: 0,
                cashAvailableDisplay: "—",
                creditBalance: 0,
                creditBalanceDisplay: "—",
                netLiquidity: 0,
                netLiquidityDisplay: "—",
                accountCount: 0
              }
            }
          : {})
      },
      { status: itemId || institutionName ? 200 : 502, headers: noStore }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      accountClasses?: Record<string, string>;
    };
    const accountClasses: Record<string, PlaidAccountClass> = {};
    for (const [accountId, value] of Object.entries(body.accountClasses || {})) {
      if (value === "operating" || value === "tax" || value === "personal") {
        accountClasses[accountId] = value;
      }
    }
    await updatePlaidAccountClasses(session.uid, accountClasses, session.idToken);
    const record = await readPlaidIntegration(session.uid, session.idToken);
    if (!record) {
      return NextResponse.json({ ok: false, error: "plaid_not_connected" }, { status: 404, headers: noStore });
    }
    const data = await fetchPlaidDashboardData(session.uid, record, session.idToken);
    return NextResponse.json({ ok: true, connected: true, ...data }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("Plaid account class update failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "plaid_not_connected" ? message : "firestore_write_failed" },
      { status: message === "plaid_not_connected" ? 404 : 500, headers: noStore }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    await deletePlaidIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("Plaid disconnect failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "firestore_permission_denied" ? message : "firestore_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}
