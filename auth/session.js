import { getAuth } from "firebase/auth";

export function getDimadFirebaseApp() {
  const app = typeof window !== "undefined" ? window.DIMAD_FIREBASE?.app : null;
  if (!app) {
    throw new Error("DIMAD Firebase app is not initialized. Load firebase.js first.");
  }
  return app;
}

export function getDimadAuth() {
  const existing = typeof window !== "undefined" ? window.DIMAD_FIREBASE?.auth : null;
  return existing || getAuth(getDimadFirebaseApp());
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function syncDimadLocalUser(user) {
  if (!user) {
    localStorage.removeItem("dimad_user");
    return;
  }
  let existing = {};
  try {
    existing = JSON.parse(localStorage.getItem("dimad_user") || "{}") || {};
  } catch {
    existing = {};
  }
  localStorage.setItem(
    "dimad_user",
    JSON.stringify({
      ...existing,
      uid: user.uid,
      email: user.email,
      membershipStart: existing.membershipStart || todayStamp()
    })
  );
}
