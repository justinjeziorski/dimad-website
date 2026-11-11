import { fetchWithTimeout } from "./with-timeout";
import {
  FIREBASE_WEB,
  boolField,
  commitWrites,
  getUserDocument,
  readString,
  strField
} from "./firestore-rest";
import { writeCalendlyTokens } from "./firebase-server";

export type DimadCalendlyEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  calendly_uri: string;
  source: "Calendly";
  type: "meeting";
  cancelled: boolean;
};

function eventIdFromUri(uri: string) {
  const raw = uri.split("/").filter(Boolean).pop() || `evt_${Date.now()}`;
  return `cal_${raw.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID || "";
  const clientSecret = process.env.CALENDLY_CLIENT_SECRET || "";
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetchWithTimeout(
    "https://auth.calendly.com/oauth/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    },
    10000
  );
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Calendly refresh token failed", res.status, data);
    throw new Error(data.error_description || data.error || "refresh_failed");
  }
  console.log("Calendly access token refreshed");
  return data as { access_token: string; refresh_token?: string };
}

async function listScheduledEvents(accessToken: string, userUri: string) {
  const collected: unknown[] = [];
  const minStart = new Date(Date.now() - 7 * 86400000).toISOString();
  const maxStart = new Date(Date.now() + 90 * 86400000).toISOString();
  let pageToken = "";
  for (let page = 0; page < 6; page += 1) {
    const url = new URL("https://api.calendly.com/scheduled_events");
    url.searchParams.set("user", userUri);
    url.searchParams.set("count", "100");
    url.searchParams.set("start_time", minStart);
    url.searchParams.set("end_time", maxStart);
    if (pageToken) url.searchParams.set("page_token", pageToken);
    const res = await fetchWithTimeout(
      url.toString(),
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } },
      12000
    );
    const payload = await res.json();
    if (res.status === 401) return { unauthorized: true as const, collection: [] as unknown[], payload };
    if (!res.ok) {
      console.error("Calendly scheduled_events failed", res.status, payload);
      throw new Error(payload?.message || payload?.title || "scheduled_events_failed");
    }
    const batch = Array.isArray(payload.collection) ? payload.collection : [];
    console.log("Calendly scheduled_events page", page + 1, "count", batch.length, payload);
    collected.push(...batch);
    pageToken = payload?.pagination?.next_page_token || "";
    if (!pageToken) break;
  }
  return { unauthorized: false as const, collection: collected, payload: { collection: collected } };
}

function mapEvent(raw: Record<string, unknown>): DimadCalendlyEvent | null {
  const uri = String(raw.uri || "");
  const start = String(raw.start_time || "");
  const end = String(raw.end_time || "");
  if (!uri || !start) return null;
  const status = String(raw.status || "active");
  return {
    id: eventIdFromUri(uri),
    title: String(raw.name || "Calendly event"),
    start_time: start,
    end_time: end || start,
    status,
    calendly_uri: uri,
    source: "Calendly",
    type: "meeting",
    cancelled: status === "canceled"
  };
}

export async function syncCalendlyForUser(uid: string, idToken: string) {
  const userDoc = await getUserDocument(uid, idToken);
  const fields = userDoc.fields || {};
  let accessToken = readString(fields, "calendly_access_token");
  let refreshToken = readString(fields, "calendly_refresh_token");
  const userUri = readString(fields, "calendly_user_uri");

  if (!accessToken || !userUri) {
    throw new Error("calendly_not_connected");
  }

  let listed = await listScheduledEvents(accessToken, userUri);
  if (listed.unauthorized && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token || refreshToken;
    await writeCalendlyTokens(uid, idToken, {
      calendly_access_token: accessToken,
      calendly_refresh_token: refreshToken,
      calendly_user_uri: userUri,
      calendly_connected_at: new Date().toISOString()
    });
    listed = await listScheduledEvents(accessToken, userUri);
  }
  if (listed.unauthorized) {
    throw new Error("calendly_unauthorized");
  }

  const events = listed.collection
    .map((row) => mapEvent(row as Record<string, unknown>))
    .filter((row): row is DimadCalendlyEvent => !!row);

  console.log("Mapped Calendly events for Firestore", events.length, events);

  const writes = events.map((ev) => ({
    update: {
      name: `projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${uid}/dimad_calendar_events/${ev.id}`,
      fields: {
        id: strField(ev.id),
        title: strField(ev.title),
        start_time: strField(ev.start_time),
        end_time: strField(ev.end_time),
        status: strField(ev.status),
        calendly_uri: strField(ev.calendly_uri),
        source: strField(ev.source),
        type: strField(ev.type),
        cancelled: boolField(ev.cancelled)
      }
    }
  }));

  for (let i = 0; i < writes.length; i += 20) {
    const chunk = writes.slice(i, i + 20);
    await commitWrites(idToken, chunk);
    console.log("Wrote Calendly events chunk", i / 20 + 1, chunk.length);
  }

  return { count: events.length, events };
}
