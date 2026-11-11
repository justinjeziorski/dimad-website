import { fetchWithTimeout } from "./with-timeout";

const FIREBASE_WEB = {
  apiKey: "AIzaSyBullSLn4jN1Q26-AatuBmuP_yIv9ugEkc",
  projectId: "dimad-b463c"
};

export async function uidFromIdToken(idToken: string): Promise<string> {
  const res = await fetchWithTimeout(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );
  const data = await res.json();
  const uid = data?.users?.[0]?.localId;
  if (!res.ok || !uid) {
    throw new Error(data?.error?.message || "Invalid Firebase session");
  }
  return uid as string;
}

export async function writeUserFields(
  uid: string,
  idToken: string,
  payload: Record<string, string>
): Promise<void> {
  const keys = Object.keys(payload);
  const mask = keys.map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const docPath = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const fields = Object.fromEntries(keys.map((key) => [key, { stringValue: payload[key] || "" }]));
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };

  const patchUrl = `${docPath}?key=${FIREBASE_WEB.apiKey}&${mask}`;
  const res = await fetchWithTimeout(patchUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields })
  });

  if (res.ok) return;

  const err = await res.text();
  console.error("Firestore PATCH failed", res.status, err);

  if (res.status === 404) {
    const create = await fetchWithTimeout(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users?documentId=${encodeURIComponent(uid)}&key=${FIREBASE_WEB.apiKey}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ fields })
      }
    );
    if (create.ok) return;
    const createErr = await create.text();
    console.error("Firestore POST failed", create.status, createErr);
    throw new Error(`Firestore write failed: ${createErr}`);
  }

  throw new Error(`Firestore write failed: ${err}`);
}
