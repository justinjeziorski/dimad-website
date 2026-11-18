import { NextRequest, NextResponse } from "next/server";
import {
  deleteGumroadIntegration,
  fetchGumroadStoreData,
  readGumroadIntegration
} from "@/lib/integrations/gumroad/oauth";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const record = await readGumroadIntegration(session.uid, session.idToken);
    console.log("Gumroad data lookup", session.uid, record ? record.userId || record.email || "linked" : "none");
    if (!record) {
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }

    const data = await fetchGumroadStoreData(record);
    return NextResponse.json({ ok: true, connected: true, ...data }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "gumroad_request_failed";
    console.error("Gumroad data route failed", session.uid, message);
    const safe =
      message === "firestore_permission_denied" ||
      message === "firestore_read_failed" ||
      message === "gumroad_request_failed" ||
      message === "invalid_gumroad_credentials" ||
      (message.includes(" ") && message.length < 180);

    let name = "";
    let email = "";
    let userId = "";
    try {
      const record = await readGumroadIntegration(session.uid, session.idToken);
      name = record?.name || "";
      email = record?.email || "";
      userId = record?.userId || "";
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      {
        ok: false,
        connected: !!(userId || email || name),
        error: safe ? message : "gumroad_request_failed",
        ...(userId || email || name
          ? {
              userId,
              name: name || email || "Gumroad",
              email,
              profileUrl: "",
              sales: [],
              products: [],
              metrics: {
                saleCount: 0,
                productCount: 0,
                grossVolume: 0,
                grossDisplay: "0.00 USD"
              }
            }
          : {})
      },
      { status: userId || email || name ? 200 : 502, headers: noStore }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    await deleteGumroadIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("Gumroad disconnect failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "firestore_permission_denied" ? message : "firestore_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}
