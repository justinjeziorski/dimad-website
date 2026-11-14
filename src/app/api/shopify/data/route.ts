import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { fetchShopifyStoreData, readShopifyIntegration } from "@/lib/shopify-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const record = await readShopifyIntegration(session.uid, session.idToken);
    console.log("Shopify data lookup", session.uid, record ? record.shop : "none");
    if (!record) {
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }

    const data = await fetchShopifyStoreData(record);
    return NextResponse.json(
      {
        ok: true,
        connected: true,
        ...data
      },
      { headers: noStore }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "shopify_request_failed";
    console.error("Shopify data route failed", session.uid, message);
    const safe =
      message === "firestore_permission_denied" ||
      message === "firestore_read_failed" ||
      message === "shopify_request_failed" ||
      message === "shopify_empty_response" ||
      message === "shopify_graphql_error" ||
      (message.includes(" ") && message.length < 180 && !/shp(at|ss)_/i.test(message));
    let connectedShop = "";
    try {
      const record = await readShopifyIntegration(session.uid, session.idToken);
      connectedShop = record?.shop || "";
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      {
        ok: false,
        connected: !!connectedShop,
        error: safe ? message : "shopify_request_failed",
        ...(connectedShop
          ? {
              shop: {
                name: connectedShop,
                currencyCode: "USD",
                email: "",
                domain: connectedShop
              },
              products: { edges: [] },
              orders: { edges: [] }
            }
          : {})
      },
      { status: connectedShop ? 200 : 502, headers: noStore }
    );
  }
}
