import { NextRequest, NextResponse } from "next/server";
import {
  deleteLemonIntegration,
  verifyLemonCredentials,
  writeLemonIntegration
} from "@/lib/integrations/lemon/server";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { apiKey?: string; storeId?: string };
    const apiKey = String(body.apiKey || "").trim();
    const storeId = String(body.storeId || "").trim();
    if (!apiKey || apiKey.length < 12) {
      return NextResponse.json({ ok: false, error: "missing_api_key" }, { status: 400, headers: noStore });
    }
    if (!/^\d+$/.test(storeId)) {
      return NextResponse.json({ ok: false, error: "missing_store_id" }, { status: 400, headers: noStore });
    }

    const verified = await verifyLemonCredentials(apiKey, storeId);
    const record = {
      apiKey,
      storeId,
      storeName: verified.storeName,
      connectedAt: new Date().toISOString()
    };
    await writeLemonIntegration(session.uid, record, session.idToken);
    return NextResponse.json(
      {
        ok: true,
        connected: true,
        storeId,
        storeName: verified.storeName,
        currency: verified.currency
      },
      { headers: noStore }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "lemon_connect_failed";
    console.error("Lemon connect failed", session.uid, message);
    const known = [
      "invalid_lemon_credentials",
      "lemon_request_failed",
      "firestore_permission_denied",
      "firestore_write_failed",
      "missing_api_key",
      "missing_store_id"
    ].includes(message);
    return NextResponse.json(
      { ok: false, error: known ? message : "lemon_connect_failed" },
      { status: message === "invalid_lemon_credentials" ? 401 : 502, headers: noStore }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    await deleteLemonIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("Lemon disconnect failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "firestore_permission_denied" ? message : "firestore_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}
