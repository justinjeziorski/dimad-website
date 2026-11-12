import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { adminReadUser } from "@/lib/firebase-admin";
import { getUserDocument, readString } from "@/lib/firestore-rest";
import { aurinkoAccount } from "@/lib/aurinko";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    let token = "";
    let accountId = "";
    let email = "";
    let serviceType = "";
    let provider = "";
    let connectedAt = "";
    try {
      const userDoc = await getUserDocument(session.uid, session.idToken);
      const fields = userDoc.fields || {};
      token = readString(fields, "aurinko_access_token");
      accountId = readString(fields, "aurinko_account_id");
      email = readString(fields, "aurinko_email");
      serviceType = readString(fields, "aurinko_service_type");
      provider = readString(fields, "aurinko_provider");
      connectedAt = readString(fields, "aurinko_updated_at") || readString(fields, "aurinko_connected_at");
    } catch (readErr) {
      console.warn("Aurinko status REST read failed; trying Admin", readErr);
      const row = await adminReadUser(session.uid);
      token = String(row.aurinko_access_token || "");
      accountId = String(row.aurinko_account_id || "");
      email = String(row.aurinko_email || "");
      serviceType = String(row.aurinko_service_type || "");
      provider = String(row.aurinko_provider || "");
      connectedAt = String(row.aurinko_updated_at || row.aurinko_connected_at || "");
    }

    let liveEmail = email;
    let liveOk = false;
    if (token) {
      const account = await aurinkoAccount(token);
      liveOk = !!account && (account.id != null || !!account.email);
      liveEmail = String(account.email || liveEmail || "");
    }

    const payload = {
      ok: true,
      uid: session.uid,
      connected: !!token,
      liveOk,
      accountId: accountId || null,
      email: liveEmail || null,
      serviceType: serviceType || (provider === "microsoft" ? "Office365" : provider === "google" ? "Google" : null),
      provider: provider || (String(serviceType).toLowerCase().includes("office") ? "microsoft" : serviceType ? "google" : null),
      connectedAt: connectedAt || null
    };
    console.log("Aurinko status", payload);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "status_failed";
    console.error("Aurinko status failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
