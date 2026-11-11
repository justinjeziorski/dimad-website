import { aurinkoFetch, aurinkoRecords, pullAurinkoUpdated, startAurinkoSync } from "./aurinko";
import { boolField, commitWrites, FIREBASE_WEB, getUserDocument, readString, strField } from "./firestore-rest";

export type DimadRemoteEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  source: "Calendar";
  type: "meeting";
  cancelled: boolean;
  location: string;
};

function eventId(raw: Record<string, unknown>) {
  const id = String(raw.id || raw.eventId || raw.iCalUID || Date.now());
  return `aur_${id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function dateTimeOf(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return String(row.dateTime || row.time || row.date || row.start || "");
  }
  return "";
}

function locationOf(raw: Record<string, unknown>) {
  const loc = raw.location;
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  const row = loc as Record<string, unknown>;
  return String(row.name || row.displayName || row.address || "");
}

function mapEvent(raw: Record<string, unknown>): DimadRemoteEvent | null {
  const start = dateTimeOf(raw.start) || String(raw.start_time || raw.startTime || "");
  if (!start) return null;
  const end = dateTimeOf(raw.end) || String(raw.end_time || raw.endTime || start);
  const cancelled = String(raw.status || "").toLowerCase().includes("cancel") || !!raw.cancelled;
  return {
    id: eventId(raw),
    title: String(raw.subject || raw.title || raw.summary || "Calendar event"),
    start_time: start,
    end_time: end,
    status: cancelled ? "canceled" : "active",
    source: "Calendar",
    type: "meeting",
    cancelled,
    location: locationOf(raw)
  };
}

async function listCalendarEvents(accessToken: string) {
  const timeMin = new Date(Date.now() - 7 * 86400000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 86400000).toISOString();
  const records: Record<string, unknown>[] = [];

  const started = await startAurinkoSync(
    accessToken,
    `/calendars/primary/sync?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&awaitReady=true`
  );
  if (started.unauthorized) return { unauthorized: true as const, records: [] as Record<string, unknown>[] };
  if (started.deltaToken) {
    records.push(...(await pullAurinkoUpdated(accessToken, "/calendars/primary/sync/updated", started.deltaToken)));
  }

  const paths = [
    `/calendars/primary/events/range?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
    `/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
    `/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
  ];
  for (const path of paths) {
    const listed = await aurinkoFetch(path, accessToken);
    console.log("Aurinko calendar list", path, listed.status, listed.data);
    if (listed.status === 401) return { unauthorized: true as const, records: [] as Record<string, unknown>[] };
    if (listed.ok) records.push(...aurinkoRecords(listed.data));
  }

  const byId = new Map<string, Record<string, unknown>>();
  records.forEach((row) => {
    const id = String(row.id || row.eventId || JSON.stringify(row.start || row));
    byId.set(id, row);
  });
  return { unauthorized: false as const, records: Array.from(byId.values()) };
}

export async function syncCalendarForUser(uid: string, idToken: string) {
  const userDoc = await getUserDocument(uid, idToken);
  const fields = userDoc.fields || {};
  const accessToken = readString(fields, "aurinko_access_token");
  if (!accessToken) throw new Error("aurinko_not_connected");

  const listed = await listCalendarEvents(accessToken);
  if (listed.unauthorized) throw new Error("aurinko_unauthorized");

  const events = listed.records.map(mapEvent).filter((row): row is DimadRemoteEvent => !!row);
  console.log("Mapped Google/Aurinko calendar events", events.length, events);

  const writes = events.map((ev) => ({
    update: {
      name: `projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${uid}/dimad_calendar_events/${ev.id}`,
      fields: {
        id: strField(ev.id),
        title: strField(ev.title),
        start_time: strField(ev.start_time),
        end_time: strField(ev.end_time),
        status: strField(ev.status),
        source: strField(ev.source),
        type: strField(ev.type),
        location: strField(ev.location),
        cancelled: boolField(ev.cancelled)
      }
    }
  }));

  for (let i = 0; i < writes.length; i += 20) {
    const chunk = writes.slice(i, i + 20);
    await commitWrites(idToken, chunk);
    console.log("Wrote calendar events chunk", i / 20 + 1, chunk.length);
  }

  return { count: events.length, events };
}
