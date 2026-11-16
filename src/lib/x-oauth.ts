import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "./firebase-admin";
import { writeUserFields } from "./firebase-server";
import { FIREBASE_WEB, getUserDocument, readString } from "./firestore-rest";
import type { XProfilePayload, XTweetItem } from "./x-types";
import { fetchWithTimeout } from "./with-timeout";

export type { XProfilePayload } from "./x-types";

/** offline.access required so X returns refresh tokens. */
export const X_SCOPES = "tweet.read users.read follows.read offline.access";
const OAUTH_COOKIES = ["x_oauth_state", "x_oauth_verifier", "x_oauth_uid", "x_fb_token"] as const;
const X_API = "https://api.x.com/2";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const AUTH_URL = "https://twitter.com/i/oauth2/authorize";

export type XIntegrationRecord = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
  userId: string;
  username: string;
  name: string;
  profileImageUrl: string;
  connectedAt: string;
};

type FsFields = Record<string, { stringValue?: string }>;

export function xAppBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function xRedirectUri() {
  const fromApp = `${xAppBase()}/api/auth/x/callback`;
  const configured = (process.env.X_REDIRECT_URI || "").replace(/\/$/, "");
  if (!configured) return fromApp;
  try {
    const appHost = new URL(xAppBase()).host;
    const cfgHost = new URL(configured).host;
    if (appHost === cfgHost) return configured;
    console.warn("X_REDIRECT_URI host mismatch; using NEXT_PUBLIC_APP_URL callback", configured, fromApp);
  } catch {
    /* ignore bad env URI */
  }
  return fromApp;
}

export function newXOauthState() {
  return randomBytes(32).toString("base64url");
}

export function newXPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function xStatesMatch(left: string, right: string) {
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

export function setXOauthCookies(
  res: NextResponse,
  state: string,
  verifier: string,
  uid: string,
  idToken: string
) {
  const options = cookieOptions();
  res.cookies.set("x_oauth_state", state, options);
  res.cookies.set("x_oauth_verifier", verifier, options);
  res.cookies.set("x_oauth_uid", uid, options);
  if (idToken) {
    res.cookies.set("x_fb_token", idToken, options);
    res.cookies.set("dimad_fb_token", idToken, { ...options, maxAge: 3300 });
  }
  return res;
}

export function clearXOauthCookies(res: NextResponse) {
  const options = cookieOptions(0);
  for (const name of OAUTH_COOKIES) res.cookies.set(name, "", options);
  return res;
}

export function xAuthorizeUrl(state: string, codeChallenge: string) {
  const clientId = process.env.X_CLIENT_ID || "";
  if (!clientId) throw new Error("missing_client_id");
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", xRedirectUri());
  url.searchParams.set("scope", X_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function expiresAtFromSeconds(expiresIn: number) {
  const seconds = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 7200;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function basicAuthHeader() {
  const clientId = process.env.X_CLIENT_ID || "";
  const clientSecret = process.env.X_CLIENT_SECRET || "";
  if (!clientId) throw new Error("missing_client_id");
  if (!clientSecret) throw new Error("missing_client_secret");
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function exchangeXCode(code: string, codeVerifier: string) {
  const res = await fetchWithTimeout(
    TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: basicAuthHeader()
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: xRedirectUri(),
        code_verifier: codeVerifier
      }).toString()
    },
    15000
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = String(data.access_token || "");
  if (!res.ok || !accessToken) {
    console.error("X token exchange failed", res.status, JSON.stringify(data).slice(0, 300));
    throw new Error("token_exchange_failed");
  }
  return {
    accessToken,
    refreshToken: String(data.refresh_token || ""),
    expiresAt: expiresAtFromSeconds(Number(data.expires_in || 7200)),
    scope: String(data.scope || X_SCOPES)
  };
}

export async function refreshXAccessToken(refreshToken: string) {
  if (!refreshToken) throw new Error("missing_refresh_token");
  const res = await fetchWithTimeout(
    TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: basicAuthHeader()
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.X_CLIENT_ID || ""
      }).toString()
    },
    15000
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = String(data.access_token || "");
  if (!res.ok || !accessToken) {
    console.error("X token refresh failed", res.status, JSON.stringify(data).slice(0, 300));
    throw new Error(res.status === 400 || res.status === 401 ? "invalid_x_credentials" : "token_refresh_failed");
  }
  return {
    accessToken,
    refreshToken: String(data.refresh_token || refreshToken),
    expiresAt: expiresAtFromSeconds(Number(data.expires_in || 7200)),
    scope: String(data.scope || X_SCOPES)
  };
}

function integrationDocUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/x?key=${FIREBASE_WEB.apiKey}`;
}

function recordFromFields(fields: FsFields | undefined): XIntegrationRecord | null {
  const accessToken =
    readString(fields, "accessToken") ||
    readString(fields, "xAccessToken") ||
    readString(fields, "x_access_token");
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: readString(fields, "refreshToken") || readString(fields, "x_refresh_token") || "",
    expiresAt: readString(fields, "expiresAt") || readString(fields, "x_expires_at") || "",
    scope: readString(fields, "scope") || readString(fields, "x_scope") || X_SCOPES,
    userId: readString(fields, "userId") || readString(fields, "x_user_id") || "",
    username: readString(fields, "username") || readString(fields, "x_username") || "",
    name: readString(fields, "name") || readString(fields, "x_name") || "",
    profileImageUrl: readString(fields, "profileImageUrl") || readString(fields, "x_profile_image_url") || "",
    connectedAt: readString(fields, "connectedAt") || readString(fields, "x_connected_at") || ""
  };
}

function integrationFields(record: XIntegrationRecord) {
  return {
    accessToken: { stringValue: record.accessToken },
    refreshToken: { stringValue: record.refreshToken },
    expiresAt: { stringValue: record.expiresAt },
    scope: { stringValue: record.scope },
    userId: { stringValue: record.userId },
    username: { stringValue: record.username },
    name: { stringValue: record.name },
    profileImageUrl: { stringValue: record.profileImageUrl },
    connectedAt: { stringValue: record.connectedAt },
    xAccessToken: { stringValue: record.accessToken },
    x_user_id: { stringValue: record.userId },
    x_username: { stringValue: record.username },
    x_name: { stringValue: record.name },
    x_profile_image_url: { stringValue: record.profileImageUrl },
    x_connected_at: { stringValue: record.connectedAt },
    x_expires_at: { stringValue: record.expiresAt }
  };
}

function userPayload(record: XIntegrationRecord) {
  return {
    xAccessToken: record.accessToken,
    x_user_id: record.userId,
    x_username: record.username,
    x_name: record.name,
    x_profile_image_url: record.profileImageUrl,
    x_connected_at: record.connectedAt,
    x_expires_at: record.expiresAt
  };
}

async function writeIntegrationRest(uid: string, idToken: string, record: XIntegrationRecord) {
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
    console.error("X integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=x&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(
    createUrl,
    { method: "POST", headers, body: JSON.stringify({ fields }) },
    10000
  );
  if (create.ok) return;
  const err = await create.text();
  console.error("X integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

export async function writeXIntegration(uid: string, record: XIntegrationRecord, idToken?: string) {
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("x").set(record);
    await db.collection("users").doc(uid).set(userPayload(record), { merge: true });
    console.log("Saved X integration via admin", uid, record.username || record.userId);
    return;
  } catch (err) {
    console.warn("X admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  let integrationOk = false;
  try {
    await writeIntegrationRest(uid, idToken, record);
    integrationOk = true;
    console.log("Saved X integration via REST", uid, record.username || record.userId);
  } catch (err) {
    console.warn("X integrations REST write failed", err instanceof Error ? err.message : err);
  }

  try {
    await writeUserFields(uid, idToken, userPayload(record));
    console.log("Saved X fields on users/" + uid);
  } catch (err) {
    if (!integrationOk) {
      throw err instanceof Error && /permission/i.test(err.message)
        ? new Error("firestore_permission_denied")
        : new Error("firestore_write_failed");
    }
    console.warn("X user-doc mirror skipped", err instanceof Error ? err.message : err);
  }
}

export async function readXIntegration(uid: string, idToken?: string) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("integrations").doc("x").get();
    if (snap.exists) {
      const data = snap.data() || {};
      const accessToken = String(data.accessToken || data.xAccessToken || "");
      if (accessToken) {
        return {
          accessToken,
          refreshToken: String(data.refreshToken || ""),
          expiresAt: String(data.expiresAt || ""),
          scope: String(data.scope || X_SCOPES),
          userId: String(data.userId || ""),
          username: String(data.username || ""),
          name: String(data.name || ""),
          profileImageUrl: String(data.profileImageUrl || ""),
          connectedAt: String(data.connectedAt || "")
        } satisfies XIntegrationRecord;
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
    console.warn("X admin read failed", err instanceof Error ? err.message : err);
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
    console.warn("X integrations REST read failed", err instanceof Error ? err.message : err);
  }

  try {
    const userDoc = await getUserDocument(uid, idToken);
    return recordFromFields(userDoc.fields);
  } catch (err) {
    console.warn("X user-doc REST read failed", err instanceof Error ? err.message : err);
  }

  return null;
}

export async function deleteXIntegration(uid: string, idToken?: string) {
  const clearFields = {
    xAccessToken: "",
    x_user_id: "",
    x_username: "",
    x_name: "",
    x_profile_image_url: "",
    x_connected_at: "",
    x_expires_at: ""
  };
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("x").delete();
    await db.collection("users").doc(uid).set(clearFields, { merge: true });
    console.log("Deleted X integration via admin", uid);
    return;
  } catch (err) {
    console.warn("X admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const del = await fetchWithTimeout(integrationDocUrl(uid), { method: "DELETE", headers }, 10000);
  if (!del.ok && del.status !== 404) {
    console.warn("X integrations REST delete failed", del.status);
  }
  try {
    await writeUserFields(uid, idToken, clearFields);
  } catch (err) {
    console.warn("X user-doc clear failed", err instanceof Error ? err.message : err);
  }
  console.log("Deleted X integration via REST", uid);
}

function tokenExpired(expiresAt: string) {
  if (!expiresAt) return true;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return true;
  return ms <= Date.now() + 60_000;
}

export async function ensureXAccessToken(
  uid: string,
  record: XIntegrationRecord,
  idToken?: string
): Promise<XIntegrationRecord> {
  if (!tokenExpired(record.expiresAt)) return record;
  const refreshed = await refreshXAccessToken(record.refreshToken);
  const next: XIntegrationRecord = {
    ...record,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken || record.refreshToken,
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope || record.scope
  };
  await writeXIntegration(uid, next, idToken);
  return next;
}

function formatCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(value));
}

function xHeaders(accessToken: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

export async function fetchXProfileData(record: XIntegrationRecord): Promise<XProfilePayload> {
  const meRes = await fetchWithTimeout(
    `${X_API}/users/me?user.fields=public_metrics,profile_image_url,username,name`,
    { headers: xHeaders(record.accessToken) },
    15000
  );
  const mePayload = await meRes.json().catch(() => ({}));
  if (!meRes.ok) {
    console.error("X users/me failed", meRes.status, JSON.stringify(mePayload).slice(0, 240));
    throw new Error(meRes.status === 401 || meRes.status === 403 ? "invalid_x_credentials" : "x_request_failed");
  }

  const me = (mePayload?.data || {}) as Record<string, unknown>;
  const metrics = (me.public_metrics || {}) as Record<string, unknown>;
  const userId = String(me.id || record.userId || "");
  const username = String(me.username || record.username || "");
  const name = String(me.name || record.name || username || "X user");
  const profileImageUrl = String(me.profile_image_url || record.profileImageUrl || "").replace("_normal", "_400x400");
  const followersCount = Number(metrics.followers_count || 0);
  const followingCount = Number(metrics.following_count || 0);
  const tweetCount = Number(metrics.tweet_count || 0);

  let recentTweets: XTweetItem[] = [];
  if (userId) {
    const tweetsRes = await fetchWithTimeout(
      `${X_API}/users/${encodeURIComponent(userId)}/tweets?tweet.fields=public_metrics,created_at&max_results=5&exclude=replies,retweets`,
      { headers: xHeaders(record.accessToken) },
      15000
    );
    const tweetsPayload = await tweetsRes.json().catch(() => ({}));
    if (!tweetsRes.ok) {
      console.warn("X tweets fetch skipped", tweetsRes.status, JSON.stringify(tweetsPayload).slice(0, 200));
    } else {
      recentTweets = (tweetsPayload?.data || []).map((row: Record<string, unknown>) => {
        const pub = (row.public_metrics || {}) as Record<string, unknown>;
        return {
          id: String(row.id || ""),
          text: String(row.text || ""),
          createdAt: String(row.created_at || ""),
          likeCount: Number(pub.like_count || 0),
          retweetCount: Number(pub.retweet_count || 0),
          replyCount: Number(pub.reply_count || 0),
          impressionCount: Number(pub.impression_count || 0)
        } satisfies XTweetItem;
      });
    }
  }

  return {
    userId,
    username,
    name,
    profileImageUrl,
    followersCount,
    followersDisplay: formatCount(followersCount),
    followingCount,
    followingDisplay: formatCount(followingCount),
    tweetCount,
    tweetDisplay: formatCount(tweetCount),
    connectedAt: record.connectedAt,
    recentTweets
  };
}
