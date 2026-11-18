import { randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeUserFields } from "@/lib/firebase/server";
import { FIREBASE_WEB, getUserDocument, readString } from "@/lib/firebase/firestore-rest";
import type { PatreonCampaignPayload, PatreonTier } from "./types";
import { fetchWithTimeout } from "@/lib/with-timeout";

export type { PatreonCampaignPayload } from "./types";

export const PATREON_SCOPES = "identity campaigns campaigns.members";

const OAUTH_COOKIES = ["patreon_oauth_state", "patreon_oauth_uid", "patreon_fb_token"] as const;
const PATREON_TOKEN = "https://www.patreon.com/api/oauth2/token";
const PATREON_API = "https://www.patreon.com/api/oauth2/v2";

export type PatreonIntegrationRecord = {
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresAt: string;
  campaignId: string;
  campaignName: string;
  connectedAt: string;
};

type FsFields = Record<string, { stringValue?: string }>;

export function patreonAppBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function patreonRedirectUri() {
  const fromApp = `${patreonAppBase()}/api/auth/patreon/callback`;
  const configured = (process.env.PATREON_REDIRECT_URI || "").replace(/\/$/, "");
  if (!configured) return fromApp;
  try {
    const appHost = new URL(patreonAppBase()).host;
    const cfgHost = new URL(configured).host;
    if (appHost === cfgHost) return configured;
    console.warn("PATREON_REDIRECT_URI host mismatch; using NEXT_PUBLIC_APP_URL callback", configured, fromApp);
  } catch {
    /* ignore bad env URI */
  }
  return fromApp;
}

export function newPatreonOauthState() {
  return randomBytes(32).toString("base64url");
}

export function patreonStatesMatch(left: string, right: string) {
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

export function setPatreonOauthCookies(res: NextResponse, state: string, uid: string, idToken: string) {
  const options = cookieOptions();
  res.cookies.set("patreon_oauth_state", state, options);
  res.cookies.set("patreon_oauth_uid", uid, options);
  if (idToken) {
    res.cookies.set("patreon_fb_token", idToken, options);
    res.cookies.set("dimad_fb_token", idToken, { ...options, maxAge: 3300 });
  }
  return res;
}

export function clearPatreonOauthCookies(res: NextResponse) {
  const options = cookieOptions(0);
  for (const name of OAUTH_COOKIES) res.cookies.set(name, "", options);
  return res;
}

export function patreonAuthorizeUrl(state: string) {
  const clientId = process.env.PATREON_CLIENT_ID || "";
  if (!clientId) throw new Error("missing_client_id");
  const url = new URL("https://www.patreon.com/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", patreonRedirectUri());
  url.searchParams.set("scope", PATREON_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

function expiresAtFromSeconds(expiresIn: unknown) {
  const seconds = Number(expiresIn);
  const skewMs = 60_000;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(Date.now() + seconds * 1000 - skewMs).toISOString();
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetchWithTimeout(
    PATREON_TOKEN,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(body).toString()
    },
    15000
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.access_token) {
    console.error("Patreon token request failed", res.status, JSON.stringify(data).slice(0, 300));
    throw new Error("token_exchange_failed");
  }
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token || ""),
    scope: String(data.scope || PATREON_SCOPES),
    expiresAt: expiresAtFromSeconds(data.expires_in)
  };
}

export async function exchangePatreonCode(code: string) {
  const clientId = process.env.PATREON_CLIENT_ID || "";
  const clientSecret = process.env.PATREON_CLIENT_SECRET || "";
  if (!clientId) throw new Error("missing_client_id");
  if (!clientSecret) throw new Error("missing_client_secret");
  return tokenRequest({
    code,
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: patreonRedirectUri()
  });
}

export async function refreshPatreonToken(refreshToken: string) {
  const clientId = process.env.PATREON_CLIENT_ID || "";
  const clientSecret = process.env.PATREON_CLIENT_SECRET || "";
  if (!clientId) throw new Error("missing_client_id");
  if (!clientSecret) throw new Error("missing_client_secret");
  if (!refreshToken) throw new Error("missing_refresh_token");
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  });
}

function integrationDocUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/patreon?key=${FIREBASE_WEB.apiKey}`;
}

function recordFromFields(fields: FsFields | undefined): PatreonIntegrationRecord | null {
  const accessToken =
    readString(fields, "accessToken") ||
    readString(fields, "patreonAccessToken") ||
    readString(fields, "patreon_access_token");
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: readString(fields, "refreshToken") || readString(fields, "patreon_refresh_token") || "",
    scope: readString(fields, "scope") || readString(fields, "patreon_scope") || "",
    expiresAt: readString(fields, "expiresAt") || readString(fields, "patreon_expires_at") || "",
    campaignId: readString(fields, "campaignId") || readString(fields, "patreon_campaign_id") || "",
    campaignName: readString(fields, "campaignName") || readString(fields, "patreon_campaign_name") || "",
    connectedAt: readString(fields, "connectedAt") || readString(fields, "patreon_connected_at") || ""
  };
}

function integrationFields(record: PatreonIntegrationRecord) {
  return {
    accessToken: { stringValue: record.accessToken },
    refreshToken: { stringValue: record.refreshToken },
    scope: { stringValue: record.scope },
    expiresAt: { stringValue: record.expiresAt },
    campaignId: { stringValue: record.campaignId },
    campaignName: { stringValue: record.campaignName },
    connectedAt: { stringValue: record.connectedAt },
    patreonAccessToken: { stringValue: record.accessToken },
    patreon_refresh_token: { stringValue: record.refreshToken },
    patreon_expires_at: { stringValue: record.expiresAt },
    patreon_campaign_id: { stringValue: record.campaignId },
    patreon_campaign_name: { stringValue: record.campaignName },
    patreon_connected_at: { stringValue: record.connectedAt }
  };
}

function userPayload(record: PatreonIntegrationRecord) {
  return {
    patreonAccessToken: record.accessToken,
    patreon_refresh_token: record.refreshToken,
    patreon_expires_at: record.expiresAt,
    patreon_campaign_id: record.campaignId,
    patreon_campaign_name: record.campaignName,
    patreon_connected_at: record.connectedAt
  };
}

async function writeIntegrationRest(uid: string, idToken: string, record: PatreonIntegrationRecord) {
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
    console.error("Patreon integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=patreon&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(
    createUrl,
    { method: "POST", headers, body: JSON.stringify({ fields }) },
    10000
  );
  if (create.ok) return;
  const err = await create.text();
  console.error("Patreon integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

export async function writePatreonIntegration(uid: string, record: PatreonIntegrationRecord, idToken?: string) {
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("patreon").set(record);
    await db.collection("users").doc(uid).set(userPayload(record), { merge: true });
    console.log("Saved Patreon integration via admin", uid, record.campaignId || record.campaignName);
    return;
  } catch (err) {
    console.warn("Patreon admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  let integrationOk = false;
  try {
    await writeIntegrationRest(uid, idToken, record);
    integrationOk = true;
    console.log("Saved Patreon integration via REST", uid, record.campaignId || record.campaignName);
  } catch (err) {
    console.warn("Patreon integrations REST write failed", err instanceof Error ? err.message : err);
  }

  try {
    await writeUserFields(uid, idToken, userPayload(record));
    console.log("Saved Patreon fields on users/" + uid);
  } catch (err) {
    if (!integrationOk) {
      throw err instanceof Error && /permission/i.test(err.message)
        ? new Error("firestore_permission_denied")
        : new Error("firestore_write_failed");
    }
    console.warn("Patreon user-doc mirror skipped", err instanceof Error ? err.message : err);
  }
}

export async function readPatreonIntegration(uid: string, idToken?: string) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("integrations").doc("patreon").get();
    if (snap.exists) {
      const data = snap.data() || {};
      const accessToken = String(data.accessToken || data.patreonAccessToken || "");
      if (accessToken) {
        return {
          accessToken,
          refreshToken: String(data.refreshToken || data.patreon_refresh_token || ""),
          scope: String(data.scope || ""),
          expiresAt: String(data.expiresAt || data.patreon_expires_at || ""),
          campaignId: String(data.campaignId || data.patreon_campaign_id || ""),
          campaignName: String(data.campaignName || data.patreon_campaign_name || ""),
          connectedAt: String(data.connectedAt || data.patreon_connected_at || "")
        } satisfies PatreonIntegrationRecord;
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
    console.warn("Patreon admin read failed", err instanceof Error ? err.message : err);
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
    console.warn("Patreon integrations REST read failed", err instanceof Error ? err.message : err);
  }

  try {
    const userDoc = await getUserDocument(uid, idToken);
    return recordFromFields(userDoc.fields);
  } catch (err) {
    console.warn("Patreon user-doc REST read failed", err instanceof Error ? err.message : err);
  }

  return null;
}

export async function deletePatreonIntegration(uid: string, idToken?: string) {
  const clearFields = {
    patreonAccessToken: "",
    patreon_refresh_token: "",
    patreon_expires_at: "",
    patreon_campaign_id: "",
    patreon_campaign_name: "",
    patreon_connected_at: ""
  };
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("patreon").delete();
    await db.collection("users").doc(uid).set(clearFields, { merge: true });
    console.log("Deleted Patreon integration via admin", uid);
    return;
  } catch (err) {
    console.warn("Patreon admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const del = await fetchWithTimeout(integrationDocUrl(uid), { method: "DELETE", headers }, 10000);
  if (!del.ok && del.status !== 404) {
    console.warn("Patreon integrations REST delete failed", del.status);
  }
  try {
    await writeUserFields(uid, idToken, clearFields);
  } catch (err) {
    console.warn("Patreon user-doc clear failed", err instanceof Error ? err.message : err);
  }
  console.log("Deleted Patreon integration via REST", uid);
}

function tokenExpired(expiresAt: string) {
  if (!expiresAt) return false;
  const ts = Date.parse(expiresAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() >= ts;
}

export async function ensurePatreonAccessToken(
  uid: string,
  record: PatreonIntegrationRecord,
  idToken?: string
): Promise<PatreonIntegrationRecord> {
  if (!tokenExpired(record.expiresAt) || !record.refreshToken) return record;
  try {
    const refreshed = await refreshPatreonToken(record.refreshToken);
    const next: PatreonIntegrationRecord = {
      ...record,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken || record.refreshToken,
      scope: refreshed.scope || record.scope,
      expiresAt: refreshed.expiresAt
    };
    await writePatreonIntegration(uid, next, idToken);
    return next;
  } catch (err) {
    console.warn("Patreon token refresh failed", err instanceof Error ? err.message : err);
    throw new Error("invalid_patreon_credentials");
  }
}

function moneyFromCents(cents: number, currency = "USD") {
  const amount = Number(cents || 0) / 100;
  return {
    amount,
    display: `${amount.toFixed(2)} ${currency}`
  };
}

function patreonHeaders(accessToken: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "DIMAD-Patreon-Integration"
  };
}

async function sumMemberMrrCents(accessToken: string, campaignId: string) {
  if (!campaignId) return null;
  let cursor = "";
  let total = 0;
  let pages = 0;
  while (pages < 8) {
    pages += 1;
    const url = new URL(`${PATREON_API}/campaigns/${encodeURIComponent(campaignId)}/members`);
    url.searchParams.set("fields[member]", "currently_entitled_amount_cents,patron_status");
    url.searchParams.set("page[count]", "50");
    if (cursor) url.searchParams.set("page[cursor]", cursor);

    const res = await fetchWithTimeout(url.toString(), { headers: patreonHeaders(accessToken) }, 15000);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("Patreon members MRR fetch skipped", res.status, JSON.stringify(payload).slice(0, 200));
      return null;
    }

    const members = Array.isArray(payload?.data) ? payload.data : [];
    for (const member of members) {
      const attrs = member?.attributes || {};
      const status = String(attrs.patron_status || "");
      if (status && status !== "active_patron") continue;
      total += Number(attrs.currently_entitled_amount_cents || 0);
    }

    const nextCursor = payload?.meta?.pagination?.cursors?.next;
    if (!nextCursor || !members.length) break;
    cursor = String(nextCursor);
  }
  return total;
}

export async function fetchPatreonCampaignData(accessToken: string): Promise<PatreonCampaignPayload> {
  // pledge_sum was removed from Campaign v2 — request only valid fields.
  const url = new URL(`${PATREON_API}/campaigns`);
  url.searchParams.set("include", "tiers");
  url.searchParams.set("fields[campaign]", "creation_name,patron_count,name,currency");
  url.searchParams.set("fields[tier]", "title,amount_cents,patron_count");

  const res = await fetchWithTimeout(url.toString(), { headers: patreonHeaders(accessToken) }, 15000);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Patreon campaigns fetch failed", res.status, JSON.stringify(payload).slice(0, 300));
    throw new Error(res.status === 401 || res.status === 403 ? "invalid_patreon_credentials" : "patreon_request_failed");
  }

  const campaigns = Array.isArray(payload?.data) ? payload.data : [];
  const campaign = campaigns[0] || null;
  if (!campaign) {
    return {
      campaignId: "",
      campaignName: "Patreon campaign",
      connectedAt: "",
      tiers: [],
      metrics: {
        patronCount: 0,
        mrrCents: 0,
        mrrDisplay: "0.00 USD",
        tierCount: 0
      }
    };
  }

  const attrs = campaign.attributes || {};
  const included = Array.isArray(payload?.included) ? payload.included : [];
  const tiers: PatreonTier[] = included
    .filter((row: { type?: string }) => row?.type === "tier")
    .map((row: { id?: string; attributes?: Record<string, unknown> }) => {
      const tierAttrs = row.attributes || {};
      const amountCents = Number(tierAttrs.amount_cents || 0);
      return {
        id: String(row.id || ""),
        title: String(tierAttrs.title || "Tier"),
        amountCents,
        amountDisplay: moneyFromCents(amountCents).display,
        patronCount: Number(tierAttrs.patron_count || 0)
      };
    })
    .sort((a: PatreonTier, b: PatreonTier) => a.amountCents - b.amountCents);

  const campaignId = String(campaign.id || "");
  const currency = String(attrs.currency || "USD");
  const tierEstimateCents = tiers.reduce((sum, tier) => sum + tier.amountCents * tier.patronCount, 0);
  const memberMrr = await sumMemberMrrCents(accessToken, campaignId);
  const mrrCents = memberMrr == null ? tierEstimateCents : memberMrr;
  const mrr = moneyFromCents(mrrCents, currency);

  return {
    campaignId,
    campaignName: String(attrs.name || attrs.creation_name || "Patreon campaign"),
    connectedAt: "",
    tiers: tiers.slice(0, 8),
    metrics: {
      patronCount: Number(attrs.patron_count || 0),
      mrrCents,
      mrrDisplay: mrr.display,
      tierCount: tiers.length
    }
  };
}
