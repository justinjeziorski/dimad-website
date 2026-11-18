import { randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeUserFields } from "@/lib/firebase/server";
import { FIREBASE_WEB, getUserDocument, readString } from "@/lib/firebase/firestore-rest";
import type { GumroadProduct, GumroadSale, GumroadStorePayload } from "./types";
import { fetchWithTimeout } from "@/lib/with-timeout";

export type { GumroadStorePayload } from "./types";

export const GUMROAD_SCOPES = "edit_products view_sales view_profile view_payouts";

const OAUTH_COOKIES = ["gumroad_oauth_state", "gumroad_oauth_uid", "gumroad_fb_token"] as const;
const GR_API = "https://api.gumroad.com/v2";

export type GumroadIntegrationRecord = {
  accessToken: string;
  refreshToken: string;
  scope: string;
  userId: string;
  name: string;
  email: string;
  profileUrl: string;
  connectedAt: string;
};

type FsFields = Record<string, { stringValue?: string }>;

export function gumroadAppBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function gumroadRedirectUri() {
  const fromApp = `${gumroadAppBase()}/api/auth/gumroad/callback`;
  const configured = (process.env.GUMROAD_REDIRECT_URI || "").replace(/\/$/, "");
  if (!configured) return fromApp;
  try {
    const appHost = new URL(gumroadAppBase()).host;
    const cfgHost = new URL(configured).host;
    if (appHost === cfgHost) return configured;
    console.warn("GUMROAD_REDIRECT_URI host mismatch; using NEXT_PUBLIC_APP_URL callback", configured, fromApp);
  } catch {
    /* ignore bad env URI */
  }
  return fromApp;
}

export function newGumroadOauthState() {
  return randomBytes(32).toString("base64url");
}

export function gumroadStatesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function cookieOptions(maxAge = 600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}

export function setGumroadOauthCookies(res: NextResponse, state: string, uid: string, idToken: string) {
  const options = cookieOptions();
  res.cookies.set("gumroad_oauth_state", state, options);
  res.cookies.set("gumroad_oauth_uid", uid, options);
  if (idToken) {
    res.cookies.set("gumroad_fb_token", idToken, options);
    res.cookies.set("dimad_fb_token", idToken, { ...options, maxAge: 3300 });
  }
  return res;
}

export function clearGumroadOauthCookies(res: NextResponse) {
  const options = cookieOptions(0);
  for (const name of OAUTH_COOKIES) res.cookies.set(name, "", options);
  return res;
}

export function gumroadAuthorizeUrl(state: string) {
  const clientId = process.env.GUMROAD_CLIENT_ID || "";
  if (!clientId) throw new Error("missing_client_id");
  const url = new URL("https://gumroad.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", gumroadRedirectUri());
  url.searchParams.set("scope", GUMROAD_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGumroadCode(code: string) {
  const clientId = process.env.GUMROAD_CLIENT_ID || "";
  const clientSecret = process.env.GUMROAD_CLIENT_SECRET || "";
  if (!clientId) throw new Error("missing_client_id");
  if (!clientSecret) throw new Error("missing_client_secret");

  const res = await fetchWithTimeout(
    "https://api.gumroad.com/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: gumroadRedirectUri(),
        code
      }).toString()
    },
    15000
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = String(data.access_token || "");
  if (!res.ok || !accessToken) {
    console.error("Gumroad token exchange failed", res.status, JSON.stringify(data).slice(0, 300));
    throw new Error("token_exchange_failed");
  }
  return {
    accessToken,
    refreshToken: String(data.refresh_token || ""),
    scope: String(data.scope || GUMROAD_SCOPES)
  };
}

function integrationDocUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/gumroad?key=${FIREBASE_WEB.apiKey}`;
}

function recordFromFields(fields: FsFields | undefined): GumroadIntegrationRecord | null {
  const accessToken =
    readString(fields, "accessToken") ||
    readString(fields, "gumroadAccessToken") ||
    readString(fields, "gumroad_access_token");
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: readString(fields, "refreshToken") || readString(fields, "gumroad_refresh_token") || "",
    scope: readString(fields, "scope") || readString(fields, "gumroad_scope") || "",
    userId: readString(fields, "userId") || readString(fields, "gumroad_user_id") || "",
    name: readString(fields, "name") || readString(fields, "gumroad_name") || "",
    email: readString(fields, "email") || readString(fields, "gumroad_email") || "",
    profileUrl: readString(fields, "profileUrl") || readString(fields, "gumroad_profile_url") || "",
    connectedAt: readString(fields, "connectedAt") || readString(fields, "gumroad_connected_at") || ""
  };
}

function integrationFields(record: GumroadIntegrationRecord) {
  return {
    accessToken: { stringValue: record.accessToken },
    refreshToken: { stringValue: record.refreshToken },
    scope: { stringValue: record.scope },
    userId: { stringValue: record.userId },
    name: { stringValue: record.name },
    email: { stringValue: record.email },
    profileUrl: { stringValue: record.profileUrl },
    connectedAt: { stringValue: record.connectedAt },
    gumroadAccessToken: { stringValue: record.accessToken },
    gumroad_user_id: { stringValue: record.userId },
    gumroad_name: { stringValue: record.name },
    gumroad_email: { stringValue: record.email },
    gumroad_profile_url: { stringValue: record.profileUrl },
    gumroad_connected_at: { stringValue: record.connectedAt }
  };
}

function userPayload(record: GumroadIntegrationRecord) {
  return {
    gumroadAccessToken: record.accessToken,
    gumroad_user_id: record.userId,
    gumroad_name: record.name,
    gumroad_email: record.email,
    gumroad_profile_url: record.profileUrl,
    gumroad_connected_at: record.connectedAt
  };
}

async function writeIntegrationRest(uid: string, idToken: string, record: GumroadIntegrationRecord) {
  const fields = integrationFields(record);
  const mask = Object.keys(fields).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const patch = await fetchWithTimeout(
    `${integrationDocUrl(uid)}&${mask}`,
    { method: "PATCH", headers, body: JSON.stringify({ fields }) },
    10000
  );
  if (patch.ok) return;
  if (patch.status !== 404) {
    const err = await patch.text();
    console.error("Gumroad integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=gumroad&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(
    createUrl,
    { method: "POST", headers, body: JSON.stringify({ fields }) },
    10000
  );
  if (create.ok) return;
  const err = await create.text();
  console.error("Gumroad integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

export async function writeGumroadIntegration(uid: string, record: GumroadIntegrationRecord, idToken?: string) {
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("gumroad").set(record);
    await db.collection("users").doc(uid).set(userPayload(record), { merge: true });
    console.log("Saved Gumroad integration via admin", uid, record.userId || record.email);
    return;
  } catch (err) {
    console.warn("Gumroad admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  let integrationOk = false;
  try {
    await writeIntegrationRest(uid, idToken, record);
    integrationOk = true;
    console.log("Saved Gumroad integration via REST", uid, record.userId || record.email);
  } catch (err) {
    console.warn("Gumroad integrations REST write failed", err instanceof Error ? err.message : err);
  }

  try {
    await writeUserFields(uid, idToken, userPayload(record));
    console.log("Saved Gumroad fields on users/" + uid);
  } catch (err) {
    if (!integrationOk) {
      throw err instanceof Error && /permission/i.test(err.message)
        ? new Error("firestore_permission_denied")
        : new Error("firestore_write_failed");
    }
    console.warn("Gumroad user-doc mirror skipped", err instanceof Error ? err.message : err);
  }
}

export async function readGumroadIntegration(uid: string, idToken?: string) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("integrations").doc("gumroad").get();
    if (snap.exists) {
      const data = snap.data() || {};
      const accessToken = String(data.accessToken || data.gumroadAccessToken || "");
      if (accessToken) {
        return {
          accessToken,
          refreshToken: String(data.refreshToken || ""),
          scope: String(data.scope || ""),
          userId: String(data.userId || ""),
          name: String(data.name || ""),
          email: String(data.email || ""),
          profileUrl: String(data.profileUrl || ""),
          connectedAt: String(data.connectedAt || "")
        } satisfies GumroadIntegrationRecord;
      }
    }
    const user = await db.collection("users").doc(uid).get();
    const fromUser = recordFromFields(
      Object.fromEntries(
        Object.entries(user.data() || {}).map(([key, value]) => [key, { stringValue: String(value || "") }])
      )
    );
    if (fromUser) return fromUser;
  } catch (err) {
    console.warn("Gumroad admin read failed", err instanceof Error ? err.message : err);
  }

  if (!idToken) return null;

  try {
    const res = await fetchWithTimeout(integrationDocUrl(uid), {
      headers: { Authorization: `Bearer ${idToken}` }
    }, 10000);
    if (res.ok) {
      const data = await res.json();
      const fromIntegration = recordFromFields(data.fields as FsFields | undefined);
      if (fromIntegration) return fromIntegration;
    }
  } catch (err) {
    console.warn("Gumroad integrations REST read failed", err instanceof Error ? err.message : err);
  }

  try {
    const userDoc = await getUserDocument(uid, idToken);
    return recordFromFields(userDoc.fields);
  } catch (err) {
    console.warn("Gumroad user-doc REST read failed", err instanceof Error ? err.message : err);
  }

  return null;
}

export async function deleteGumroadIntegration(uid: string, idToken?: string) {
  const clearFields = {
    gumroadAccessToken: "",
    gumroad_user_id: "",
    gumroad_name: "",
    gumroad_email: "",
    gumroad_profile_url: "",
    gumroad_connected_at: ""
  };
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("gumroad").delete();
    await db.collection("users").doc(uid).set(clearFields, { merge: true });
    console.log("Deleted Gumroad integration via admin", uid);
    return;
  } catch (err) {
    console.warn("Gumroad admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const del = await fetchWithTimeout(integrationDocUrl(uid), { method: "DELETE", headers }, 10000);
  if (!del.ok && del.status !== 404) {
    console.warn("Gumroad integrations REST delete failed", del.status);
  }
  try {
    await writeUserFields(uid, idToken, clearFields);
  } catch (err) {
    console.warn("Gumroad user-doc clear failed", err instanceof Error ? err.message : err);
  }
  console.log("Deleted Gumroad integration via REST", uid);
}

function grHeaders(accessToken: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

export async function fetchGumroadUser(accessToken: string) {
  const res = await fetchWithTimeout(`${GR_API}/user`, { headers: grHeaders(accessToken) }, 12000);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload?.success === false) {
    console.error("Gumroad user fetch failed", res.status, JSON.stringify(payload).slice(0, 240));
    throw new Error(res.status === 401 || res.status === 403 ? "invalid_gumroad_credentials" : "gumroad_request_failed");
  }
  const user = payload?.user || {};
  return {
    userId: String(user.user_id || ""),
    name: String(user.name || user.email || "Gumroad creator"),
    email: String(user.email || ""),
    profileUrl: String(user.url || "")
  };
}

function moneyFromCents(cents: number, currency = "USD") {
  const amount = Number(cents || 0) / 100;
  return {
    amount,
    display: `${amount.toFixed(2)} ${currency}`
  };
}

export async function fetchGumroadStoreData(record: GumroadIntegrationRecord): Promise<GumroadStorePayload> {
  const headers = grHeaders(record.accessToken);
  const [userRes, salesRes, productsRes] = await Promise.all([
    fetchWithTimeout(`${GR_API}/user`, { headers }, 12000),
    fetchWithTimeout(`${GR_API}/sales`, { headers }, 15000),
    fetchWithTimeout(`${GR_API}/products`, { headers }, 15000)
  ]);

  const userPayload = await userRes.json().catch(() => ({}));
  if (!userRes.ok || userPayload?.success === false) {
    console.error("Gumroad user fetch failed", userRes.status, JSON.stringify(userPayload).slice(0, 240));
    throw new Error(
      userRes.status === 401 || userRes.status === 403 ? "invalid_gumroad_credentials" : "gumroad_request_failed"
    );
  }

  const salesPayload = await salesRes.json().catch(() => ({}));
  const productsPayload = await productsRes.json().catch(() => ({}));
  if (!salesRes.ok || salesPayload?.success === false) console.warn("Gumroad sales fetch skipped", salesRes.status);
  if (!productsRes.ok || productsPayload?.success === false) {
    console.warn("Gumroad products fetch skipped", productsRes.status);
  }

  const user = userPayload?.user || {};
  const name = String(user.name || record.name || user.email || "Gumroad creator");
  const email = String(user.email || record.email || "");
  const profileUrl = String(user.url || record.profileUrl || "");
  const userId = String(user.user_id || record.userId || "");

  const sales: GumroadSale[] = (salesPayload?.sales || []).map((row: Record<string, unknown>) => {
    const priceCents = Number(row.price_cents ?? row.price ?? 0);
    const currency = String(row.currency_symbol || row.currency || "USD").replace(/^\$/, "") || "USD";
    return {
      id: String(row.id || row.sale_id || ""),
      productName: String(row.product_name || row.name || "Sale"),
      email: String(row.email || "Buyer"),
      price: priceCents / 100,
      currency: currency === "$" ? "USD" : currency,
      createdAt: String(row.created_at || "")
    };
  });

  const products: GumroadProduct[] = (productsPayload?.products || []).map((row: Record<string, unknown>) => {
    const priceCents = Number(row.price_cents ?? row.price ?? 0);
    return {
      id: String(row.id || ""),
      name: String(row.name || "Product"),
      price: priceCents / 100,
      currency: "USD",
      salesCount: Number(row.sales_count || 0),
      published: Boolean(row.published)
    };
  });

  const grossCents = sales.reduce((sum, sale) => sum + Math.round(sale.price * 100), 0);
  const gross = moneyFromCents(grossCents, "USD");

  return {
    userId,
    name,
    email,
    profileUrl,
    connectedAt: record.connectedAt,
    sales: sales.slice(0, 8),
    products: products.slice(0, 8),
    metrics: {
      saleCount: sales.length,
      productCount: products.length,
      grossVolume: gross.amount,
      grossDisplay: gross.display
    }
  };
}
