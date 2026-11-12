import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";

const AURINKO_USER_FIELDS = [
  "aurinko_access_token",
  "aurinko_account_id",
  "aurinko_email",
  "aurinko_provider",
  "aurinko_service_type",
  "aurinko_updated_at",
  "aurinko_connected_at",
  "aurinko_refresh_token"
] as const;

const PROJECT_ID = "dimad-b463c";

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (raw) {
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    return cert({
      projectId: parsed.project_id || PROJECT_ID,
      clientEmail: parsed.client_email || "",
      privateKey: (parsed.private_key || "").replace(/\\n/g, "\n")
    });
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    return cert({ projectId: PROJECT_ID, clientEmail, privateKey });
  }
  return null;
}

export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const credential = loadCredential();
  if (!credential) {
    throw new Error("missing_firebase_admin_credentials");
  }
  return initializeApp({ credential, projectId: PROJECT_ID });
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export async function adminWriteUser(uid: string, payload: Record<string, string>) {
  await getAdminDb().collection("users").doc(uid).set(payload, { merge: true });
  console.log("Admin wrote Aurinko fields to users/" + uid, Object.keys(payload));
}

export async function adminReadUser(uid: string) {
  const snap = await getAdminDb().collection("users").doc(uid).get();
  return (snap.data() || {}) as Record<string, unknown>;
}

export async function adminClearAurinko(uid: string) {
  const payload = Object.fromEntries(AURINKO_USER_FIELDS.map((key) => [key, FieldValue.delete()]));
  await getAdminDb().collection("users").doc(uid).set(payload, { merge: true });
  console.log("Admin cleared Aurinko fields on users/" + uid);
}

export async function adminWriteCalendarEvents(uid: string, events: Array<Record<string, string | boolean>>) {
  const db = getAdminDb();
  for (let i = 0; i < events.length; i += 400) {
    const chunk = events.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((ev) => {
      const id = String(ev.id || `aur_${i}`);
      batch.set(db.collection("users").doc(uid).collection("dimad_calendar_events").doc(id), ev, { merge: true });
    });
    await batch.commit();
    console.log("Admin wrote calendar events chunk", i / 400 + 1, chunk.length);
  }
}
