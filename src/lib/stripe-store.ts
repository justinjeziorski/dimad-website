import { createHmac, timingSafeEqual } from "crypto";
import { getAdminDb } from "./firebase-admin";
import { FIREBASE_WEB } from "./firestore-rest";
import { fetchWithTimeout } from "./with-timeout";

export type StripeIntegrationRecord = {
  stripe_user_id: string;
  connectedAt: string;
  livemode: boolean;
  account_mac: string;
};

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export function signStripeAccount(uid: string, accountId: string) {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) throw new Error("missing_stripe_secret");
  return createHmac("sha256", key).update(`${uid}.${accountId}`).digest("base64url");
}

export function stripeAccountMacMatches(uid: string, record: StripeIntegrationRecord) {
  if (!record.stripe_user_id || !record.account_mac) return false;
  try {
    return safeEqual(record.account_mac, signStripeAccount(uid, record.stripe_user_id));
  } catch {
    return false;
  }
}

function docName(uid: string) {
  return `projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${uid}/integrations/stripe`;
}

function docUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/${docName(uid)}?key=${FIREBASE_WEB.apiKey}`;
}

type FsFields = Record<string, { stringValue?: string; booleanValue?: boolean }>;

function fromFields(fields: FsFields | undefined): StripeIntegrationRecord | null {
  const stripe_user_id = fields?.stripe_user_id?.stringValue || "";
  if (!stripe_user_id) return null;
  return {
    stripe_user_id,
    connectedAt: fields?.connectedAt?.stringValue || "",
    livemode: fields?.livemode?.booleanValue === true,
    account_mac: fields?.account_mac?.stringValue || ""
  };
}

function toFields(record: StripeIntegrationRecord) {
  return {
    stripe_user_id: { stringValue: record.stripe_user_id },
    connectedAt: { stringValue: record.connectedAt },
    livemode: { booleanValue: record.livemode },
    account_mac: { stringValue: record.account_mac }
  };
}

async function readRest(uid: string, idToken: string): Promise<StripeIntegrationRecord | null> {
  const res = await fetchWithTimeout(docUrl(uid), {
    headers: { Authorization: `Bearer ${idToken}` }
  }, 10000);
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Stripe integration read failed", res.status, data?.error?.status || data?.error?.message);
    throw new Error(res.status === 403 ? "firestore_permission_denied" : "firestore_read_failed");
  }
  return fromFields(data.fields as FsFields | undefined);
}

async function writeRest(uid: string, idToken: string, record: StripeIntegrationRecord) {
  const fields = toFields(record);
  const mask = Object.keys(fields).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const patch = await fetchWithTimeout(`${docUrl(uid)}&${mask}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields })
  }, 10000);
  if (patch.ok) return;
  if (patch.status !== 404) {
    const err = await patch.text();
    console.error("Stripe integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=stripe&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(createUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields })
  }, 10000);
  if (create.ok) return;
  const err = await create.text();
  console.error("Stripe integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

async function deleteRest(uid: string, idToken: string) {
  const res = await fetchWithTimeout(docUrl(uid), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` }
  }, 10000);
  if (res.ok || res.status === 404) return;
  const err = await res.text();
  console.error("Stripe integration delete failed", res.status, err.slice(0, 300));
  throw new Error(res.status === 403 ? "firestore_permission_denied" : "firestore_delete_failed");
}

function fromAdmin(data: Record<string, unknown> | undefined): StripeIntegrationRecord | null {
  const stripe_user_id = String(data?.stripe_user_id || "");
  if (!stripe_user_id) return null;
  return {
    stripe_user_id,
    connectedAt: String(data?.connectedAt || ""),
    livemode: data?.livemode === true,
    account_mac: String(data?.account_mac || "")
  };
}

export async function readStripeIntegration(uid: string, idToken?: string) {
  try {
    const snap = await getAdminDb().collection("users").doc(uid).collection("integrations").doc("stripe").get();
    if (!snap.exists) return null;
    return fromAdmin(snap.data() as Record<string, unknown>);
  } catch (err) {
    console.warn("Stripe admin read failed", err instanceof Error ? err.message : err);
    if (!idToken) throw err;
    return readRest(uid, idToken);
  }
}

export async function writeStripeIntegration(uid: string, record: StripeIntegrationRecord, idToken?: string) {
  try {
    await getAdminDb().collection("users").doc(uid).collection("integrations").doc("stripe").set(record);
    console.log("Saved Stripe integration", uid, record.stripe_user_id, record.livemode ? "live" : "test");
    return;
  } catch (err) {
    console.warn("Stripe admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw err;
  }
  await writeRest(uid, idToken, record);
  console.log("Saved Stripe integration via REST", uid, record.stripe_user_id);
}

export async function deleteStripeIntegration(uid: string, idToken?: string) {
  try {
    await getAdminDb().collection("users").doc(uid).collection("integrations").doc("stripe").delete();
    console.log("Deleted Stripe integration", uid);
    return;
  } catch (err) {
    console.warn("Stripe admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw err;
  }
  await deleteRest(uid, idToken);
  console.log("Deleted Stripe integration via REST", uid);
}
