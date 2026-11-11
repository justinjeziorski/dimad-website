import { app, auth } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";

const db = getFirestore(app);
let started = false;
let loadStarted = false;

function querySaysConnected() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("aurinko") === "success" || sessionStorage.getItem("aurinko_connected") === "1";
  } catch {
    return false;
  }
}

function viewsReady() {
  if (document.getElementById("view-ent-email") && document.getElementById("hourly-slots-container")) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.addEventListener("dimad-views-ready", () => resolve(), { once: true });
    setTimeout(resolve, 8000);
  });
}

function paint(connected, count) {
  const btn = document.getElementById("calendar-source-status");
  if (!btn) return;
  const on = connected || querySaysConnected();
  btn.dataset.aurinkoConnected = on ? "1" : "0";
  btn.title = on
    ? "Google/Outlook calendar is synced into Command Center and DIMAD Calendar."
    : "Connect Gmail or Outlook to sync calendar and email.";
  if (on) {
    btn.classList.remove("text-brand-gold", "hover:text-amber-300");
    btn.classList.add("text-emerald-400", "inline-flex", "items-center", "gap-1.5");
    const n = typeof count === "number" ? count : null;
    const label = n == null ? "Connected" : n === 1 ? "Connected · 1 event" : `Connected · ${n} events`;
    btn.innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>${label}</span>`;
    return;
  }
  btn.classList.add("text-brand-gold", "hover:text-amber-300");
  btn.classList.remove("text-emerald-400");
  btn.textContent = "Connect Gmail / Outlook";
}

function applyEvents(events) {
  if (typeof DIMAD_CAL === "undefined" || !DIMAD_CAL.mergeRemoteEvents) {
    console.error("Calendar merge helper missing");
    return 0;
  }
  const n = DIMAD_CAL.mergeRemoteEvents(events || []);
  console.log("Merged Google calendar events into DIMAD calendars", n, events);
  return n;
}

async function hydrateFromFirestore(uid) {
  try {
    const snap = await getDocs(collection(db, "users", uid, "dimad_calendar_events"));
    const events = snap.docs.map((row) => ({ id: row.id, ...row.data() }));
    console.log("Firestore dimad_calendar_events hydrate", events.length, events);
    if (events.length) applyEvents(events);
    return events;
  } catch (err) {
    console.error("Firestore calendar hydrate failed", err);
    return [];
  }
}

async function loadOnce(uid) {
  if (loadStarted) return;
  loadStarted = true;
  if (querySaysConnected()) {
    paint(true);
    sessionStorage.setItem("aurinko_connected", "1");
  }
  await viewsReady();
  try {
    const snap = await Promise.race([
      getDoc(doc(db, "users", uid)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("firestore_timeout")), 8000))
    ]);
    const connected = !!snap.data()?.aurinko_access_token;
    paint(connected);
    if (connected || querySaysConnected()) {
      await hydrateFromFirestore(uid);
      await window.DIMAD_AURINKO.sync();
      if (typeof window.DIMAD_MAIL?.mount === "function") {
        await window.DIMAD_MAIL.mount();
      }
    }
  } catch (err) {
    console.warn("Aurinko Firestore read skipped", err);
    paint(querySaysConnected());
  }
}

function init() {
  if (started) return;
  started = true;
  if (querySaysConnected()) paint(true);
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      paint(querySaysConnected());
      return;
    }
    if (user.email) {
      try {
        const existing = JSON.parse(localStorage.getItem("dimad_user") || "{}") || {};
        localStorage.setItem("dimad_user", JSON.stringify({ ...existing, email: user.email, uid: user.uid }));
      } catch {
        localStorage.setItem("dimad_user", JSON.stringify({ email: user.email, uid: user.uid }));
      }
    }
    void loadOnce(user.uid);
  });
}

function apiBase() {
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") return "http://localhost:3000";
  return "";
}

window.DIMAD_AURINKO = {
  paint,
  apiBase,
  async boot() {
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    if (user) await loadOnce(user.uid);
  },
  async sync() {
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    if (!user) {
      console.error("Calendar sync skipped: no Firebase user");
      return { ok: false, error: "not_signed_in" };
    }
    const idToken = await user.getIdToken();
    const res = await fetch(`${apiBase()}/api/calendar/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` }
    });
    const data = await res.json().catch(() => ({}));
    console.log("Google calendar sync response", res.status, data);
    if (!res.ok || data.ok === false) {
      console.error("Google calendar sync failed", data);
      const cached = await hydrateFromFirestore(user.uid);
      paint(true, cached.length);
      return data;
    }
    applyEvents(data.events || []);
    paint(true, data.count);
    return data;
  },
  async createEvent(localEvent) {
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    if (!user) {
      return { ok: false, error: "Sign in before adding events to Google Calendar." };
    }
    const idToken = await user.getIdToken();
    const res = await fetch(`${apiBase()}/api/calendar/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: localEvent.title,
        subject: localEvent.title,
        date: localEvent.date,
        startTime: localEvent.startTime || localEvent.time,
        endTime: localEvent.endTime || "",
        notes: localEvent.notes || "",
        description: localEvent.notes || "",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        localId: localEvent.id || ""
      })
    });
    const data = await res.json().catch(() => ({}));
    console.log("Google calendar create", res.status, data);
    return { ok: res.ok && data.ok !== false, status: res.status, ...data };
  },
  async diagnose() {
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    if (!user) {
      console.error("Diagnose skipped: sign in to the dashboard first");
      return { ok: false, error: "not_signed_in" };
    }
    const idToken = await user.getIdToken();
    const headers = { Authorization: `Bearer ${idToken}` };
    const [status, calendar, mail, folders] = await Promise.all([
      fetch(`${apiBase()}/api/aurinko/status`, { headers }).then((r) => r.json()).catch((err) => ({ error: String(err) })),
      fetch(`${apiBase()}/api/calendar/events`, { method: "POST", headers }).then((r) => r.json()).catch((err) => ({ error: String(err) })),
      fetch(`${apiBase()}/api/email/messages`, { headers }).then((r) => r.json()).catch((err) => ({ error: String(err) })),
      fetch(`${apiBase()}/api/email/folders`, { headers }).then((r) => r.json()).catch((err) => ({ error: String(err) }))
    ]);
    const report = {
      uid: user.uid,
      status,
      calendar: { ok: calendar.ok, error: calendar.error, count: calendar.count },
      email: { ok: mail.ok, error: mail.error, count: (mail.messages || []).length },
      folders: { ok: folders.ok, error: folders.error, count: (folders.folders || []).length, names: (folders.folders || []).map((row) => row.name) }
    };
    console.log("DIMAD Google diagnose", report, { calendar, mail });
    return report;
  },
  async connect(serviceType) {
    const btn = document.getElementById("calendar-source-status");
    if (btn?.dataset.aurinkoConnected === "1" && !serviceType) {
      btn.textContent = "Syncing…";
      await window.DIMAD_AURINKO.sync();
      if (typeof window.DIMAD_MAIL?.mount === "function") await window.DIMAD_MAIL.mount();
      return;
    }
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    const idToken = user ? await user.getIdToken() : "";
    const kind = serviceType || "Google";
    const path = `/api/auth/aurinko?serviceType=${encodeURIComponent(kind)}${idToken ? `&id_token=${encodeURIComponent(idToken)}` : ""}`;
    window.location.assign(`${apiBase()}${path}`);
  }
};

init();
document.addEventListener("DOMContentLoaded", init);

document.addEventListener(
  "click",
  (event) => {
    const btn = event.target.closest?.("#calendar-source-status");
    if (!btn) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void window.DIMAD_AURINKO.connect();
  },
  true
);

const mo = new MutationObserver(() => {
  const btn = document.getElementById("calendar-source-status");
  if (!btn) return;
  if (querySaysConnected() && btn.dataset.aurinkoConnected !== "1") paint(true);
});
mo.observe(document.documentElement, { childList: true, subtree: true });
