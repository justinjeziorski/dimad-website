import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type AccountBase,
  type Transaction
} from "plaid";
import { getAdminDb } from "./firebase-admin";
import { writeUserFields } from "./firebase-server";
import { FIREBASE_WEB, getUserDocument, readString } from "./firestore-rest";
import type { PlaidAccountBalance, PlaidPayload, PlaidTransactionItem } from "./plaid-types";
import { fetchWithTimeout } from "./with-timeout";

export type { PlaidPayload } from "./plaid-types";

export type PlaidIntegrationRecord = {
  accessToken: string;
  itemId: string;
  institutionName: string;
  connectedAt: string;
  cursor?: string;
};

type FsFields = Record<string, { stringValue?: string }>;

let plaidClient: PlaidApi | null = null;

function plaidEnvKey() {
  const raw = String(process.env.PLAID_ENV || "Sandbox").trim();
  if (/^production$/i.test(raw)) return "Production";
  if (/^development$/i.test(raw)) return "Development";
  return "Sandbox";
}

export function getPlaidClient() {
  if (plaidClient) return plaidClient;
  const clientId = process.env.PLAID_CLIENT_ID || "";
  const secret = process.env.PLAID_SECRET || "";
  if (!clientId) throw new Error("missing_plaid_client_id");
  if (!secret) throw new Error("missing_plaid_secret");
  const basePath = PlaidEnvironments[plaidEnvKey()] || PlaidEnvironments.Sandbox;
  plaidClient = new PlaidApi(
    new Configuration({
      basePath,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret
        }
      }
    })
  );
  return plaidClient;
}

export function plaidRedirectUri() {
  const uri = String(process.env.PLAID_REDIRECT_URI || "").trim();
  if (!uri) return "";
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== "https:") return "";
    return uri;
  } catch {
    return "";
  }
}

export async function createPlaidLinkToken(userId: string) {
  const client = getPlaidClient();
  const redirectUri = plaidRedirectUri();
  const request: Parameters<PlaidApi["linkTokenCreate"]>[0] = {
    user: { client_user_id: userId },
    client_name: "Dimad",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en"
  };
  if (redirectUri) request.redirect_uri = redirectUri;
  const response = await client.linkTokenCreate(request);
  const linkToken = response.data.link_token;
  if (!linkToken) throw new Error("plaid_link_token_failed");
  return linkToken;
}

export async function exchangePlaidPublicToken(publicToken: string) {
  const client = getPlaidClient();
  const response = await client.itemPublicTokenExchange({ public_token: publicToken });
  const accessToken = response.data.access_token;
  const itemId = response.data.item_id;
  if (!accessToken || !itemId) throw new Error("plaid_exchange_failed");
  return { accessToken, itemId };
}

function integrationDocUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/plaid?key=${FIREBASE_WEB.apiKey}`;
}

function recordFromFields(fields: FsFields | undefined): PlaidIntegrationRecord | null {
  const accessToken =
    readString(fields, "accessToken") ||
    readString(fields, "plaidAccessToken") ||
    readString(fields, "plaid_access_token");
  if (!accessToken) return null;
  return {
    accessToken,
    itemId: readString(fields, "itemId") || readString(fields, "plaid_item_id") || "",
    institutionName: readString(fields, "institutionName") || readString(fields, "plaid_institution_name") || "",
    connectedAt: readString(fields, "connectedAt") || readString(fields, "plaid_connected_at") || "",
    cursor: readString(fields, "cursor") || readString(fields, "plaid_cursor") || ""
  };
}

function integrationFields(record: PlaidIntegrationRecord) {
  return {
    accessToken: { stringValue: record.accessToken },
    itemId: { stringValue: record.itemId },
    institutionName: { stringValue: record.institutionName },
    connectedAt: { stringValue: record.connectedAt },
    cursor: { stringValue: record.cursor || "" },
    plaidAccessToken: { stringValue: record.accessToken },
    plaid_item_id: { stringValue: record.itemId },
    plaid_institution_name: { stringValue: record.institutionName },
    plaid_connected_at: { stringValue: record.connectedAt },
    plaid_cursor: { stringValue: record.cursor || "" }
  };
}

function userPayload(record: PlaidIntegrationRecord) {
  return {
    plaidAccessToken: record.accessToken,
    plaid_item_id: record.itemId,
    plaid_institution_name: record.institutionName,
    plaid_connected_at: record.connectedAt
  };
}

async function writeIntegrationRest(uid: string, idToken: string, record: PlaidIntegrationRecord) {
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
    console.error("Plaid integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=plaid&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(
    createUrl,
    { method: "POST", headers, body: JSON.stringify({ fields }) },
    10000
  );
  if (create.ok) return;
  const err = await create.text();
  console.error("Plaid integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

export async function writePlaidIntegration(uid: string, record: PlaidIntegrationRecord, idToken?: string) {
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("plaid").set(record);
    await db.collection("users").doc(uid).set(userPayload(record), { merge: true });
    console.log("Saved Plaid integration via admin", uid, record.itemId);
    return;
  } catch (err) {
    console.warn("Plaid admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  let integrationOk = false;
  try {
    await writeIntegrationRest(uid, idToken, record);
    integrationOk = true;
  } catch (err) {
    console.warn("Plaid integrations REST write failed", err instanceof Error ? err.message : err);
  }

  try {
    await writeUserFields(uid, idToken, userPayload(record));
  } catch (err) {
    if (!integrationOk) {
      throw err instanceof Error && /permission/i.test(err.message)
        ? new Error("firestore_permission_denied")
        : new Error("firestore_write_failed");
    }
    console.warn("Plaid user-doc mirror skipped", err instanceof Error ? err.message : err);
  }
}

export async function readPlaidIntegration(uid: string, idToken?: string) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("integrations").doc("plaid").get();
    if (snap.exists) {
      const data = snap.data() || {};
      const accessToken = String(data.accessToken || data.plaidAccessToken || "");
      if (accessToken) {
        return {
          accessToken,
          itemId: String(data.itemId || ""),
          institutionName: String(data.institutionName || ""),
          connectedAt: String(data.connectedAt || ""),
          cursor: String(data.cursor || "")
        } satisfies PlaidIntegrationRecord;
      }
    }
  } catch (err) {
    console.warn("Plaid admin read failed", err instanceof Error ? err.message : err);
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
    console.warn("Plaid integrations REST read failed", err instanceof Error ? err.message : err);
  }

  try {
    const userDoc = await getUserDocument(uid, idToken);
    return recordFromFields(userDoc.fields);
  } catch (err) {
    console.warn("Plaid user-doc REST read failed", err instanceof Error ? err.message : err);
  }

  return null;
}

export async function deletePlaidIntegration(uid: string, idToken?: string) {
  const clearFields = {
    plaidAccessToken: "",
    plaid_item_id: "",
    plaid_institution_name: "",
    plaid_connected_at: "",
    plaid_cursor: ""
  };
  try {
    const db = getAdminDb();
    const existing = await db.collection("users").doc(uid).collection("integrations").doc("plaid").get();
    const accessToken = String(existing.data()?.accessToken || existing.data()?.plaidAccessToken || "");
    if (accessToken) {
      try {
        await getPlaidClient().itemRemove({ access_token: accessToken });
      } catch (err) {
        console.warn("Plaid itemRemove skipped", err instanceof Error ? err.message : err);
      }
    }
    await db.collection("users").doc(uid).collection("integrations").doc("plaid").delete();
    await db.collection("users").doc(uid).set(clearFields, { merge: true });
    return;
  } catch (err) {
    console.warn("Plaid admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  await fetchWithTimeout(integrationDocUrl(uid), { method: "DELETE", headers }, 10000).catch(() => null);
  try {
    await writeUserFields(uid, idToken, clearFields);
  } catch (err) {
    console.warn("Plaid user-doc clear failed", err instanceof Error ? err.message : err);
  }
}

function money(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function mapAccount(account: AccountBase): PlaidAccountBalance {
  return {
    accountId: String(account.account_id || ""),
    name: String(account.name || "Account"),
    officialName: String(account.official_name || ""),
    type: String(account.type || ""),
    subtype: String(account.subtype || ""),
    mask: String(account.mask || ""),
    current: account.balances?.current ?? null,
    available: account.balances?.available ?? null,
    isoCurrencyCode: String(account.balances?.iso_currency_code || account.balances?.unofficial_currency_code || "USD")
  };
}

function mapTransaction(tx: Transaction): PlaidTransactionItem {
  const cats = Array.isArray(tx.category) ? tx.category.filter(Boolean) : [];
  const pfc = tx.personal_finance_category as { primary?: string; detailed?: string } | null | undefined;
  const category = cats[0] || pfc?.primary || pfc?.detailed || "Uncategorized";
  return {
    transactionId: String(tx.transaction_id || ""),
    name: String(tx.name || "Transaction"),
    merchantName: String(tx.merchant_name || tx.name || "Merchant"),
    amount: Number(tx.amount || 0),
    date: String(tx.date || ""),
    category: String(category),
    pending: Boolean(tx.pending)
  };
}

export async function fetchPlaidDashboardData(
  uid: string,
  record: PlaidIntegrationRecord,
  idToken?: string
): Promise<PlaidPayload> {
  const client = getPlaidClient();

  let balances;
  try {
    balances = await client.accountsBalanceGet({ access_token: record.accessToken });
  } catch (err) {
    console.error("Plaid balances failed", err);
    throw new Error("invalid_plaid_credentials");
  }

  const accounts = (balances.data.accounts || []).map(mapAccount);
  const currency = accounts[0]?.isoCurrencyCode || "USD";

  let cashAvailable = 0;
  let creditBalance = 0;
  for (const account of accounts) {
    const type = account.type.toLowerCase();
    const subtype = account.subtype.toLowerCase();
    if (type === "depository" || subtype === "checking" || subtype === "savings") {
      cashAvailable += Number(account.available ?? account.current ?? 0);
    } else if (type === "credit" || subtype === "credit card") {
      creditBalance += Number(account.current ?? 0);
    }
  }
  const netLiquidity = cashAvailable - creditBalance;

  const added: Transaction[] = [];
  let cursor = record.cursor || undefined;
  let hasMore = true;
  let pages = 0;
  while (hasMore && pages < 4) {
    pages += 1;
    const sync = await client.transactionsSync({
      access_token: record.accessToken,
      ...(cursor ? { cursor } : {})
    });
    added.push(...(sync.data.added || []));
    cursor = sync.data.next_cursor || cursor;
    hasMore = Boolean(sync.data.has_more);
  }

  if (cursor && cursor !== record.cursor) {
    try {
      await writePlaidIntegration(uid, { ...record, cursor }, idToken);
    } catch (err) {
      console.warn("Plaid cursor save skipped", err instanceof Error ? err.message : err);
    }
  }

  const recentTransactions = added
    .map(mapTransaction)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 10);

  return {
    itemId: record.itemId,
    institutionName: record.institutionName || "Linked bank",
    connectedAt: record.connectedAt,
    accounts,
    recentTransactions,
    metrics: {
      cashAvailable,
      cashAvailableDisplay: money(cashAvailable, currency),
      creditBalance,
      creditBalanceDisplay: money(creditBalance, currency),
      netLiquidity,
      netLiquidityDisplay: money(netLiquidity, currency),
      accountCount: accounts.length
    }
  };
}
