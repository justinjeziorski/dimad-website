import { app, auth } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";

const db = getFirestore(app);
const STORE_KEY = "dimad_aurinko";
let started = false;
let loadStarted = "";
let mailboxDisconnected = false;

function currentUid() {
  try {
    return (
      auth.currentUser?.uid ||
      window.DIMAD_FIREBASE?.auth?.currentUser?.uid ||
      JSON.parse(localStorage.getItem("dimad_user") || "{}").uid ||
      ""
    );
  } catch {
    return "";
  }
}

function readSaved(uid) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!raw || raw.connected !== true) return null;
    if (uid && raw.uid && raw.uid !== uid) return null;
    return raw;
  } catch {
    return null;
  }
}

function saveConnected(uid, extra) {
  const prev = readSaved(uid) || {};
  const next = {
    connected: true,
    uid: uid || prev.uid || currentUid() || "",
    email: extra?.email || prev.email || "",
    accountId: extra?.accountId || prev.accountId || "",
    serviceType: extra?.serviceType || prev.serviceType || extra?.provider || prev.provider || "",
    provider: extra?.provider || prev.provider || extra?.serviceType || prev.serviceType || "",
    at: Date.now()
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
  try {
    sessionStorage.setItem("aurinko_connected", "1");
  } catch {
    /* ignore */
  }
  return next;
}

function clearSaved() {
  localStorage.removeItem(STORE_KEY);
  try {
    sessionStorage.removeItem("aurinko_connected");
  } catch {
    /* ignore */
  }
}

function querySaysConnected() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("aurinko") === "success") return true;
    if (sessionStorage.getItem("aurinko_connected") === "1") return true;
    return !!readSaved(currentUid());
  } catch {
    return !!readSaved(currentUid());
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

function connectedMailbox() {
  const saved = readSaved(currentUid()) || {};
  return {
    email: String(saved.email || "").trim(),
    serviceType: String(saved.serviceType || saved.provider || "")
  };
}

function mailboxBadgeIcon(email, serviceType) {
  if (/google|gmail/i.test(serviceType) || /gmail\.com$/i.test(email)) {
    return '<i class="fa-brands fa-google text-[8px]"></i>';
  }
  if (/office|microsoft|outlook/i.test(serviceType)) {
    return '<i class="fa-brands fa-microsoft text-[8px]"></i>';
  }
  return (String(email).replace(/[^A-Za-z0-9]/g, "").charAt(0) || "@").toUpperCase();
}

function escapeBadge(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paint(connected, count) {
  const btn = document.getElementById("calendar-source-status");
  if (!btn) return;
  if (!btn.dataset.baseClass) btn.dataset.baseClass = btn.getAttribute("class") || "";
  const on = connected || querySaysConnected();
  btn.dataset.aurinkoConnected = on ? "1" : "0";
  if (on) {
    const { email, serviceType } = connectedMailbox();
    const address = email || "Mailbox";
    btn.title = `${address} connected`;
    btn.className =
      "max-w-[18rem] inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-brand-border bg-brand-black text-left cursor-pointer";
    btn.innerHTML = `<span class="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-brand-gold text-[9px] font-mono font-bold flex items-center justify-center shrink-0">${mailboxBadgeIcon(address, serviceType)}</span>
      <span class="min-w-0">
        <span class="block text-[8px] font-mono uppercase tracking-[0.14em] text-slate-500 leading-none">Account</span>
        <span class="block text-[10px] font-mono text-slate-200 truncate leading-tight">${escapeBadge(address)} connected</span>
      </span>`;
    return;
  }
  hideAccountMenus();
  btn.className = btn.dataset.baseClass;
  btn.title = "Connect Gmail or Outlook to sync calendar and email.";
  btn.textContent = "Connect Gmail / Outlook";
}

function hideAccountMenus() {
  document.querySelectorAll("[data-account-menu]").forEach((menu) => menu.classList.add("hidden"));
}

function toggleAccountMenu(id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  const open = !menu.classList.contains("hidden");
  hideAccountMenus();
  if (!open) menu.classList.remove("hidden");
}

function dropOauthSuccessQuery() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("aurinko") !== "success") return;
    url.searchParams.delete("aurinko");
    const search = url.searchParams.toString();
    window.history.replaceState({}, "", url.pathname + (search ? `?${search}` : "") + url.hash);
  } catch {
    /* ignore */
  }
}

function paintMailDisconnected() {
  if (!window.DIMAD_MAIL) return;
  window.DIMAD_MAIL.connected = false;
  window.DIMAD_MAIL.messages = [];
  window.DIMAD_MAIL.folders = [];
  window.DIMAD_MAIL.folderCache = {};
  window.DIMAD_MAIL.bodyCache = {};
  if (typeof window.DIMAD_MAIL.paintShell === "function") window.DIMAD_MAIL.paintShell();
}

async function logoutMailbox() {
  mailboxDisconnected = true;
  hideAccountMenus();
  dropOauthSuccessQuery();
  clearSaved();
  paint(false);
  paintMailDisconnected();
  try {
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    const idToken = user ? await user.getIdToken() : "";
    if (!idToken) return;
    const res = await fetch(`${apiBase()}/api/aurinko/status`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` }
    });
    const data = await res.json().catch(() => ({}));
    console.log("Aurinko mailbox disconnected", res.status, data);
  } catch (err) {
    console.warn("Aurinko mailbox disconnect failed", err);
  }
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

async function restoreMailbox(uid) {
  await hydrateFromFirestore(uid);
  await window.DIMAD_AURINKO.sync();
  if (typeof window.DIMAD_MAIL?.mount === "function") {
    await window.DIMAD_MAIL.mount();
  }
}

async function loadOnce(uid) {
  if (mailboxDisconnected) {
    paint(false);
    paintMailDisconnected();
    return;
  }
  if (loadStarted === uid) return;
  loadStarted = uid;
  const remembered = querySaysConnected() || !!readSaved(uid);
  if (remembered) {
    paint(true);
    saveConnected(uid);
  }
  await viewsReady();
  if (remembered && typeof window.DIMAD_MAIL?.paintShell === "function") {
    window.DIMAD_MAIL.connected = true;
    window.DIMAD_MAIL.paintShell();
  }
  try {
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    const idToken = user ? await user.getIdToken() : "";
    let connected = remembered;
    let email = readSaved(uid)?.email || "";
    if (idToken) {
      const status = await fetch(`${apiBase()}/api/aurinko/status`, {
        headers: { Authorization: `Bearer ${idToken}` }
      }).then((res) => res.json()).catch(() => ({}));
      console.log("Aurinko restored status", status);
      if (mailboxDisconnected) {
        paint(false);
        paintMailDisconnected();
        return;
      }
      if (status.connected) {
        connected = true;
        email = status.email || email;
        saveConnected(uid, status);
      } else if (status.ok && status.connected === false && !remembered) {
        connected = false;
      }
    }
    if (!connected) {
      const snap = await Promise.race([
        getDoc(doc(db, "users", uid)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("firestore_timeout")), 8000))
      ]);
      connected = !!snap.data()?.aurinko_access_token;
      if (connected) {
        saveConnected(uid, {
          email: snap.data()?.aurinko_email,
          accountId: snap.data()?.aurinko_account_id,
          serviceType: snap.data()?.aurinko_service_type,
          provider: snap.data()?.aurinko_provider
        });
      }
    }
    paint(connected);
    if (connected) {
      saveConnected(uid, { email });
      await restoreMailbox(uid);
      return;
    }
    if (remembered) {
      paint(true);
      await restoreMailbox(uid);
      return;
    }
    clearSaved();
    paint(false);
  } catch (err) {
    console.warn("Aurinko restore skipped", err);
    const fallback = remembered || querySaysConnected();
    paint(fallback);
    if (fallback) {
      try {
        await restoreMailbox(uid);
      } catch (restoreErr) {
        console.warn("Aurinko restore from cache failed", restoreErr);
      }
    }
  }
}

function init() {
  if (started) return;
  started = true;
  if (querySaysConnected()) {
    paint(true);
    saveConnected(currentUid());
  }
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
  isConnected() {
    return querySaysConnected() || document.getElementById("calendar-source-status")?.dataset.aurinkoConnected === "1";
  },
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
    saveConnected(user.uid);
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
    if (!serviceType && (readSaved(user?.uid)?.connected || querySaysConnected())) {
      paint(true);
      await window.DIMAD_AURINKO.sync();
      if (typeof window.DIMAD_MAIL?.mount === "function") await window.DIMAD_MAIL.mount();
      return;
    }
    if (!serviceType) {
      toggleAccountMenu("calendar-connect-menu");
      return;
    }
    mailboxDisconnected = false;
    const idToken = user ? await user.getIdToken() : "";
    const provider = /microsoft|365|outlook|office/i.test(String(serviceType)) ? "microsoft" : "google";
    const path = `/api/auth/aurinko?provider=${encodeURIComponent(provider)}${idToken ? `&id_token=${encodeURIComponent(idToken)}` : ""}`;
    window.location.assign(`${apiBase()}${path}`);
  },
  logout() {
    return logoutMailbox();
  }
};

init();
document.addEventListener("DOMContentLoaded", init);

document.addEventListener(
  "click",
  (event) => {
    const logout = event.target.closest?.("[data-account-logout]");
    if (logout) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void logoutMailbox();
      return;
    }
    const pick = event.target.closest?.("[data-account-connect]");
    if (pick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      hideAccountMenus();
      void window.DIMAD_AURINKO.connect(pick.getAttribute("data-account-connect"));
      return;
    }
    const cal = event.target.closest?.("#calendar-source-status");
    if (cal) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (cal.dataset.aurinkoConnected === "1") {
        toggleAccountMenu("calendar-account-menu");
        return;
      }
      toggleAccountMenu("calendar-connect-menu");
      return;
    }
    const mail = event.target.closest?.("#mail-account-badge");
    if (mail) {
      event.preventDefault();
      toggleAccountMenu("mail-account-menu");
      return;
    }
    if (!event.target.closest?.("[data-account-wrap]")) hideAccountMenus();
  },
  true
);

const mo = new MutationObserver(() => {
  const btn = document.getElementById("calendar-source-status");
  if (!btn) return;
  if (querySaysConnected() && btn.dataset.aurinkoConnected !== "1") paint(true);
});
mo.observe(document.documentElement, { childList: true, subtree: true });
