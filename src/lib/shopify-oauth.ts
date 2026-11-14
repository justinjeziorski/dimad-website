import { randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "./firebase-admin";
import { FIREBASE_WEB } from "./firestore-rest";
import { fetchWithTimeout } from "./with-timeout";

export const SHOPIFY_SCOPES = "read_products,read_orders,read_analytics";

const OAUTH_COOKIES = ["shopify_oauth_state", "shopify_oauth_uid", "shopify_oauth_shop", "shopify_fb_token"] as const;

export type ShopifyIntegrationRecord = {
  shop: string;
  accessToken: string;
  scope: string;
  connectedAt: string;
};

export function shopifyAppBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function shopifyRedirectUri() {
  return (
    process.env.SHOPIFY_REDIRECT_URI ||
    `${shopifyAppBase()}/api/auth/shopify/callback`
  ).replace(/\/$/, "");
}

/** Normalize and validate a Shopify store hostname. */
export function normalizeShopifyShop(raw: string | null | undefined): string {
  if (!raw) return "";
  let shop = String(raw).trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return "";
  return shop;
}

export function newShopifyOauthState() {
  return randomBytes(32).toString("base64url");
}

export function shopifyStatesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600
  };
}

export function setShopifyOauthCookies(
  res: NextResponse,
  state: string,
  uid: string,
  shop: string,
  idToken: string
) {
  const options = cookieOptions();
  res.cookies.set("shopify_oauth_state", state, options);
  res.cookies.set("shopify_oauth_uid", uid, options);
  res.cookies.set("shopify_oauth_shop", shop, options);
  if (idToken) res.cookies.set("shopify_fb_token", idToken, options);
  return res;
}

export function clearShopifyOauthCookies(res: NextResponse) {
  const options = { ...cookieOptions(), maxAge: 0 };
  for (const name of OAUTH_COOKIES) res.cookies.set(name, "", options);
  return res;
}

export function shopifyAuthorizeUrl(shop: string, state: string) {
  const clientId = process.env.SHOPIFY_CLIENT_ID || "";
  if (!clientId || clientId === "your_client_id_here") throw new Error("missing_client_id");
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", shopifyRedirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeShopifyCode(shop: string, code: string) {
  const clientId = process.env.SHOPIFY_CLIENT_ID || "";
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || "";
  if (!clientId || clientId === "your_client_id_here") throw new Error("missing_client_id");
  if (!clientSecret || clientSecret === "your_client_secret_here") throw new Error("missing_client_secret");

  const res = await fetchWithTimeout(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    },
    12000
  );
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    console.error("Shopify token exchange failed", res.status, data.error || data.error_description);
    throw new Error("token_exchange_failed");
  }
  return {
    accessToken: String(data.access_token),
    scope: String(data.scope || SHOPIFY_SCOPES)
  };
}

function docUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/shopify?key=${FIREBASE_WEB.apiKey}`;
}

function toFields(record: ShopifyIntegrationRecord) {
  return {
    shop: { stringValue: record.shop },
    accessToken: { stringValue: record.accessToken },
    scope: { stringValue: record.scope },
    connectedAt: { stringValue: record.connectedAt },
    shopifyShop: { stringValue: record.shop },
    shopifyToken: { stringValue: record.accessToken }
  };
}

async function writeRest(uid: string, idToken: string, record: ShopifyIntegrationRecord) {
  const fields = toFields(record);
  const mask = Object.keys(fields).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const patch = await fetchWithTimeout(`${docUrl(uid)}&${mask}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields })
  }, 10000);
  if (patch.ok) return;
  if (patch.status !== 404) {
    const err = await patch.text();
    console.error("Shopify integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=shopify&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(createUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields })
  }, 10000);
  if (create.ok) return;
  const err = await create.text();
  console.error("Shopify integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

export async function writeShopifyIntegration(uid: string, record: ShopifyIntegrationRecord, idToken?: string) {
  try {
    await getAdminDb().collection("users").doc(uid).collection("integrations").doc("shopify").set(record);
    await getAdminDb().collection("users").doc(uid).set(
      {
        shopifyShop: record.shop,
        shopifyToken: record.accessToken,
        shopify_connected_at: record.connectedAt
      },
      { merge: true }
    );
    console.log("Saved Shopify integration", uid, record.shop);
    return;
  } catch (err) {
    console.warn("Shopify admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw err;
  }
  await writeRest(uid, idToken, record);
  console.log("Saved Shopify integration via REST", uid, record.shop);
}
