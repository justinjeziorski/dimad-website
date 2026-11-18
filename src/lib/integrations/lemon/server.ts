import { getAdminDb } from "@/lib/firebase/admin";
import { writeUserFields } from "@/lib/firebase/server";
import { FIREBASE_WEB, getUserDocument, readString } from "@/lib/firebase/firestore-rest";
import type { LemonOrder, LemonProduct, LemonStorePayload } from "./types";
import { fetchWithTimeout } from "@/lib/with-timeout";

export type LemonIntegrationRecord = {
  apiKey: string;
  storeId: string;
  storeName: string;
  connectedAt: string;
};

type FsFields = Record<string, { stringValue?: string }>;

const LS_API = "https://api.lemonsqueezy.com/v1";

function integrationDocUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/lemon?key=${FIREBASE_WEB.apiKey}`;
}

function recordFromFields(fields: FsFields | undefined): LemonIntegrationRecord | null {
  const apiKey =
    readString(fields, "apiKey") ||
    readString(fields, "lemonApiKey") ||
    readString(fields, "lemon_api_key");
  const storeId =
    readString(fields, "storeId") ||
    readString(fields, "lemonStoreId") ||
    readString(fields, "lemon_store_id");
  if (!apiKey || !storeId) return null;
  return {
    apiKey,
    storeId,
    storeName: readString(fields, "storeName") || readString(fields, "lemon_store_name") || "",
    connectedAt: readString(fields, "connectedAt") || readString(fields, "lemon_connected_at") || ""
  };
}

function integrationFields(record: LemonIntegrationRecord) {
  return {
    apiKey: { stringValue: record.apiKey },
    storeId: { stringValue: record.storeId },
    storeName: { stringValue: record.storeName },
    connectedAt: { stringValue: record.connectedAt },
    lemonApiKey: { stringValue: record.apiKey },
    lemonStoreId: { stringValue: record.storeId },
    lemon_store_name: { stringValue: record.storeName },
    lemon_connected_at: { stringValue: record.connectedAt }
  };
}

function userPayload(record: LemonIntegrationRecord) {
  return {
    lemonApiKey: record.apiKey,
    lemonStoreId: record.storeId,
    lemon_store_name: record.storeName,
    lemon_connected_at: record.connectedAt
  };
}

async function writeIntegrationRest(uid: string, idToken: string, record: LemonIntegrationRecord) {
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
    console.error("Lemon integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=lemon&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(createUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields })
  }, 10000);
  if (create.ok) return;
  const err = await create.text();
  console.error("Lemon integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

export async function writeLemonIntegration(uid: string, record: LemonIntegrationRecord, idToken?: string) {
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("lemon").set(record);
    await db.collection("users").doc(uid).set(userPayload(record), { merge: true });
    console.log("Saved Lemon integration via admin", uid, record.storeId);
    return;
  } catch (err) {
    console.warn("Lemon admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  let integrationOk = false;
  try {
    await writeIntegrationRest(uid, idToken, record);
    integrationOk = true;
    console.log("Saved Lemon integration via REST", uid, record.storeId);
  } catch (err) {
    console.warn("Lemon integrations REST write failed", err instanceof Error ? err.message : err);
  }

  try {
    await writeUserFields(uid, idToken, userPayload(record));
    console.log("Saved Lemon fields on users/" + uid, record.storeId);
  } catch (err) {
    if (!integrationOk) {
      throw err instanceof Error && /permission/i.test(err.message)
        ? new Error("firestore_permission_denied")
        : new Error("firestore_write_failed");
    }
    console.warn("Lemon user-doc mirror skipped", err instanceof Error ? err.message : err);
  }
}

export async function readLemonIntegration(uid: string, idToken?: string) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("integrations").doc("lemon").get();
    if (snap.exists) {
      const data = snap.data() || {};
      const apiKey = String(data.apiKey || data.lemonApiKey || "");
      const storeId = String(data.storeId || data.lemonStoreId || "");
      if (apiKey && storeId) {
        return {
          apiKey,
          storeId,
          storeName: String(data.storeName || ""),
          connectedAt: String(data.connectedAt || "")
        } satisfies LemonIntegrationRecord;
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
    console.warn("Lemon admin read failed", err instanceof Error ? err.message : err);
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
    console.warn("Lemon integrations REST read failed", err instanceof Error ? err.message : err);
  }

  try {
    const userDoc = await getUserDocument(uid, idToken);
    return recordFromFields(userDoc.fields);
  } catch (err) {
    console.warn("Lemon user-doc REST read failed", err instanceof Error ? err.message : err);
  }

  return null;
}

export async function deleteLemonIntegration(uid: string, idToken?: string) {
  const clearFields = {
    lemonApiKey: "",
    lemonStoreId: "",
    lemon_store_name: "",
    lemon_connected_at: ""
  };
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("lemon").delete();
    await db.collection("users").doc(uid).set(clearFields, { merge: true });
    console.log("Deleted Lemon integration via admin", uid);
    return;
  } catch (err) {
    console.warn("Lemon admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const del = await fetchWithTimeout(integrationDocUrl(uid), { method: "DELETE", headers }, 10000);
  if (!del.ok && del.status !== 404) {
    console.warn("Lemon integrations REST delete failed", del.status);
  }
  try {
    await writeUserFields(uid, idToken, clearFields);
  } catch (err) {
    console.warn("Lemon user-doc clear failed", err instanceof Error ? err.message : err);
  }
  console.log("Deleted Lemon integration via REST", uid);
}

function lsHeaders(apiKey: string) {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${apiKey}`
  };
}

export async function verifyLemonCredentials(apiKey: string, storeId: string) {
  const res = await fetchWithTimeout(`${LS_API}/stores/${encodeURIComponent(storeId)}`, {
    headers: lsHeaders(apiKey)
  }, 12000);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.errors?.[0]?.detail || payload?.error || "invalid_lemon_credentials";
    console.error("Lemon store verify failed", res.status, message);
    throw new Error(res.status === 401 || res.status === 403 ? "invalid_lemon_credentials" : "lemon_request_failed");
  }
  const attrs = payload?.data?.attributes || {};
  return {
    storeName: String(attrs.name || attrs.domain || `Store ${storeId}`),
    currency: String(attrs.currency || "USD")
  };
}

function moneyFromCents(cents: number, currency: string) {
  const amount = Number(cents || 0) / 100;
  return {
    amount,
    display: `${amount.toFixed(2)} ${currency || "USD"}`
  };
}

export async function fetchLemonStoreData(record: LemonIntegrationRecord): Promise<LemonStorePayload> {
  const headers = lsHeaders(record.apiKey);
  const [storeRes, ordersRes, productsRes] = await Promise.all([
    fetchWithTimeout(`${LS_API}/stores/${encodeURIComponent(record.storeId)}`, { headers }, 12000),
    fetchWithTimeout(
      `${LS_API}/orders?filter[store_id]=${encodeURIComponent(record.storeId)}&page[size]=25`,
      { headers },
      15000
    ),
    fetchWithTimeout(
      `${LS_API}/products?filter[store_id]=${encodeURIComponent(record.storeId)}&page[size]=25`,
      { headers },
      15000
    )
  ]);

  const storePayload = await storeRes.json().catch(() => ({}));
  if (!storeRes.ok) {
    console.error("Lemon store fetch failed", storeRes.status, JSON.stringify(storePayload).slice(0, 240));
    throw new Error(storeRes.status === 401 || storeRes.status === 403 ? "invalid_lemon_credentials" : "lemon_request_failed");
  }

  const ordersPayload = await ordersRes.json().catch(() => ({}));
  const productsPayload = await productsRes.json().catch(() => ({}));
  if (!ordersRes.ok) console.warn("Lemon orders fetch skipped", ordersRes.status);
  if (!productsRes.ok) console.warn("Lemon products fetch skipped", productsRes.status);

  const storeAttrs = storePayload?.data?.attributes || {};
  const currency = String(storeAttrs.currency || "USD");
  const storeName = String(storeAttrs.name || record.storeName || `Store ${record.storeId}`);

  const orders: LemonOrder[] = (ordersPayload?.data || []).map((row: { id?: string; attributes?: Record<string, unknown> }) => {
    const attrs = row.attributes || {};
    return {
      id: String(row.id || ""),
      orderNumber: attrs.order_number != null ? Number(attrs.order_number) : null,
      total: Number(attrs.total || 0) / 100,
      currency: String(attrs.currency || currency),
      status: String(attrs.status || ""),
      customerName: String(attrs.user_name || attrs.customer_name || "Customer"),
      createdAt: String(attrs.created_at || "")
    };
  });

  const products: LemonProduct[] = (productsPayload?.data || []).map((row: { id?: string; attributes?: Record<string, unknown> }) => {
    const attrs = row.attributes || {};
    return {
      id: String(row.id || ""),
      name: String(attrs.name || "Product"),
      status: String(attrs.status || ""),
      price: Number(attrs.price || 0) / 100,
      currency: String(attrs.price_currency || currency)
    };
  });

  const grossVolume = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const gross = moneyFromCents(Math.round(grossVolume * 100), currency);

  return {
    storeId: record.storeId,
    storeName,
    currency,
    connectedAt: record.connectedAt,
    orders: orders.slice(0, 8),
    products: products.slice(0, 8),
    metrics: {
      orderCount: orders.length,
      productCount: products.length,
      grossVolume: gross.amount,
      grossDisplay: gross.display
    }
  };
}
