import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import {
  deleteShopifyIntegration,
  fetchShopifyStoreData,
  readShopifyIntegration,
  type ShopifyRangeKey
} from "@/lib/shopify-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function parseRange(raw: string | null): ShopifyRangeKey {
  if (raw === "today" || raw === "week" || raw === "month" || raw === "year" || raw === "custom") return raw;
  return "month";
}

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  const range = parseRange(req.nextUrl.searchParams.get("range"));
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  try {
    const record = await readShopifyIntegration(session.uid, session.idToken);
    console.log("Shopify data lookup", session.uid, record ? record.shop : "none", range);
    if (!record) {
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }

    const data = await fetchShopifyStoreData(record, { range, from, to });
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
              orders: { edges: [] },
              topProducts: [],
              lowStockCount: 0,
              activeProductCount: 0
            }
          : {})
      },
      { status: connectedShop ? 200 : 502, headers: noStore }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    await deleteShopifyIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("Shopify disconnect failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "firestore_permission_denied" ? message : "firestore_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}
