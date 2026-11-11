import { aurinkoFetch, aurinkoRecords } from "./aurinko";
import { getUserDocument, readString } from "./firestore-rest";

function addressOf(value: unknown): { name: string; address: string } {
  if (!value) return { name: "", address: "" };
  if (typeof value === "string") return { name: "", address: value };
  const row = value as Record<string, unknown>;
  const nested = (row.emailAddress || row.email || {}) as Record<string, unknown>;
  return {
    name: String(row.name || nested.name || ""),
    address: String(row.address || nested.address || row.email || "")
  };
}

function mapMessage(raw: Record<string, unknown>) {
  const from = addressOf(raw.from || raw.sender);
  const toRaw = Array.isArray(raw.to) ? raw.to : [];
  return {
    id: String(raw.id || ""),
    threadId: String(raw.threadId || raw.conversationId || raw.id || ""),
    subject: String(raw.subject || "(no subject)"),
    snippet: String(raw.snippet || raw.preview || raw.bodyPreview || ""),
    body: String(raw.body || raw.htmlBody || raw.textBody || raw.snippet || ""),
    from,
    to: toRaw.map(addressOf),
    receivedAt: String(raw.receivedAt || raw.receivedDateTime || raw.sentAt || raw.date || ""),
    unread: raw.unread === true || raw.isRead === false
  };
}

export async function aurinkoTokenForUser(uid: string, idToken: string) {
  const userDoc = await getUserDocument(uid, idToken);
  const token = readString(userDoc.fields, "aurinko_access_token");
  const accountId = readString(userDoc.fields, "aurinko_account_id");
  const serviceType = readString(userDoc.fields, "aurinko_service_type");
  const email = readString(userDoc.fields, "aurinko_email");
  if (!token) throw new Error("aurinko_not_connected");
  return { token, accountId, serviceType, email };
}

export async function listEmailMessages(uid: string, idToken: string) {
  const { token } = await aurinkoTokenForUser(uid, idToken);
  const listed = await aurinkoFetch("/email/messages?limit=50", token);
  console.log("Aurinko email messages", listed.status, listed.data);
  if (listed.status === 401) throw new Error("aurinko_unauthorized");
  if (!listed.ok) throw new Error("email_list_failed");
  return aurinkoRecords(listed.data).map(mapMessage);
}

export async function getEmailMessage(uid: string, idToken: string, id: string) {
  const { token } = await aurinkoTokenForUser(uid, idToken);
  const listed = await aurinkoFetch(`/email/messages/${encodeURIComponent(id)}`, token);
  console.log("Aurinko email message", id, listed.status);
  if (listed.status === 401) throw new Error("aurinko_unauthorized");
  if (!listed.ok) throw new Error("email_get_failed");
  const raw = listed.data as Record<string, unknown>;
  return mapMessage((raw.resource as Record<string, unknown>) || raw);
}

export async function sendEmailMessage(
  uid: string,
  idToken: string,
  payload: { to: string; subject: string; body: string }
) {
  const { token } = await aurinkoTokenForUser(uid, idToken);
  const to = payload.to
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((address) => ({ address }));
  const sent = await aurinkoFetch("/email/messages", token, {
    method: "POST",
    body: JSON.stringify({
      subject: payload.subject,
      body: payload.body,
      to
    })
  });
  console.log("Aurinko send email", sent.status, sent.data);
  if (sent.status === 401) throw new Error("aurinko_unauthorized");
  if (!sent.ok) throw new Error("email_send_failed");
  return sent.data;
}
