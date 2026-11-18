import { NextRequest, NextResponse } from "next/server";
import { fetchLemonStoreData, readLemonIntegration } from "@/lib/integrations/lemon/server";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const record = await readLemonIntegration(session.uid, session.idToken);
    console.log("Lemon data lookup", session.uid, record ? record.storeId : "none");
    if (!record) {
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }

    const data = await fetchLemonStoreData(record);
    return NextResponse.json({ ok: true, connected: true, ...data }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "lemon_request_failed";
    console.error("Lemon data route failed", session.uid, message);
    const safe =
      message === "firestore_permission_denied" ||
      message === "firestore_read_failed" ||
      message === "lemon_request_failed" ||
      message === "invalid_lemon_credentials" ||
      (message.includes(" ") && message.length < 180);

    let storeId = "";
    let storeName = "";
    try {
      const record = await readLemonIntegration(session.uid, session.idToken);
      storeId = record?.storeId || "";
      storeName = record?.storeName || storeId;
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      {
        ok: false,
        connected: !!storeId,
        error: safe ? message : "lemon_request_failed",
        ...(storeId
          ? {
              storeId,
              storeName: storeName || storeId,
              currency: "USD",
              orders: [],
              products: [],
              metrics: {
                orderCount: 0,
                productCount: 0,
                grossVolume: 0,
                grossDisplay: "0.00 USD"
              }
            }
          : {})
      },
      { status: storeId ? 200 : 502, headers: noStore }
    );
  }
}
