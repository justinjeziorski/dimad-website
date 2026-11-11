import { fetchWithTimeout } from "./with-timeout";

export const FIREBASE_WEB = {
  apiKey: "AIzaSyBullSLn4jN1Q26-AatuBmuP_yIv9ugEkc",
  projectId: "dimad-b463c"
};

export function firestoreHeaders(idToken: string) {
  return {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
}

export function strField(value: string | undefined) {
  return { stringValue: value || "" };
}

export function boolField(value: boolean) {
  return { booleanValue: !!value };
}

export function readString(fields: Record<string, { stringValue?: string }> | undefined, key: string) {
  return fields?.[key]?.stringValue || "";
}

export async function getUserDocument(uid: string, idToken: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}?key=${FIREBASE_WEB.apiKey}`;
  const res = await fetchWithTimeout(url, { headers: firestoreHeaders(idToken) }, 10000);
  const data = await res.json();
  if (!res.ok) {
    console.error("Firestore user read failed", res.status, data);
    throw new Error(data?.error?.message || "firestore_user_read_failed");
  }
  return data as { fields?: Record<string, { stringValue?: string }> };
}

export async function commitWrites(idToken: string, writes: unknown[]) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents:commit?key=${FIREBASE_WEB.apiKey}`;
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: firestoreHeaders(idToken),
      body: JSON.stringify({ writes })
    },
    15000
  );
  const data = await res.json();
  if (!res.ok) {
    console.error("Firestore commit failed", res.status, data);
    throw new Error(data?.error?.message || "firestore_commit_failed");
  }
  return data;
}
