import { aurinkoAccount, aurinkoFetch, aurinkoRecords, pullAurinkoUpdated, startAurinkoSync } from "./aurinko";
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

function bodyOf(raw: Record<string, unknown>) {
  const body = raw.body;
  if (typeof body === "string" && body) return body;
  if (body && typeof body === "object") {
    const row = body as Record<string, unknown>;
    return String(row.value || row.content || row.html || row.text || "");
  }
  return String(raw.htmlBody || raw.textBody || raw.snippet || raw.bodyPreview || raw.preview || "");
}

function mapMessage(raw: Record<string, unknown>) {
  const from = addressOf(raw.from || raw.sender);
  const toRaw = Array.isArray(raw.to) ? raw.to : [];
  const id = String(raw.id || raw.messageId || raw.internetMessageId || raw.threadId || raw.conversationId || "");
  return {
    id,
    threadId: String(raw.threadId || raw.conversationId || id),
    subject: String(raw.subject || "(no subject)"),
    snippet: String(raw.snippet || raw.preview || raw.bodyPreview || "").slice(0, 240),
    body: bodyOf(raw),
    from,
    to: toRaw.map(addressOf),
    receivedAt: String(
      raw.receivedAt || raw.receivedDateTime || raw.sentAt || raw.sentDateTime || raw.createdDateTime || raw.date || ""
    ),
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

async function listFromEndpoints(token: string) {
  const paths = [
    "/email/messages?folder=inbox&count=50",
    "/email/messages?folder=INBOX&limit=50",
    "/email/messages?q=in%3Ainbox&count=50",
    "/email/messages?q=label%3Ainbox&limit=50",
    "/email/messages?count=50"
  ];
  for (const path of paths) {
    const listed = await aurinkoFetch(path, token);
    console.log("Aurinko email list", path, listed.status, listed.data);
    if (listed.status === 401) throw new Error("aurinko_unauthorized");
    if (!listed.ok) continue;
    const batch = aurinkoRecords(listed.data);
    if (batch.length) return batch;
  }

  const started = await startAurinkoSync(token, "/email/sync?daysWithin=14&awaitReady=true");
  if (started.unauthorized) throw new Error("aurinko_unauthorized");
  if (started.deltaToken) {
    const synced = await pullAurinkoUpdated(token, "/email/sync/updated", started.deltaToken);
    if (synced.length) return synced;
  }
  return [];
}

export async function listInboxWithAccessToken(accessToken: string) {
  const account = await aurinkoAccount(accessToken);
  console.log("Listing inbox for Aurinko account", account?.email || account?.id);
  const records = await listFromEndpoints(accessToken);
  const byId = new Map<string, ReturnType<typeof mapMessage>>();
  records.forEach((row) => {
    const mapped = mapMessage(row);
    if (mapped.id) byId.set(mapped.id, mapped);
  });
  const messages = Array.from(byId.values());
  console.log("Mapped inbox messages", messages.length);
  return messages;
}

export type DimadMailFolder = {
  id: string;
  name: string;
  type: string;
  unread: number;
  total: number;
  parentId: string;
};

const SYSTEM_FOLDER_ORDER = ["inbox", "drafts", "sent", "archive", "starred", "important", "junk", "trash"];

function folderTypeOf(raw: Record<string, unknown>, name: string) {
  const sys = String(
    raw.systemFolder || raw.sysFolder || raw.type || raw.role || raw.wellKnownName || raw.wellKnownFolderName || ""
  ).toLowerCase();
  const labels = Array.isArray(raw.sysLabels) ? raw.sysLabels.map((row) => String(row).toLowerCase()) : [];
  const hay = `${sys} ${name.toLowerCase()} ${labels.join(" ")}`;
  if (hay.includes("inbox")) return "inbox";
  if (hay.includes("draft")) return "drafts";
  if (hay.includes("sent")) return "sent";
  if (hay.includes("archive") || hay.includes("all mail")) return "archive";
  if (hay.includes("junk") || hay.includes("spam")) return "junk";
  if (hay.includes("trash") || hay.includes("bin") || hay.includes("deleted")) return "trash";
  if (hay.includes("star")) return "starred";
  if (hay.includes("important")) return "important";
  return "custom";
}

function mapFolder(raw: Record<string, unknown>): DimadMailFolder | null {
  const id = String(raw.id || raw.folderId || raw.name || raw.displayName || "");
  if (!id) return null;
  const name = String(raw.name || raw.displayName || raw.folderName || raw.label || "Folder");
  return {
    id,
    name,
    type: folderTypeOf(raw, name),
    unread: Number(raw.unreadCount || raw.unread || 0) || 0,
    total: Number(raw.totalCount || raw.total || raw.messageCount || raw.count || 0) || 0,
    parentId: String(raw.parentId || raw.parentFolderId || "")
  };
}

function sortFolders(folders: DimadMailFolder[]) {
  return folders.slice().sort((a, b) => {
    const ai = SYSTEM_FOLDER_ORDER.indexOf(a.type);
    const bi = SYSTEM_FOLDER_ORDER.indexOf(b.type);
    const aRank = ai === -1 ? 100 : ai;
    const bRank = bi === -1 ? 100 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

function mapListedMessages(records: Record<string, unknown>[]) {
  const byId = new Map<string, ReturnType<typeof mapMessage>>();
  records.forEach((row) => {
    const mapped = mapMessage(row);
    if (mapped.id) byId.set(mapped.id, mapped);
  });
  return Array.from(byId.values());
}

export async function listEmailFolders(uid: string, idToken: string) {
  const { token } = await aurinkoTokenForUser(uid, idToken);
  const listed = await aurinkoFetch("/email/folders", token);
  console.log("Aurinko email folders", listed.status, listed.data);
  if (listed.status === 401) throw new Error("aurinko_unauthorized");
  if (!listed.ok) throw new Error(aurinkoError(listed.data, "Could not load mail folders."));
  const mapped = aurinkoRecords(listed.data)
    .map(mapFolder)
    .filter((row): row is DimadMailFolder => !!row);
  const folders = sortFolders(mapped);
  console.log("Mapped mail folders", folders.length, folders);
  return folders;
}

async function listFromFolder(token: string, folderId: string) {
  const encoded = encodeURIComponent(folderId);
  const paths = [
    `/email/folders/${encoded}/messages?count=50`,
    `/email/folders/${encoded}/messages?limit=50`,
    `/email/messages?folderId=${encoded}&count=50`,
    `/email/messages?folder=${encoded}&count=50`
  ];
  for (const path of paths) {
    const listed = await aurinkoFetch(path, token);
    console.log("Aurinko folder messages", path, listed.status);
    if (listed.status === 401) throw new Error("aurinko_unauthorized");
    if (!listed.ok) continue;
    const batch = aurinkoRecords(listed.data);
    if (batch.length || listed.ok) return batch;
  }
  return [];
}

export async function listEmailMessages(uid: string, idToken: string, folderId?: string) {
  const { token } = await aurinkoTokenForUser(uid, idToken);
  if (folderId) {
    const records = await listFromFolder(token, folderId);
    const messages = mapListedMessages(records);
    console.log("Mapped folder messages", folderId, messages.length);
    return messages;
  }
  return listInboxWithAccessToken(token);
}

export async function getEmailMessage(uid: string, idToken: string, id: string) {
  const { token } = await aurinkoTokenForUser(uid, idToken);
  const listed = await aurinkoFetch(`/email/messages/${encodeURIComponent(id)}?bodyType=text`, token);
  console.log("Aurinko email message", id, listed.status);
  if (listed.status === 401) throw new Error("aurinko_unauthorized");
  if (!listed.ok) throw new Error("email_get_failed");
  const raw = listed.data as Record<string, unknown>;
  return mapMessage((raw.resource as Record<string, unknown>) || raw);
}

function aurinkoError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const row = data as Record<string, unknown>;
  return String(row.message || row.error || row.detail || row.title || fallback);
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
  if (!to.length) throw new Error("Enter at least one recipient.");
  const body = JSON.stringify({
    subject: payload.subject,
    body: payload.body,
    to
  });
  let sent = await aurinkoFetch("/email/messages/send", token, { method: "POST", body });
  console.log("Aurinko send email /messages/send", sent.status, sent.data);
  if (!sent.ok && sent.status !== 401) {
    sent = await aurinkoFetch("/email/messages?bodyType=text", token, { method: "POST", body });
    console.log("Aurinko send email /messages", sent.status, sent.data);
  }
  if (sent.status === 401) throw new Error("Mailbox session expired. Reconnect Gmail / Outlook.");
  if (!sent.ok) throw new Error(aurinkoError(sent.data, "Aurinko could not send this email."));
  return sent.data;
}
