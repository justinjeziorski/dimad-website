import { NextRequest, NextResponse } from "next/server";
import {
  clearShopifyOauthCookies,
  exchangeShopifyCode,
  normalizeShopifyShop,
  shopifyAppBase,
  shopifyStatesMatch,
  writeShopifyIntegration
} from "@/lib/shopify-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function finish(query: string) {
  const dest = new URL("/dashboard", shopifyAppBase());
  const params = new URLSearchParams(query);
  params.forEach((value, key) => dest.searchParams.set(key, value));
  return clearShopifyOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const cookieState = req.cookies.get("shopify_oauth_state")?.value || "";
  const uid = req.cookies.get("shopify_oauth_uid")?.value || "";
  const cookieShop = normalizeShopifyShop(req.cookies.get("shopify_oauth_shop")?.value || "");
  const idToken = req.cookies.get("shopify_fb_token")?.value || "";
  const returnedState = req.nextUrl.searchParams.get("state") || "";
  const shop = normalizeShopifyShop(req.nextUrl.searchParams.get("shop"));
  const code = req.nextUrl.searchParams.get("code") || "";

  if (!uid || !cookieState || !/^[A-Za-z0-9_-]{16,128}$/.test(uid)) {
    console.error("Shopify callback missing oauth session");
    return finish("shopify=error&reason=login_required");
  }
  if (!shopifyStatesMatch(cookieState, returnedState)) {
    console.error("Shopify callback state mismatch");
    return finish("shopify=error&reason=csrf");
  }
  if (!shop || !cookieShop || shop !== cookieShop) {
    console.error("Shopify callback shop mismatch", shop, cookieShop);
    return finish("shopify=error&reason=shop_mismatch");
  }

  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    console.error("Shopify OAuth denied", oauthError);
    return finish("shopify=error&reason=denied");
  }

  if (!code || code.length > 512) {
    console.error("Shopify callback missing code");
    return finish("shopify=error&reason=missing_code");
  }

  try {
    const token = await exchangeShopifyCode(shop, code);
    await writeShopifyIntegration(
      uid,
      {
        shop,
        accessToken: token.accessToken,
        scope: token.scope,
        connectedAt: new Date().toISOString()
      },
      idToken || undefined
    );
    return finish("shopify=connected");
  } catch (err) {
    const reason = err instanceof Error ? err.message : "token_exchange_failed";
    console.error("Shopify callback failed", reason);
    const known = [
      "token_exchange_failed",
      "missing_client_id",
      "missing_client_secret",
      "firestore_permission_denied",
      "firestore_write_failed"
    ].includes(reason);
    return finish(`shopify=error&reason=${encodeURIComponent(known ? reason : "token_exchange_failed")}`);
  }
}
