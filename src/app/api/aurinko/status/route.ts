import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { getUserDocument, readString } from "@/lib/firestore-rest";
import { aurinkoAccount } from "@/lib/aurinko";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const userDoc = await getUserDocument(session.uid, session.idToken);
    const fields = userDoc.fields || {};
    const token = readString(fields, "aurinko_access_token");
    const accountId = readString(fields, "aurinko_account_id");
    const email = readString(fields, "aurinko_email");
    const serviceType = readString(fields, "aurinko_service_type");
    const connectedAt = readString(fields, "aurinko_connected_at");

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
      serviceType: serviceType || null,
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
