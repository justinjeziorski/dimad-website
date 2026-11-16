import { randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "./firebase-admin";
import { writeUserFields } from "./firebase-server";
import { FIREBASE_WEB, getUserDocument, readString } from "./firestore-rest";
import type { YouTubeChannelPayload, YouTubeVideoItem } from "./youtube-types";
import { fetchWithTimeout } from "./with-timeout";

export type { YouTubeChannelPayload } from "./youtube-types";

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const OAUTH_COOKIES = ["youtube_oauth_state", "youtube_oauth_uid", "youtube_fb_token"] as const;
const YT_API = "https://www.googleapis.com/youtube/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type YouTubeIntegrationRecord = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  connectedAt: string;
};

type FsFields = Record<string, { stringValue?: string }>;

export function youtubeAppBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function youtubeRedirectUri() {
  const fromApp = `${youtubeAppBase()}/api/auth/youtube/callback`;
  const configured = (process.env.YOUTUBE_REDIRECT_URI || "").replace(/\/$/, "");
  if (!configured) return fromApp;
  try {
    const appHost = new URL(youtubeAppBase()).host;
    const cfgHost = new URL(configured).host;
    if (appHost === cfgHost) return configured;
    console.warn("YOUTUBE_REDIRECT_URI host mismatch; using NEXT_PUBLIC_APP_URL callback", configured, fromApp);
  } catch {
    /* ignore bad env URI */
  }
  return fromApp;
}

export function newYouTubeOauthState() {
  return randomBytes(32).toString("base64url");
}

export function youtubeStatesMatch(left: string, right: string) {
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

export function setYouTubeOauthCookies(res: NextResponse, state: string, uid: string, idToken: string) {
  const options = cookieOptions();
  res.cookies.set("youtube_oauth_state", state, options);
  res.cookies.set("youtube_oauth_uid", uid, options);
  if (idToken) {
    res.cookies.set("youtube_fb_token", idToken, options);
    res.cookies.set("dimad_fb_token", idToken, { ...options, maxAge: 3300 });
  }
  return res;
}

export function clearYouTubeOauthCookies(res: NextResponse) {
  const options = cookieOptions(0);
  for (const name of OAUTH_COOKIES) res.cookies.set(name, "", options);
  return res;
}

export function youtubeAuthorizeUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  if (!clientId) throw new Error("missing_client_id");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", youtubeRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

function expiresAtFromSeconds(expiresIn: number) {
  const seconds = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function exchangeYouTubeCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  if (!clientId) throw new Error("missing_client_id");
  if (!clientSecret) throw new Error("missing_client_secret");

  const res = await fetchWithTimeout(
    TOKEN_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: youtubeRedirectUri(),
        grant_type: "authorization_code",
        code
      }).toString()
    },
    15000
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = String(data.access_token || "");
  if (!res.ok || !accessToken) {
    console.error("YouTube token exchange failed", res.status, JSON.stringify(data).slice(0, 300));
    throw new Error("token_exchange_failed");
  }
  return {
    accessToken,
    refreshToken: String(data.refresh_token || ""),
    expiresAt: expiresAtFromSeconds(Number(data.expires_in || 3600)),
    scope: String(data.scope || YOUTUBE_SCOPE)
  };
}

export async function refreshYouTubeAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  if (!clientId) throw new Error("missing_client_id");
  if (!clientSecret) throw new Error("missing_client_secret");
  if (!refreshToken) throw new Error("missing_refresh_token");

  const res = await fetchWithTimeout(
    TOKEN_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }).toString()
    },
    15000
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = String(data.access_token || "");
  if (!res.ok || !accessToken) {
    console.error("YouTube token refresh failed", res.status, JSON.stringify(data).slice(0, 300));
    throw new Error(res.status === 400 || res.status === 401 ? "invalid_youtube_credentials" : "token_refresh_failed");
  }
  return {
    accessToken,
    refreshToken: String(data.refresh_token || refreshToken),
    expiresAt: expiresAtFromSeconds(Number(data.expires_in || 3600)),
    scope: String(data.scope || YOUTUBE_SCOPE)
  };
}

function integrationDocUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/youtube?key=${FIREBASE_WEB.apiKey}`;
}

function recordFromFields(fields: FsFields | undefined): YouTubeIntegrationRecord | null {
  const accessToken =
    readString(fields, "accessToken") ||
    readString(fields, "youtubeAccessToken") ||
    readString(fields, "youtube_access_token");
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: readString(fields, "refreshToken") || readString(fields, "youtube_refresh_token") || "",
    expiresAt: readString(fields, "expiresAt") || readString(fields, "youtube_expires_at") || "",
    scope: readString(fields, "scope") || readString(fields, "youtube_scope") || YOUTUBE_SCOPE,
    channelId: readString(fields, "channelId") || readString(fields, "youtube_channel_id") || "",
    channelTitle: readString(fields, "channelTitle") || readString(fields, "youtube_channel_title") || "",
    thumbnail: readString(fields, "thumbnail") || readString(fields, "youtube_thumbnail") || "",
    connectedAt: readString(fields, "connectedAt") || readString(fields, "youtube_connected_at") || ""
  };
}

function integrationFields(record: YouTubeIntegrationRecord) {
  return {
    accessToken: { stringValue: record.accessToken },
    refreshToken: { stringValue: record.refreshToken },
    expiresAt: { stringValue: record.expiresAt },
    scope: { stringValue: record.scope },
    channelId: { stringValue: record.channelId },
    channelTitle: { stringValue: record.channelTitle },
    thumbnail: { stringValue: record.thumbnail },
    connectedAt: { stringValue: record.connectedAt },
    youtubeAccessToken: { stringValue: record.accessToken },
    youtube_channel_id: { stringValue: record.channelId },
    youtube_channel_title: { stringValue: record.channelTitle },
    youtube_thumbnail: { stringValue: record.thumbnail },
    youtube_connected_at: { stringValue: record.connectedAt },
    youtube_expires_at: { stringValue: record.expiresAt }
  };
}

function userPayload(record: YouTubeIntegrationRecord) {
  return {
    youtubeAccessToken: record.accessToken,
    youtube_channel_id: record.channelId,
    youtube_channel_title: record.channelTitle,
    youtube_thumbnail: record.thumbnail,
    youtube_connected_at: record.connectedAt,
    youtube_expires_at: record.expiresAt
  };
}

async function writeIntegrationRest(uid: string, idToken: string, record: YouTubeIntegrationRecord) {
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
    console.error("YouTube integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=youtube&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(
    createUrl,
    { method: "POST", headers, body: JSON.stringify({ fields }) },
    10000
  );
  if (create.ok) return;
  const err = await create.text();
  console.error("YouTube integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

export async function writeYouTubeIntegration(uid: string, record: YouTubeIntegrationRecord, idToken?: string) {
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("youtube").set(record);
    await db.collection("users").doc(uid).set(userPayload(record), { merge: true });
    console.log("Saved YouTube integration via admin", uid, record.channelId || record.channelTitle);
    return;
  } catch (err) {
    console.warn("YouTube admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  let integrationOk = false;
  try {
    await writeIntegrationRest(uid, idToken, record);
    integrationOk = true;
    console.log("Saved YouTube integration via REST", uid, record.channelId || record.channelTitle);
  } catch (err) {
    console.warn("YouTube integrations REST write failed", err instanceof Error ? err.message : err);
  }

  try {
    await writeUserFields(uid, idToken, userPayload(record));
    console.log("Saved YouTube fields on users/" + uid);
  } catch (err) {
    if (!integrationOk) {
      throw err instanceof Error && /permission/i.test(err.message)
        ? new Error("firestore_permission_denied")
        : new Error("firestore_write_failed");
    }
    console.warn("YouTube user-doc mirror skipped", err instanceof Error ? err.message : err);
  }
}

export async function readYouTubeIntegration(uid: string, idToken?: string) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("integrations").doc("youtube").get();
    if (snap.exists) {
      const data = snap.data() || {};
      const accessToken = String(data.accessToken || data.youtubeAccessToken || "");
      if (accessToken) {
        return {
          accessToken,
          refreshToken: String(data.refreshToken || ""),
          expiresAt: String(data.expiresAt || ""),
          scope: String(data.scope || YOUTUBE_SCOPE),
          channelId: String(data.channelId || ""),
          channelTitle: String(data.channelTitle || ""),
          thumbnail: String(data.thumbnail || ""),
          connectedAt: String(data.connectedAt || "")
        } satisfies YouTubeIntegrationRecord;
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
    console.warn("YouTube admin read failed", err instanceof Error ? err.message : err);
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
    console.warn("YouTube integrations REST read failed", err instanceof Error ? err.message : err);
  }

  try {
    const userDoc = await getUserDocument(uid, idToken);
    return recordFromFields(userDoc.fields);
  } catch (err) {
    console.warn("YouTube user-doc REST read failed", err instanceof Error ? err.message : err);
  }

  return null;
}

export async function deleteYouTubeIntegration(uid: string, idToken?: string) {
  const clearFields = {
    youtubeAccessToken: "",
    youtube_channel_id: "",
    youtube_channel_title: "",
    youtube_thumbnail: "",
    youtube_connected_at: "",
    youtube_expires_at: ""
  };
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("youtube").delete();
    await db.collection("users").doc(uid).set(clearFields, { merge: true });
    console.log("Deleted YouTube integration via admin", uid);
    return;
  } catch (err) {
    console.warn("YouTube admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const del = await fetchWithTimeout(integrationDocUrl(uid), { method: "DELETE", headers }, 10000);
  if (!del.ok && del.status !== 404) {
    console.warn("YouTube integrations REST delete failed", del.status);
  }
  try {
    await writeUserFields(uid, idToken, clearFields);
  } catch (err) {
    console.warn("YouTube user-doc clear failed", err instanceof Error ? err.message : err);
  }
  console.log("Deleted YouTube integration via REST", uid);
}

function tokenExpired(expiresAt: string) {
  if (!expiresAt) return true;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return true;
  return ms <= Date.now() + 60_000;
}

export async function ensureYouTubeAccessToken(
  uid: string,
  record: YouTubeIntegrationRecord,
  idToken?: string
): Promise<YouTubeIntegrationRecord> {
  if (!tokenExpired(record.expiresAt)) return record;
  const refreshed = await refreshYouTubeAccessToken(record.refreshToken);
  const next: YouTubeIntegrationRecord = {
    ...record,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken || record.refreshToken,
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope || record.scope
  };
  await writeYouTubeIntegration(uid, next, idToken);
  return next;
}

function formatCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(value));
}

function ytHeaders(accessToken: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

function pickThumb(snippet: Record<string, unknown> | undefined) {
  const thumbs = (snippet?.thumbnails || {}) as Record<string, { url?: string }>;
  return String(thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || "");
}

export async function fetchYouTubeChannelData(record: YouTubeIntegrationRecord): Promise<YouTubeChannelPayload> {
  const channelRes = await fetchWithTimeout(
    `${YT_API}/channels?part=snippet,statistics,contentDetails&mine=true`,
    { headers: ytHeaders(record.accessToken) },
    15000
  );
  const channelPayload = await channelRes.json().catch(() => ({}));
  if (!channelRes.ok) {
    console.error("YouTube channel fetch failed", channelRes.status, JSON.stringify(channelPayload).slice(0, 240));
    throw new Error(
      channelRes.status === 401 || channelRes.status === 403 ? "invalid_youtube_credentials" : "youtube_request_failed"
    );
  }

  const channel = Array.isArray(channelPayload?.items) ? channelPayload.items[0] : null;
  if (!channel) throw new Error("youtube_channel_missing");

  const snippet = (channel.snippet || {}) as Record<string, unknown>;
  const stats = (channel.statistics || {}) as Record<string, unknown>;
  const contentDetails = (channel.contentDetails || {}) as Record<string, unknown>;
  const related = (contentDetails.relatedPlaylists || {}) as Record<string, unknown>;
  const uploadsPlaylistId = String(related.uploads || "");

  const channelId = String(channel.id || record.channelId || "");
  const channelTitle = String(snippet.title || record.channelTitle || "YouTube channel");
  const thumbnail = pickThumb(snippet) || record.thumbnail;
  const subscriberCount = Number(stats.subscriberCount || 0);
  const viewCount = Number(stats.viewCount || 0);
  const videoCount = Number(stats.videoCount || 0);

  let recentVideos: YouTubeVideoItem[] = [];
  if (uploadsPlaylistId) {
    const uploadsRes = await fetchWithTimeout(
      `${YT_API}/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=5`,
      { headers: ytHeaders(record.accessToken) },
      15000
    );
    const uploadsPayload = await uploadsRes.json().catch(() => ({}));
    if (!uploadsRes.ok) {
      console.warn("YouTube uploads fetch skipped", uploadsRes.status, JSON.stringify(uploadsPayload).slice(0, 200));
    } else {
      recentVideos = (uploadsPayload?.items || []).map((row: Record<string, unknown>) => {
        const itemSnippet = (row.snippet || {}) as Record<string, unknown>;
        const resource = (itemSnippet.resourceId || {}) as Record<string, unknown>;
        const videoId = String(resource.videoId || "");
        return {
          id: String(row.id || videoId),
          videoId,
          title: String(itemSnippet.title || "Untitled upload"),
          thumbnail: pickThumb(itemSnippet),
          publishedAt: String(itemSnippet.publishedAt || "")
        } satisfies YouTubeVideoItem;
      });
    }
  }

  return {
    channelId,
    channelTitle,
    thumbnail,
    subscriberCount,
    subscriberDisplay: formatCount(subscriberCount),
    viewCount,
    viewDisplay: formatCount(viewCount),
    videoCount,
    videoDisplay: formatCount(videoCount),
    connectedAt: record.connectedAt,
    recentVideos
  };
}
