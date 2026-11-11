import { aurinkoFetch, aurinkoRecords, pullAurinkoUpdated, startAurinkoSync } from "./aurinko";
import { adminWriteCalendarEvents } from "./firebase-admin";
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

export async function syncCalendarForUser(
  uid: string,
  opts: string | { idToken?: string; accessToken?: string } = {}
) {
  const options = typeof opts === "string" ? { idToken: opts } : opts;
  let accessToken = options.accessToken || "";
  if (!accessToken && options.idToken) {
    const userDoc = await getUserDocument(uid, options.idToken);
    accessToken = readString(userDoc.fields, "aurinko_access_token");
  }
  if (!accessToken) throw new Error("aurinko_not_connected");

  const listed = await listCalendarEvents(accessToken);
  if (listed.unauthorized) throw new Error("aurinko_unauthorized");

  const events = listed.records.map(mapEvent).filter((row): row is DimadRemoteEvent => !!row);
  console.log("Mapped Google/Aurinko calendar events", events.length, events);

  try {
    await adminWriteCalendarEvents(
      uid,
      events.map((ev) => ({
        id: ev.id,
        title: ev.title,
        start_time: ev.start_time,
        end_time: ev.end_time,
        status: ev.status,
        source: ev.source,
        type: ev.type,
        location: ev.location,
        cancelled: ev.cancelled
      }))
    );
  } catch (adminErr) {
    console.warn("Admin calendar write failed; falling back to user token", adminErr);
    if (!options.idToken) throw adminErr;
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
      await commitWrites(options.idToken, chunk);
      console.log("Wrote calendar events chunk", i / 20 + 1, chunk.length);
    }
  }

  return { count: events.length, events };
}

export async function createCalendarEvent(
  uid: string,
  idToken: string,
  input: {
    title?: string;
    subject?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    description?: string;
    timeZone?: string;
    localId?: string;
  }
) {
  const userDoc = await getUserDocument(uid, idToken);
  const accessToken = readString(userDoc.fields, "aurinko_access_token");
  if (!accessToken) throw new Error("aurinko_not_connected");

  const title = String(input.subject || input.title || "").trim();
  const date = String(input.date || "").trim();
  const startTime = String(input.startTime || "09:00");
  const endTime = String(input.endTime || "");
  if (!title || !date) throw new Error("missing_event_fields");

  const timeZone = input.timeZone || "UTC";
  const startIso = `${date}T${startTime.length === 5 ? `${startTime}:00` : startTime}`;
  const endIso = endTime
    ? `${date}T${endTime.length === 5 ? `${endTime}:00` : endTime}`
    : startIso;

  const created = await aurinkoFetch("/calendars/primary/events?bodyType=text", accessToken, {
    method: "POST",
    body: JSON.stringify({
      subject: title,
      body: input.description || input.notes || "",
      start: { dateTime: startIso, timezone: timeZone },
      end: { dateTime: endIso, timezone: timeZone }
    })
  });
  console.log("Aurinko create calendar event", created.status, created.data);
  if (created.status === 401) throw new Error("aurinko_unauthorized");
  if (!created.ok) {
    const row = (created.data || {}) as Record<string, unknown>;
    throw new Error(String(row.message || row.error || "calendar_create_failed"));
  }

  const raw = ((created.data as Record<string, unknown>)?.resource || created.data) as Record<string, unknown>;
  const mapped =
    mapEvent(raw) ||
    ({
      id: eventId(raw),
      title,
      start_time: startIso,
      end_time: endIso,
      status: "active",
      source: "Calendar",
      type: "meeting",
      cancelled: false,
      location: ""
    } satisfies DimadRemoteEvent);

  try {
    await adminWriteCalendarEvents(uid, [
      {
        ...mapped,
        local_id: input.localId || ""
      }
    ]);
  } catch (adminErr) {
    console.warn("Admin write for created event failed; using user token", adminErr);
    await commitWrites(idToken, [
      {
        update: {
          name: `projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${uid}/dimad_calendar_events/${mapped.id}`,
          fields: {
            id: strField(mapped.id),
            title: strField(mapped.title),
            start_time: strField(mapped.start_time),
            end_time: strField(mapped.end_time),
            status: strField(mapped.status),
            source: strField(mapped.source),
            type: strField(mapped.type),
            location: strField(mapped.location),
            cancelled: boolField(mapped.cancelled),
            local_id: strField(input.localId || "")
          }
        }
      }
    ]);
  }

  return mapped;
}
