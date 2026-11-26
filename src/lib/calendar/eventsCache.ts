import {
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths
} from "date-fns";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
  type Firestore
} from "firebase/firestore";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { CalendarEvent, MonthKey } from "@/lib/calendar/types";

const firebaseConfig = {
  apiKey: "AIzaSyBullSLn4jN1Q26-AatuBmuP_yIv9ugEkc",
  authDomain: "dimad-b463c.firebaseapp.com",
  projectId: "dimad-b463c",
  storageBucket: "dimad-b463c.firebasestorage.app",
  messagingSenderId: "123269277660",
  appId: "1:123269277660:web:2cfa4e826adf1c1e555119",
  measurementId: "G-G04BWQMK7E"
};

function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function database(): Firestore {
  return getFirestore(firebaseApp());
}

declare global {
  interface Window {
    DIMAD_CAL?: {
      load?: () => CalendarEvent[];
      fromRemoteEvent?: (ev: Record<string, unknown>) => CalendarEvent | null;
      showContentSchedule?: () => boolean;
      schedulerOverlay?: () => CalendarEvent[];
    };
  }
}

/** In-memory month caches — revisiting months is instant, zero duplicate reads. */
const monthCache = new Map<MonthKey, CalendarEvent[]>();
const inflight = new Map<MonthKey, Promise<CalendarEvent[]>>();

export function monthKey(date: Date): MonthKey {
  return format(date, "yyyy-MM");
}

function normalizeEvent(raw: Record<string, unknown>): CalendarEvent | null {
  if (typeof window !== "undefined" && window.DIMAD_CAL?.fromRemoteEvent) {
    try {
      const mapped = window.DIMAD_CAL.fromRemoteEvent(raw);
      if (mapped) return mapped;
    } catch {
      /* fall through */
    }
  }
  const date =
    typeof raw.date === "string"
      ? raw.date
      : raw.start_time || raw.startTime
        ? format(new Date(String(raw.start_time || raw.startTime)), "yyyy-MM-dd")
        : "";
  if (!date) return null;
  const startTime =
    typeof raw.startTime === "string"
      ? raw.startTime
      : typeof raw.time === "string"
        ? raw.time
        : undefined;
  return {
    id: String(raw.id || `evt_${date}_${startTime || "all"}`),
    title: String(raw.title || raw.subject || "Event"),
    date,
    startTime,
    endTime: typeof raw.endTime === "string" ? raw.endTime : undefined,
    time: startTime,
    type: typeof raw.type === "string" ? raw.type : undefined,
    source: typeof raw.source === "string" ? raw.source : undefined,
    tone: typeof raw.tone === "string" ? raw.tone : undefined,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    allDay: !!raw.allDay || (!startTime && !!raw.allDay),
    cancelled: !!(raw.cancelled || raw.status === "canceled")
  };
}

function readLocalWindow(fromKey: string, toKey: string): CalendarEvent[] {
  const rows: CalendarEvent[] = [];
  try {
    const local = window.DIMAD_CAL?.load?.() || [];
    local.forEach((ev) => {
      if (!ev?.date || ev.cancelled) return;
      if (ev.date >= fromKey && ev.date <= toKey) rows.push(ev);
    });
  } catch {
    /* ignore */
  }
  try {
    if (window.DIMAD_CAL?.showContentSchedule?.()) {
      (window.DIMAD_CAL.schedulerOverlay?.() || []).forEach((ev) => {
        if (!ev?.date || ev.cancelled) return;
        if (ev.date >= fromKey && ev.date <= toKey) rows.push(ev);
      });
    }
  } catch {
    /* ignore */
  }
  return rows;
}

async function fetchFirestoreMonth(key: MonthKey): Promise<CalendarEvent[]> {
  const auth = getAuth(firebaseApp());
  const uid = auth.currentUser?.uid;
  if (!uid) return [];

  const start = parseISO(`${key}-01`);
  const fromKey = format(startOfMonth(start), "yyyy-MM-dd");
  const toKey = format(endOfMonth(start), "yyyy-MM-dd");

  try {
    const q = query(
      collection(database(), "users", uid, "dimad_calendar_events"),
      where("date", ">=", fromKey),
      where("date", "<=", toKey)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((docSnap) => normalizeEvent({ id: docSnap.id, ...docSnap.data() }))
      .filter(Boolean) as CalendarEvent[];
  } catch {
    /* Missing index or offline — fall back to full local slice. */
    return readLocalWindow(fromKey, toKey);
  }
}

function mergeById(rows: CalendarEvent[]): CalendarEvent[] {
  const map = new Map<string, CalendarEvent>();
  rows.forEach((ev) => {
    if (!ev?.id) return;
    map.set(String(ev.id), ev);
  });
  return Array.from(map.values());
}

export async function ensureMonth(key: MonthKey): Promise<CalendarEvent[]> {
  const cached = monthCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const start = parseISO(`${key}-01`);
    const fromKey = format(startOfMonth(start), "yyyy-MM-dd");
    const toKey = format(endOfMonth(start), "yyyy-MM-dd");
    let remote: CalendarEvent[] = [];
    try {
      remote = await fetchFirestoreMonth(key);
    } catch {
      remote = [];
    }
    /* Re-read local at completion so events created while fetch was in flight are kept. */
    const local = readLocalWindow(fromKey, toKey);
    const merged = mergeById([...local, ...remote]);
    monthCache.set(key, merged);
    inflight.delete(key);
    return merged;
  })();

  inflight.set(key, task);
  return task;
}

/** Prefetch prev / current / next month around visibleMonth. */
export async function ensureWindow(visibleMonth: Date): Promise<Map<MonthKey, CalendarEvent[]>> {
  const center = startOfMonth(visibleMonth);
  const keys = [subMonths(center, 1), center, addMonths(center, 1)].map(monthKey);
  await Promise.all(keys.map((k) => ensureMonth(k)));
  const out = new Map<MonthKey, CalendarEvent[]>();
  keys.forEach((k) => out.set(k, monthCache.get(k) || []));
  return out;
}

export function eventsForDate(dateKey: string): CalendarEvent[] {
  const key = dateKey.slice(0, 7) as MonthKey;
  const cached = monthCache.get(key) || [];
  /* Always union localStorage so Agenda updates even if the month cache is stale. */
  const local = readLocalWindow(dateKey, dateKey);
  return mergeById([...cached, ...local]).filter((ev) => ev.date === dateKey && !ev.cancelled);
}

export function eventsInMonth(key: MonthKey): CalendarEvent[] {
  const start = parseISO(`${key}-01`);
  const fromKey = format(startOfMonth(start), "yyyy-MM-dd");
  const toKey = format(endOfMonth(start), "yyyy-MM-dd");
  return mergeById([...(monthCache.get(key) || []), ...readLocalWindow(fromKey, toKey)]);
}

/** Invalidate cache after local writes / remote merges. */
export function invalidateMonthCache(keys?: MonthKey[]): void {
  if (!keys || !keys.length) {
    monthCache.clear();
    inflight.clear();
    return;
  }
  keys.forEach((k) => {
    monthCache.delete(k);
    inflight.delete(k);
  });
}

export function seedMonthFromLocal(visibleMonth: Date, _force = false): void {
  const center = startOfMonth(visibleMonth);
  [subMonths(center, 1), center, addMonths(center, 1)].forEach((d) => {
    const key = monthKey(d);
    const fromKey = format(startOfMonth(d), "yyyy-MM-dd");
    const toKey = format(endOfMonth(d), "yyyy-MM-dd");
    const local = readLocalWindow(fromKey, toKey);
    monthCache.set(key, mergeById([...(monthCache.get(key) || []), ...local]));
  });
}
