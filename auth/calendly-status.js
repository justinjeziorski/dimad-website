import { app, auth } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";

const db = getFirestore(app);
let started = false;
let loadStarted = false;

function querySaysConnected() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("calendly") === "success" || sessionStorage.getItem("calendly_connected") === "1";
  } catch {
    return false;
  }
}

function paint(connected) {
  const btn = document.getElementById("calendar-source-status");
  if (!btn) return;
  const on = connected || querySaysConnected();
  btn.dataset.calendlyConnected = on ? "1" : "0";
  if (on) {
    btn.classList.remove("text-brand-gold", "hover:text-amber-300");
    btn.classList.add("text-emerald-400", "inline-flex", "items-center", "gap-1.5");
    btn.innerHTML =
      '<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>Connected</span>';
    return;
  }
  btn.classList.add("text-brand-gold", "hover:text-amber-300");
  btn.classList.remove("text-emerald-400");
  btn.textContent = "Connect via Calendly to sync";
}

async function loadOnce(uid) {
  if (loadStarted) return;
  loadStarted = true;
  if (querySaysConnected()) paint(true);
  try {
    const snap = await Promise.race([
      getDoc(doc(db, "users", uid)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("firestore_timeout")), 8000))
    ]);
    const connected = !!snap.data()?.calendly_access_token;
    paint(connected);
    if (connected || querySaysConnected()) {
      void window.DIMAD_CALENDLY.sync();
    }
  } catch (err) {
    console.warn("Calendly Firestore read skipped", err);
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
        localStorage.setItem(
          "dimad_user",
          JSON.stringify({ ...existing, email: user.email, uid: user.uid })
        );
      } catch {
        localStorage.setItem("dimad_user", JSON.stringify({ email: user.email, uid: user.uid }));
      }
    }
    void loadOnce(user.uid);
  });
}

function calendlyApiBase() {
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return "http://localhost:3000";
  }
  return "";
}

window.DIMAD_CALENDLY = {
  paint,
  async sync() {
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    if (!user) {
      console.error("Calendly sync skipped: no Firebase user");
      return { ok: false, error: "not_signed_in" };
    }
    const idToken = await user.getIdToken();
    const res = await fetch(`${calendlyApiBase()}/api/calendly/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` }
    });
    const data = await res.json().catch(() => ({}));
    console.log("Calendly sync response", res.status, data);
    if (!res.ok || data.ok === false) {
      console.error("Calendly sync failed", data);
      return data;
    }
    if (typeof DIMAD_CAL !== "undefined" && DIMAD_CAL.mergeCalendlyEvents) {
      DIMAD_CAL.mergeCalendlyEvents(data.events || []);
    }
    paint(true);
    return data;
  },
  async connect() {
    const btn = document.getElementById("calendar-source-status");
    if (btn?.dataset.calendlyConnected === "1") {
      btn.textContent = "Syncing…";
      await window.DIMAD_CALENDLY.sync();
      paint(true);
      return;
    }
    const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
    const idToken = user ? await user.getIdToken() : "";
    const path = idToken
      ? `/api/auth/calendly/connect?id_token=${encodeURIComponent(idToken)}`
      : "/api/auth/calendly/connect";
    window.location.assign(`${calendlyApiBase()}${path}`);
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
    void window.DIMAD_CALENDLY.connect();
  },
  true
);

const mo = new MutationObserver(() => {
  const btn = document.getElementById("calendar-source-status");
  if (!btn) return;
  if (querySaysConnected() && btn.dataset.calendlyConnected !== "1") paint(true);
});
mo.observe(document.documentElement, { childList: true, subtree: true });
