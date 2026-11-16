import { getAdminDb } from "./firebase-admin";
import { writeUserFields } from "./firebase-server";
import { FIREBASE_WEB, getUserDocument, readString } from "./firestore-rest";
import type { MailerLiteCampaign, MailerLitePayload } from "./mailerlite-types";
import { fetchWithTimeout } from "./with-timeout";

export type { MailerLitePayload } from "./mailerlite-types";

export type MailerLiteIntegrationRecord = {
  apiToken: string;
  connectedAt: string;
};

type FsFields = Record<string, { stringValue?: string }>;

const ML_API = "https://connect.mailerlite.com/api";

function integrationDocUrl(uid: string) {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations/mailerlite?key=${FIREBASE_WEB.apiKey}`;
}

function recordFromFields(fields: FsFields | undefined): MailerLiteIntegrationRecord | null {
  const apiToken =
    readString(fields, "apiToken") ||
    readString(fields, "mailerliteApiToken") ||
    readString(fields, "mailerlite_api_token");
  if (!apiToken) return null;
  return {
    apiToken,
    connectedAt: readString(fields, "connectedAt") || readString(fields, "mailerlite_connected_at") || ""
  };
}

function integrationFields(record: MailerLiteIntegrationRecord) {
  return {
    apiToken: { stringValue: record.apiToken },
    connectedAt: { stringValue: record.connectedAt },
    mailerliteApiToken: { stringValue: record.apiToken },
    mailerlite_connected_at: { stringValue: record.connectedAt }
  };
}

function userPayload(record: MailerLiteIntegrationRecord) {
  return {
    mailerliteApiToken: record.apiToken,
    mailerlite_connected_at: record.connectedAt
  };
}

async function writeIntegrationRest(uid: string, idToken: string, record: MailerLiteIntegrationRecord) {
  const fields = integrationFields(record);
  const mask = Object.keys(fields).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const patch = await fetchWithTimeout(
    `${integrationDocUrl(uid)}&${mask}`,
    { method: "PATCH", headers, body: JSON.stringify({ fields }) },
    10000
  );
  if (patch.ok) return;
  if (patch.status !== 404) {
    const err = await patch.text();
    console.error("MailerLite integration patch failed", patch.status, err.slice(0, 300));
    throw new Error(patch.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
  }
  const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/integrations?documentId=mailerlite&key=${FIREBASE_WEB.apiKey}`;
  const create = await fetchWithTimeout(
    createUrl,
    { method: "POST", headers, body: JSON.stringify({ fields }) },
    10000
  );
  if (create.ok) return;
  const err = await create.text();
  console.error("MailerLite integration create failed", create.status, err.slice(0, 300));
  throw new Error(create.status === 403 ? "firestore_permission_denied" : "firestore_write_failed");
}

export async function writeMailerLiteIntegration(
  uid: string,
  record: MailerLiteIntegrationRecord,
  idToken?: string
) {
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("mailerlite").set(record);
    await db.collection("users").doc(uid).set(userPayload(record), { merge: true });
    console.log("Saved MailerLite integration via admin", uid);
    return;
  } catch (err) {
    console.warn("MailerLite admin write failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  let integrationOk = false;
  try {
    await writeIntegrationRest(uid, idToken, record);
    integrationOk = true;
    console.log("Saved MailerLite integration via REST", uid);
  } catch (err) {
    console.warn("MailerLite integrations REST write failed", err instanceof Error ? err.message : err);
  }

  try {
    await writeUserFields(uid, idToken, userPayload(record));
    console.log("Saved MailerLite fields on users/" + uid);
  } catch (err) {
    if (!integrationOk) {
      throw err instanceof Error && /permission/i.test(err.message)
        ? new Error("firestore_permission_denied")
        : new Error("firestore_write_failed");
    }
    console.warn("MailerLite user-doc mirror skipped", err instanceof Error ? err.message : err);
  }
}

export async function readMailerLiteIntegration(uid: string, idToken?: string) {
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("integrations").doc("mailerlite").get();
    if (snap.exists) {
      const data = snap.data() || {};
      const apiToken = String(data.apiToken || data.mailerliteApiToken || "");
      if (apiToken) {
        return {
          apiToken,
          connectedAt: String(data.connectedAt || data.mailerlite_connected_at || "")
        } satisfies MailerLiteIntegrationRecord;
      }
    }
    const user = await db.collection("users").doc(uid).get();
    const fromUser = recordFromFields(
      Object.fromEntries(
        Object.entries(user.data() || {}).map(([key, value]) => [key, { stringValue: String(value || "") }])
      )
    );
    if (fromUser) return fromUser;
  } catch (err) {
    console.warn("MailerLite admin read failed", err instanceof Error ? err.message : err);
  }

  if (!idToken) return null;

  try {
    const res = await fetchWithTimeout(integrationDocUrl(uid), {
      headers: { Authorization: `Bearer ${idToken}` }
    }, 10000);
    if (res.ok) {
      const data = await res.json();
      const fromIntegration = recordFromFields(data.fields as FsFields | undefined);
      if (fromIntegration) return fromIntegration;
    }
  } catch (err) {
    console.warn("MailerLite integrations REST read failed", err instanceof Error ? err.message : err);
  }

  try {
    const userDoc = await getUserDocument(uid, idToken);
    return recordFromFields(userDoc.fields);
  } catch (err) {
    console.warn("MailerLite user-doc REST read failed", err instanceof Error ? err.message : err);
  }

  return null;
}

export async function deleteMailerLiteIntegration(uid: string, idToken?: string) {
  const clearFields = {
    mailerliteApiToken: "",
    mailerlite_connected_at: ""
  };
  try {
    const db = getAdminDb();
    await db.collection("users").doc(uid).collection("integrations").doc("mailerlite").delete();
    await db.collection("users").doc(uid).set(clearFields, { merge: true });
    console.log("Deleted MailerLite integration via admin", uid);
    return;
  } catch (err) {
    console.warn("MailerLite admin delete failed", err instanceof Error ? err.message : err);
    if (!idToken) throw new Error("firestore_write_failed");
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json"
  };
  const del = await fetchWithTimeout(integrationDocUrl(uid), { method: "DELETE", headers }, 10000);
  if (!del.ok && del.status !== 404) {
    console.warn("MailerLite integrations REST delete failed", del.status);
  }
  try {
    await writeUserFields(uid, idToken, clearFields);
  } catch (err) {
    console.warn("MailerLite user-doc clear failed", err instanceof Error ? err.message : err);
  }
  console.log("Deleted MailerLite integration via REST", uid);
}

function mlHeaders(apiToken: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
    "User-Agent": "DIMAD-MailerLite-Integration"
  };
}

function ratePercent(value: unknown) {
  if (value == null) return 0;
  if (typeof value === "object") {
    const obj = value as { float?: number; string?: string };
    if (typeof obj.float === "number") return obj.float <= 1 ? obj.float * 100 : obj.float;
    const parsed = Number.parseFloat(String(obj.string || "").replace("%", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num <= 1 ? num * 100 : num;
}

export async function verifyMailerLiteToken(apiToken: string) {
  const res = await fetchWithTimeout(`${ML_API}/subscribers?limit=0`, { headers: mlHeaders(apiToken) }, 12000);
  if (res.status === 401 || res.status === 403) {
    throw new Error("invalid_mailerlite_token");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("MailerLite token verify failed", res.status, text.slice(0, 240));
    throw new Error("mailerlite_request_failed");
  }
  return true;
}

export async function fetchMailerLiteData(record: MailerLiteIntegrationRecord): Promise<MailerLitePayload> {
  const headers = mlHeaders(record.apiToken);
  const [subsRes, campaignsRes] = await Promise.all([
    fetchWithTimeout(`${ML_API}/subscribers?limit=0`, { headers }, 12000),
    fetchWithTimeout(`${ML_API}/campaigns?filter[status]=sent&limit=5`, { headers }, 15000)
  ]);

  const subsPayload = await subsRes.json().catch(() => ({}));
  if (!subsRes.ok) {
    console.error("MailerLite subscribers fetch failed", subsRes.status, JSON.stringify(subsPayload).slice(0, 240));
    throw new Error(
      subsRes.status === 401 || subsRes.status === 403 ? "invalid_mailerlite_token" : "mailerlite_request_failed"
    );
  }

  const campaignsPayload = await campaignsRes.json().catch(() => ({}));
  if (!campaignsRes.ok) {
    console.warn("MailerLite campaigns fetch skipped", campaignsRes.status, JSON.stringify(campaignsPayload).slice(0, 200));
  }

  const subscriberCount = Number(
    subsPayload?.total ??
      subsPayload?.meta?.total ??
      subsPayload?.meta?.aggregations?.total ??
      0
  );

  const campaigns: MailerLiteCampaign[] = (Array.isArray(campaignsPayload?.data) ? campaignsPayload.data : []).map(
    (row: Record<string, unknown>) => {
      const stats = (row.stats || {}) as Record<string, unknown>;
      return {
        id: String(row.id || ""),
        name: String(row.name || "Campaign"),
        status: String(row.status || "sent"),
        sent: Number(stats.sent || 0),
        openRate: ratePercent(stats.open_rate),
        clickRate: ratePercent(stats.click_rate),
        finishedAt: String(row.finished_at || row.started_at || "")
      };
    }
  );

  const withStats = campaigns.filter((item) => item.sent > 0 || item.openRate > 0 || item.clickRate > 0);
  const avgOpenRate =
    withStats.length > 0
      ? withStats.reduce((sum, item) => sum + item.openRate, 0) / withStats.length
      : campaigns.length
        ? campaigns.reduce((sum, item) => sum + item.openRate, 0) / campaigns.length
        : 0;
  const avgClickRate =
    withStats.length > 0
      ? withStats.reduce((sum, item) => sum + item.clickRate, 0) / withStats.length
      : campaigns.length
        ? campaigns.reduce((sum, item) => sum + item.clickRate, 0) / campaigns.length
        : 0;

  const latest = campaigns[0];

  return {
    accountLabel: "MailerLite",
    connectedAt: record.connectedAt,
    campaigns: campaigns.slice(0, 5),
    metrics: {
      subscriberCount,
      avgOpenRate,
      avgOpenDisplay: `${avgOpenRate.toFixed(1)}%`,
      avgClickRate,
      avgClickDisplay: `${avgClickRate.toFixed(1)}%`,
      latestCampaignName: latest?.name || "No sent campaigns yet"
    }
  };
}
