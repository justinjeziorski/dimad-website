import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/auth/session";
import {
  clearShopifyOauthCookies,
  newShopifyOauthState,
  normalizeShopifyShop,
  setShopifyOauthCookies,
  shopifyAppBase,
  shopifyAuthorizeUrl
} from "@/lib/integrations/shopify/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect() {
  const login = new URL("/login.html", shopifyAppBase());
  login.searchParams.set("reason", "login_required");
  login.searchParams.set("next", "/dashboard");
  return NextResponse.redirect(login);
}

function fail(wantsJson: boolean, status: number, error: string) {
  if (wantsJson) return NextResponse.json({ ok: false, error }, { status });
  const dest = new URL("/dashboard", shopifyAppBase());
  dest.searchParams.set("shopify", "error");
  dest.searchParams.set("reason", error);
  return clearShopifyOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const wantsJson = req.nextUrl.searchParams.get("format") === "json";
  const shop = normalizeShopifyShop(req.nextUrl.searchParams.get("shop"));

  if (!shop) {
    return fail(wantsJson, 400, "missing_shop");
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID || "";
  if (!clientId || clientId === "your_client_id_here") {
    return fail(wantsJson, 500, "missing_client_id");
  }

  const session = await requireFirebaseUser(req);
  if ("error" in session) {
    if (wantsJson) return session.error;
    return loginRedirect();
  }

  try {
    const state = newShopifyOauthState();
    const url = shopifyAuthorizeUrl(shop, state);
    const res = wantsJson ? NextResponse.json({ ok: true, url, shop }) : NextResponse.redirect(url);
    return setShopifyOauthCookies(res, state, session.uid, shop, session.idToken);
  } catch (err) {
    const error = err instanceof Error ? err.message : "shopify_connect_failed";
    console.error("Shopify connect start failed", error);
    return fail(wantsJson, 500, error === "missing_client_id" ? error : "shopify_connect_failed");
  }
}
