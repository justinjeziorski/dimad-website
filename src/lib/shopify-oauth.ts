import { randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "./firebase-admin";
import { writeUserFields } from "./firebase-server";
import { FIREBASE_WEB, getUserDocument, readString } from "./firestore-rest";
import type { ShopifyOrderNode, ShopifyProductNode, ShopifyRangeKey, ShopifyStorePayload } from "./shopify-types";
import { fetchWithTimeout } from "./with-timeout";

export type { ShopifyStorePayload, ShopifyRangeKey } from "./shopify-types";

export const SHOPIFY_SCOPES = "read_products,read_orders,read_customers,read_analytics";

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

/** Prefer the app base callback so local OAuth stays on localhost. */
export function shopifyRedirectUri() {
  const fromApp = `${shopifyAppBase()}/api/auth/shopify/callback`;
  const configured = (process.env.SHOPIFY_REDIRECT_URI || "").replace(/\/$/, "");
  if (!configured) return fromApp;
  try {
    const appHost = new URL(shopifyAppBase()).host;
    const cfgHost = new URL(configured).host;
    if (appHost === cfgHost) return configured;
    console.warn("SHOPIFY_REDIRECT_URI host mismatch; using NEXT_PUBLIC_APP_URL callback", configured, fromApp);
  } catch {
    /* ignore bad env URI */
  }
  return fromApp;
}

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

function cookieOptions(maxAge = 600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
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
  if (idToken) {
    res.cookies.set("shopify_fb_token", idToken, options);
    // Keep API cookie auth working after OAuth returns to the dashboard.
    res.cookies.set("dimad_fb_token", idToken, { ...options, maxAge: 3300 });
  }
  return res;
}

export function clearShopifyOauthCookies(res: NextResponse) {
  const options = cookieOptions(0);
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

type FsFields = Record<string, { stringValue?: string }>;

function recordFromUserFields(fields: FsFields | undefined): ShopifyIntegrationRecord | null {
  const shop = normalizeShopifyShop(readString(fields, "shopifyShop") || readString(fields, "shopify_shop"));
  const accessToken = readString(fields, "shopifyToken") || readString(fields, "shopify_token");
  if (!shop || !accessToken) return null;
  return {
    shop,
    accessToken,
    scope: readString(fields, "shopify_scope") || SHOPIFY_SCOPES,
    connectedAt: readString(fields, "shopify_connected_at") || ""
  };
}

function recordFromIntegrationFields(fields: FsFields | undefined): ShopifyIntegrationRecord | null {
  const shop = normalizeShopifyShop(
    readString(fields, "shop") || readString(fields, "shopifyShop") || readString(fields, "shopify_shop")
  );
  const accessToken =
    readString(fields, "accessToken") ||
    readString(fields, "shopifyToken") ||
    readString(fields, "shopify_token");
  if (!shop || !accessToken) return null;
  return {
    shop,
    accessToken,
    scope: readString(fields, "scope") || readString(fields, "shopify_scope") || SHOPIFY_SCOPES,
    connectedAt: readString(fields, "connectedAt") || readString(fields, "shopify_connected_at") || ""
  };
}

function integrationDocUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/shopify?key=${FIREBASE_WEB.apiKey}`;
}

function integrationFields(record: ShopifyIntegrationRecord) {
  return {
    shop: { stringValue: record.shop },
    accessToken: { stringValue: record.accessToken },
    scope: { stringValue: record.scope },
    connectedAt: { stringValue: record.connectedAt },
    shopifyShop: { stringValue: record.shop },
    shopifyToken: { stringValue: record.accessToken }
  };
}

async function writeIntegrationRest(uid: string, idToken: string, record: ShopifyIntegrationRecord) {
  const fields = integrationFields(record);
  const mask = Object.keys(fields).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const patch = await fetchWithTimeout(`${integrationDocUrl(uid)}&${mask}`, {
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

async function readIntegrationRest(uid: string, idToken: string): Promise<ShopifyIntegrationRecord | null> {
  const res = await fetchWithTimeout(integrationDocUrl(uid), {
    headers: { Authorization: `Bearer ${idToken}` }
  }, 10000);
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Shopify integration read failed", res.status, data?.error?.status || data?.error?.message);
    throw new Error(res.status === 403 ? "firestore_permission_denied" : "firestore_read_failed");
  }
  return recordFromIntegrationFields(data.fields as FsFields | undefined);
}

export async function writeShopifyIntegration(uid: string, record: ShopifyIntegrationRecord, idToken?: string) {
  const userPayload = {
    shopifyShop: record.shop,
    shopifyToken: record.accessToken,
    shopify_scope: record.scope,
    shopify_connected_at: record.connectedAt
  };

  // 1) Admin SDK (same path Stripe uses when credentials exist)
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("shopify").set(record);
    await db.collection("users").doc(uid).set(userPayload, { merge: true });
    console.log("Saved Shopify integration via admin", uid, record.shop);
    return;
  } catch (err) {
    console.warn("Shopify admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  // 2) REST integrations doc (works once firestore.rules integrations match is deployed)
  let integrationOk = false;
  try {
    await writeIntegrationRest(uid, idToken, record);
    integrationOk = true;
    console.log("Saved Shopify integration via REST", uid, record.shop);
  } catch (err) {
    console.warn("Shopify integrations REST write failed", err instanceof Error ? err.message : err);
  }

  // 3) User-doc fields always work with users/{uid} rules — keep as reliable fallback/mirror
  try {
    await writeUserFields(uid, idToken, userPayload);
    console.log("Saved Shopify fields on users/" + uid, record.shop);
  } catch (err) {
    if (!integrationOk) {
      console.error("Shopify user-doc write failed", err instanceof Error ? err.message : err);
      throw err instanceof Error && /permission/i.test(err.message)
        ? new Error("firestore_permission_denied")
        : new Error("firestore_write_failed");
    }
    console.warn("Shopify user-doc mirror skipped", err instanceof Error ? err.message : err);
  }
}

export async function readShopifyIntegration(uid: string, idToken?: string) {
  // 1) Admin SDK
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("integrations").doc("shopify").get();
    if (snap.exists) {
      const data = snap.data() || {};
      const subShop = normalizeShopifyShop(String(data.shop || data.shopifyShop || ""));
      const subToken = String(data.accessToken || data.shopifyToken || "");
      if (subShop && subToken) {
        return {
          shop: subShop,
          accessToken: subToken,
          scope: String(data.scope || SHOPIFY_SCOPES),
          connectedAt: String(data.connectedAt || "")
        } satisfies ShopifyIntegrationRecord;
      }
    }
    const user = await db.collection("users").doc(uid).get();
    const fromUser = recordFromUserFields(
      Object.fromEntries(
        Object.entries(user.data() || {}).map(([key, value]) => [key, { stringValue: String(value || "") }])
      )
    );
    if (fromUser) return fromUser;
  } catch (err) {
    console.warn("Shopify admin read failed", err instanceof Error ? err.message : err);
  }

  if (!idToken) return null;

  // 2) Integrations subcollection via REST
  try {
    const fromIntegration = await readIntegrationRest(uid, idToken);
    if (fromIntegration) return fromIntegration;
  } catch (err) {
    console.warn("Shopify integrations REST read failed", err instanceof Error ? err.message : err);
  }

  // 3) User document via REST
  try {
    const userDoc = await getUserDocument(uid, idToken);
    const fromUser = recordFromUserFields(userDoc.fields);
    if (fromUser) return fromUser;
  } catch (err) {
    console.warn("Shopify user-doc REST read failed", err instanceof Error ? err.message : err);
  }

  return null;
}

export async function deleteShopifyIntegration(uid: string, idToken?: string) {
  const clearFields = {
    shopifyShop: "",
    shopifyToken: "",
    shopify_scope: "",
    shopify_connected_at: ""
  };
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("shopify").delete();
    await db.collection("users").doc(uid).set(clearFields, { merge: true });
    console.log("Deleted Shopify integration via admin", uid);
    return;
  } catch (err) {
    console.warn("Shopify admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const del = await fetchWithTimeout(integrationDocUrl(uid), { method: "DELETE", headers }, 10000);
  if (!del.ok && del.status !== 404) {
    console.warn("Shopify integrations REST delete failed", del.status);
  }
  try {
    await writeUserFields(uid, idToken, clearFields);
  } catch (err) {
    console.warn("Shopify user-doc clear failed", err instanceof Error ? err.message : err);
  }
  console.log("Deleted Shopify integration via REST", uid);
}

async function shopifyGraphql<T>(shop: string, accessToken: string, query: string): Promise<{ data?: T; errors?: Array<{ message?: string }> }> {
  const res = await fetchWithTimeout(
    `https://${shop}/admin/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({ query })
    },
    20000
  );
  const payload = (await res.json().catch(() => ({}))) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };
  if (!res.ok) {
    console.error("Shopify GraphQL HTTP failed", res.status, JSON.stringify(payload).slice(0, 300));
    throw new Error("shopify_request_failed");
  }
  return payload;
}

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function resolveShopifyRange(
  range: ShopifyRangeKey = "month",
  fromRaw?: string | null,
  toRaw?: string | null
) {
  const now = new Date();
  const to = toRaw ? new Date(toRaw) : now;
  let from = fromRaw ? new Date(fromRaw) : startOfDay(now);
  let label = "This month";
  const key: ShopifyRangeKey = range;

  if (!fromRaw && !toRaw) {
    if (range === "today") {
      from = startOfDay(now);
      label = "Today";
    } else if (range === "week") {
      from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
      label = "This week";
    } else if (range === "year") {
      from = new Date(now.getFullYear(), 0, 1);
      label = "This year";
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      label = "This month";
    }
  } else {
    label = "Custom range";
  }

  const durationMs = Math.max(24 * 60 * 60 * 1000, to.getTime() - from.getTime());
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  return {
    range: key,
    label,
    from,
    to,
    fromIso: isoDate(from),
    toIso: isoDate(to),
    prevFromIso: isoDate(prevFrom),
    prevToIso: isoDate(prevTo)
  };
}

function money(amount: number, currencyCode: string) {
  return {
    amount,
    currencyCode,
    display: `${amount.toFixed(2)} ${currencyCode}`
  };
}

function change(current: number, previous: number) {
  const amount = current - previous;
  const percent = previous === 0 ? (current === 0 ? 0 : null) : (amount / previous) * 100;
  return { amount, percent };
}

function orderAmount(node: ShopifyOrderNode, field: "totalPriceSet" | "totalDiscountsSet" | "totalRefundedSet" = "totalPriceSet") {
  return Number(node[field]?.shopMoney?.amount || 0);
}

function summarizeOrders(orders: ShopifyOrderNode[], currencyCode: string) {
  let gross = 0;
  let discounts = 0;
  let refunds = 0;
  let fulfilled = 0;
  let unfulfilled = 0;
  let processing = 0;
  let newCount = 0;
  let returningCount = 0;
  const productMap = new Map<string, { title: string; units: number; gross: number }>();

  for (const node of orders) {
    gross += orderAmount(node, "totalPriceSet");
    discounts += orderAmount(node, "totalDiscountsSet");
    refunds += orderAmount(node, "totalRefundedSet");
    const fulfill = String(node.displayFulfillmentStatus || "").toUpperCase();
    if (fulfill.includes("FULFILL") && !fulfill.includes("UNFULFILL") && !fulfill.includes("PARTIAL")) fulfilled += 1;
    else if (fulfill.includes("UNFULFILL") || !fulfill) unfulfilled += 1;
    else processing += 1;

    const ordersForCustomer = Number(node.customer?.numberOfOrders || 0);
    if (ordersForCustomer <= 1) newCount += 1;
    else returningCount += 1;

    for (const edge of node.lineItems?.edges || []) {
      const title = edge.node.title || "Product";
      const qty = Number(edge.node.quantity || 0);
      const lineGross = Number(edge.node.originalTotalSet?.shopMoney?.amount || 0);
      const prev = productMap.get(title) || { title, units: 0, gross: 0 };
      prev.units += qty;
      prev.gross += lineGross;
      productMap.set(title, prev);
    }
  }

  const net = Math.max(0, gross - discounts - refunds);
  const orderCount = orders.length;
  const aov = orderCount ? net / orderCount : 0;
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.gross - a.gross)
    .slice(0, 8)
    .map((row, index) => ({
      id: `top-${index}-${row.title}`,
      title: row.title,
      status: "ACTIVE",
      totalInventory: null as number | null,
      unitsSold: row.units,
      grossSales: row.gross
    }));

  return {
    gross,
    discounts,
    refunds,
    net,
    orderCount,
    aov,
    fulfilled,
    unfulfilled,
    processing,
    newCount,
    returningCount,
    topProducts,
    moneyGross: money(gross, currencyCode),
    moneyNet: money(net, currencyCode),
    moneyDiscounts: money(discounts, currencyCode),
    moneyRefunds: money(refunds, currencyCode),
    moneyAov: money(aov, currencyCode),
    moneyRevenue: money(net, currencyCode)
  };
}

async function fetchOrdersWindow(
  record: ShopifyIntegrationRecord,
  fromIso: string,
  toIso: string
): Promise<ShopifyOrderNode[]> {
  const query = `
    {
      orders(first: 100, sortKey: CREATED_AT, reverse: true, query: "created_at:>=${fromIso} created_at:<=${toIso}") {
        edges {
          node {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet { shopMoney { amount currencyCode } }
            totalDiscountsSet { shopMoney { amount currencyCode } }
            totalRefundedSet { shopMoney { amount currencyCode } }
            customer { id numberOfOrders }
            lineItems(first: 20) {
              edges {
                node {
                  title
                  quantity
                  originalTotalSet { shopMoney { amount currencyCode } }
                }
              }
            }
          }
        }
      }
    }
  `;
  try {
    const payload = await shopifyGraphql<{ orders?: { edges: Array<{ node: ShopifyOrderNode }> } }>(
      record.shop,
      record.accessToken,
      query
    );
    if (payload.errors?.length) {
      console.warn("Shopify orders window skipped", payload.errors[0]?.message);
      return [];
    }
    return (payload.data?.orders?.edges || []).map((edge) => edge.node);
  } catch (err) {
    console.warn("Shopify orders window failed", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function fetchShopifyStoreData(
  record: ShopifyIntegrationRecord,
  options?: { range?: ShopifyRangeKey; from?: string | null; to?: string | null }
): Promise<ShopifyStorePayload> {
  const window = resolveShopifyRange(options?.range || "month", options?.from, options?.to);

  const shopPayload = await shopifyGraphql<{
    shop?: {
      name?: string;
      currencyCode?: string;
      email?: string;
      primaryDomain?: { host?: string } | null;
      myshopifyDomain?: string;
    };
  }>(
    record.shop,
    record.accessToken,
    `{ shop { name currencyCode email primaryDomain { host } myshopifyDomain } }`
  );

  if (shopPayload.errors?.length) {
    console.error("Shopify shop query errors", shopPayload.errors[0]?.message);
    throw new Error(shopPayload.errors[0]?.message || "shopify_graphql_error");
  }
  const shop = shopPayload.data?.shop;
  if (!shop?.name) throw new Error("shopify_empty_response");
  const currencyCode = String(shop.currencyCode || "USD");

  let products: ShopifyStorePayload["products"] = { edges: [] };
  try {
    const productsPayload = await shopifyGraphql<{
      products?: { edges: Array<{ node: ShopifyProductNode }> };
    }>(
      record.shop,
      record.accessToken,
      `{ products(first: 50) { edges { node { id title status totalInventory } } } }`
    );
    if (!productsPayload.errors?.length && productsPayload.data?.products) {
      products = productsPayload.data.products;
    } else if (productsPayload.errors?.length) {
      console.warn("Shopify products query skipped", productsPayload.errors[0]?.message);
    }
  } catch (err) {
    console.warn("Shopify products fetch skipped", err instanceof Error ? err.message : err);
  }

  const [currentOrders, previousOrders] = await Promise.all([
    fetchOrdersWindow(record, window.fromIso, window.toIso),
    fetchOrdersWindow(record, window.prevFromIso, window.prevToIso)
  ]);

  const current = summarizeOrders(currentOrders, currencyCode);
  const previous = summarizeOrders(previousOrders, currencyCode);

  const inventoryByTitle = new Map(
    products.edges.map(({ node }) => [node.title.toLowerCase(), node.totalInventory])
  );
  const topProducts = current.topProducts.map((row) => ({
    ...row,
    totalInventory: inventoryByTitle.get(row.title.toLowerCase()) ?? null
  }));

  const activeProductCount = products.edges.filter(({ node }) => String(node.status).toUpperCase() === "ACTIVE").length;
  const lowStockCount = products.edges.filter(({ node }) => {
    const stock = node.totalInventory;
    return typeof stock === "number" && stock >= 0 && stock <= 5;
  }).length;

  let sessions: number | null = null;
  let conversionRate: number | null = null;
  const topReferrers: Array<{ source: string; sessions: number }> = [];
  try {
    const ql = `FROM sessions SHOW sessions, conversion_rate SINCE ${window.fromIso} UNTIL ${window.toIso}`;
    const analytics = await shopifyGraphql<{
      shopifyqlQuery?: {
        tableData?: { rowData?: Array<{ values?: string[] }> };
      };
    }>(
      record.shop,
      record.accessToken,
      `{ shopifyqlQuery(query: ${JSON.stringify(ql)}) { tableData { rowData { values } } } }`
    );
    const values = analytics.data?.shopifyqlQuery?.tableData?.rowData?.[0]?.values || [];
    if (values[0] != null) sessions = Number(values[0]) || 0;
    if (values[1] != null) conversionRate = Number(values[1]) || 0;
  } catch (err) {
    console.warn("Shopify analytics skipped", err instanceof Error ? err.message : err);
  }

  const customerTotal = current.newCount + current.returningCount;
  const recentOrders = currentOrders.slice(0, 8);

  return {
    shop: {
      name: String(shop.name),
      currencyCode,
      email: String(shop.email || ""),
      domain: String(shop.primaryDomain?.host || shop.myshopifyDomain || record.shop)
    },
    products: {
      edges: products.edges.slice(0, 12)
    },
    orders: { edges: recentOrders.map((node) => ({ node })) },
    topProducts,
    lowStockCount,
    activeProductCount,
    period: {
      range: window.range,
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      label: window.label,
      grossSales: current.moneyGross,
      netSales: current.moneyNet,
      discounts: current.moneyDiscounts,
      refunds: current.moneyRefunds,
      revenue: current.moneyRevenue,
      orderCount: current.orderCount,
      aov: current.moneyAov,
      changes: {
        grossSales: change(current.gross, previous.gross),
        netSales: change(current.net, previous.net),
        refunds: change(current.refunds, previous.refunds),
        orderCount: change(current.orderCount, previous.orderCount),
        aov: change(current.aov, previous.aov)
      },
      fulfillment: {
        fulfilled: current.fulfilled,
        unfulfilled: current.unfulfilled,
        processing: current.processing
      },
      customers: {
        newCount: current.newCount,
        returningCount: current.returningCount,
        newShare: customerTotal ? current.newCount / customerTotal : 0,
        returningShare: customerTotal ? current.returningCount / customerTotal : 0
      },
      traffic: {
        sessions,
        conversionRate,
        topReferrers
      }
    },
    connectedAt: record.connectedAt
  };
}
