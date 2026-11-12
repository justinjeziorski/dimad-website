import { auth } from "../firebase.js";

function apiBase() {
  if (typeof window.DIMAD_AURINKO?.apiBase === "function") return window.DIMAD_AURINKO.apiBase();
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") return "http://localhost:3000";
  return "";
}

async function idToken() {
  const user = auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser;
  if (!user) throw new Error("not_signed_in");
  return user.getIdToken();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function waitForAuth(ms = 8000) {
  if (auth.currentUser || window.DIMAD_FIREBASE?.auth?.currentUser) {
    return Promise.resolve(auth.currentUser || window.DIMAD_FIREBASE.auth.currentUser);
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("not_signed_in")), ms);
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) return;
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

function skeletonHtml() {
  return `<div class="p-3 space-y-2 animate-pulse">
    ${Array.from({ length: 6 })
      .map(
        () => `<div class="rounded-lg border border-brand-border bg-brand-black/40 p-2.5 flex gap-2.5">
      <div class="w-7 h-7 rounded-full bg-slate-700 shrink-0"></div>
      <div class="flex-1 space-y-1.5">
        <div class="h-2.5 w-2/5 rounded bg-slate-700"></div>
        <div class="h-2.5 w-4/5 rounded bg-slate-800"></div>
        <div class="h-2 w-3/5 rounded bg-slate-800"></div>
      </div>
    </div>`
      )
      .join("")}
  </div>`;
}

function folderIcon(type) {
  switch (type) {
    case "inbox":
      return "fa-inbox";
    case "sent":
      return "fa-paper-plane";
    case "drafts":
      return "fa-file-pen";
    case "archive":
      return "fa-box-archive";
    case "trash":
      return "fa-trash";
    case "junk":
      return "fa-ban";
    case "starred":
      return "fa-star";
    case "scheduled":
      return "fa-clock";
    case "important":
      return "fa-circle-exclamation";
    default:
      return "fa-folder";
  }
}

const HUD_SYSTEM = ["inbox", "drafts", "sent", "scheduled", "starred", "trash"];
const LAYOUT_KEY = "dimad_mail_layout";
const SCHEDULED_ID = "__dimad_scheduled__";
const SCHEDULED_KEY = "dimad_mail_scheduled";
const DRAFTS_ID = "__dimad_drafts__";
const DRAFTS_KEY = "dimad_mail_drafts";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function readLayout() {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "list" ? "list" : "split";
  } catch {
    return "split";
  }
}

function messageChips(msg) {
  const chips = [];
  if (msg?.unread) chips.push("UNREAD");
  if (msg?.flagged) chips.push("STARRED");
  return chips;
}

function editorText(el) {
  if (!el) return "";
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return String(el.value || "");
  return String(el.innerText || el.textContent || "").replace(/\u00a0/g, " ");
}

function toolBtn(title, onclick, inner) {
  return `<button type="button" title="${escapeHtml(title)}" onclick="${onclick}" class="w-7 h-7 rounded-md text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 flex items-center justify-center">${inner}</button>`;
}

function parseContactToken(raw) {
  const text = String(raw || "").trim().replace(/[,;]+$/, "");
  if (!text) return null;
  const angled = text.match(/^(.*)<([^>]+)>$/);
  const address = String(angled ? angled[2] : text).trim().toLowerCase();
  if (!EMAIL_RE.test(address)) return null;
  const name = String(angled ? angled[1] : "").trim().replace(/^"|"$/g, "");
  return { name, address };
}

function contactLabel(row) {
  return row?.name ? `${row.name} <${row.address}>` : String(row?.address || "");
}

function senderLabel(msg) {
  return String(msg?.from?.name || msg?.from?.address || "Unknown");
}

function senderInitial(msg) {
  const raw = senderLabel(msg).replace(/[^A-Za-z0-9]/g, "");
  return (raw.charAt(0) || "?").toUpperCase();
}

function formatStamp(value) {
  const raw = String(value || "");
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 16);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function safeBodyHtml(htmlOrText) {
  const raw = String(htmlOrText || "");
  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    return `<div class="whitespace-pre-wrap">${escapeHtml(raw)}</div>`;
  }
  const doc = new DOMParser().parseFromString(raw, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,link,style,form").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = String(attr.value || "");
      if (name.startsWith("on") || /^(javascript|data):/i.test(val)) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML || `<div class="whitespace-pre-wrap">${escapeHtml(raw)}</div>`;
}

window.DIMAD_MAIL = {
  connected: false,
  messages: [],
  folders: [],
  folderCache: {},
  bodyCache: {},
  pending: {},
  prefetchInflight: {},
  inflightByFolder: {},
  folderId: "",
  folderName: "Inbox",
  activeId: "",
  activeMessage: null,
  loading: false,
  fetchId: 0,
  inflight: null,
  inflightFolder: "",
  filterQuery: "",
  readFont: "sans",
  composeFont: "sans",
  composeMin: false,
  composeThreadId: "",
  layout: readLayout(),
  replyFiles: [],
  popoutMessage: null,
  draftMode: null,
  sendMenuOpen: false,
  recipientChips: { to: [], cc: [], bcc: [] },
  suggestField: "",
  suggestIndex: 0,
  activeDraftId: "",
  draftTimer: null,

  async connect(serviceType) {
    if (typeof window.DIMAD_AURINKO?.connect === "function") {
      return window.DIMAD_AURINKO.connect(serviceType);
    }
    const token = await idToken().catch(() => "");
    const provider = /microsoft|365|outlook|office/i.test(String(serviceType || "")) ? "microsoft" : "google";
    const path = `/api/auth/aurinko?provider=${encodeURIComponent(provider)}${token ? `&id_token=${encodeURIComponent(token)}` : ""}`;
    window.location.assign(`${apiBase()}${path}`);
  },

  paintShell() {
    const off = document.getElementById("mail-disconnected");
    const on = document.getElementById("mail-connected");
    document.querySelectorAll("[data-mail-connected]").forEach((el) => {
      el.classList.toggle("hidden", !this.connected);
    });
    if (off) off.classList.toggle("hidden", this.connected);
    if (on) on.classList.toggle("hidden", !this.connected);
    this.paintAccountBadge();
    this.applyLayout();
    this.applyReadFont();
  },

  mailboxAccount() {
    try {
      const row = JSON.parse(localStorage.getItem("dimad_aurinko") || "{}");
      return {
        email: String(row.email || "").trim(),
        serviceType: String(row.serviceType || "")
      };
    } catch {
      return { email: "", serviceType: "" };
    }
  },

  paintAccountBadge() {
    const badge = document.getElementById("mail-account-badge");
    const emailEl = document.getElementById("mail-account-email");
    const iconEl = document.getElementById("mail-account-icon");
    const { email, serviceType } = this.mailboxAccount();
    const address = email || this.mailboxEmail() || "";
    if (emailEl) emailEl.textContent = address ? `${address} connected` : "Mailbox";
    if (badge) {
      badge.title = address ? `${address} connected` : "Connected mailbox";
      badge.classList.add("flex");
    }
    if (iconEl) {
      const google = /google|gmail/i.test(serviceType) || /gmail\.com$/i.test(address);
      const outlook = /office|microsoft|outlook/i.test(serviceType);
      if (google) iconEl.innerHTML = '<i class="fa-brands fa-google text-[8px]"></i>';
      else if (outlook) iconEl.innerHTML = '<i class="fa-brands fa-microsoft text-[8px]"></i>';
      else iconEl.textContent = (address.replace(/[^A-Za-z0-9]/g, "").charAt(0) || "@").toUpperCase();
    }
  },

  setLayout(mode) {
    this.layout = mode === "list" ? "list" : "split";
    try {
      localStorage.setItem(LAYOUT_KEY, this.layout);
    } catch {
      /* ignore quota / private mode */
    }
    this.applyLayout();
    this.renderList();
    if (this.activeId) this.renderReader(this.currentMessage());
  },

  applyLayout() {
    const shell = document.getElementById("mail-connected");
    const listPane = document.getElementById("mail-list-pane");
    const readerPane = document.getElementById("mail-reader-pane");
    const back = document.getElementById("mail-reader-back");
    const backLabel = document.getElementById("mail-reader-back-label");
    const readerLabel = document.getElementById("mail-reader-label");
    const listMode = this.layout === "list";
    const reading = listMode && !!this.activeId;
    if (shell) {
      shell.dataset.layout = this.layout;
      shell.style.gridTemplateColumns = listMode
        ? "11.5rem minmax(0, 1fr)"
        : "11.5rem minmax(16rem, 22rem) minmax(0, 1fr)";
    }
    if (listPane) listPane.classList.toggle("hidden", reading);
    if (readerPane) readerPane.classList.toggle("hidden", listMode && !reading);
    if (back) {
      back.classList.toggle("hidden", !reading);
      back.classList.toggle("flex", reading);
    }
    if (backLabel) backLabel.textContent = `Back to ${this.folderName || "Inbox"}`;
    if (readerLabel) readerLabel.classList.toggle("hidden", reading);
    document.querySelectorAll("[data-mail-layout]").forEach((btn) => {
      const on = btn.getAttribute("data-mail-layout") === this.layout;
      btn.classList.toggle("bg-amber-500", on);
      btn.classList.toggle("text-slate-950", on);
      btn.classList.toggle("text-slate-400", !on);
    });
  },

  backToList() {
    this.activeId = "";
    this.activeMessage = null;
    this.renderReader(null);
    this.renderList();
    this.applyLayout();
  },

  applyReadFont() {
    const reader = document.getElementById("mail-reader");
    if (reader) {
      reader.classList.add("mail-doc-sans");
      reader.classList.remove("mail-doc-serif");
    }
    this.applyComposeFont();
  },

  applyComposeFont() {
    const serif = this.composeFont === "serif";
    ["mail-body", "mail-quick-reply", "mail-popout-body"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("mail-doc-serif", serif);
      el.classList.toggle("mail-doc-sans", !serif);
      el.classList.toggle("leading-relaxed", serif);
    });
    const btn = document.getElementById("mail-compose-font");
    if (btn) btn.textContent = serif ? "SERIF" : "SANS";
  },

  toggleComposeFont() {
    this.composeFont = this.composeFont === "serif" ? "sans" : "serif";
    this.applyComposeFont();
  },

  toggleComposeMin() {
    this.composeMin = !this.composeMin;
    const panel = document.getElementById("mail-compose");
    const form = document.getElementById("mail-compose-form");
    if (form) form.classList.toggle("hidden", this.composeMin);
    if (panel) panel.classList.toggle("shadow-black/80", !this.composeMin);
  },

  toggleComposeExtras() {
    const extras = document.getElementById("mail-compose-extras");
    if (extras) extras.classList.toggle("hidden");
  },

  bindList() {
    const root = document.getElementById("mail-list");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    root.addEventListener("click", (event) => {
      const row = event.target.closest?.("[data-mail-id]");
      if (!row) return;
      const id = row.getAttribute("data-mail-id");
      if (event.target.closest?.("[data-mail-check]")) {
        event.stopPropagation();
        return;
      }
      if (event.target.closest?.("[data-mail-star]")) {
        event.preventDefault();
        event.stopPropagation();
        void window.DIMAD_MAIL.toggleStar(id);
        return;
      }
      void window.DIMAD_MAIL.open(id);
    });
    root.addEventListener("dblclick", (event) => {
      const row = event.target.closest?.("[data-mail-id]");
      if (!row) return;
      if (event.target.closest?.("[data-mail-check],[data-mail-star]")) return;
      event.preventDefault();
      void window.DIMAD_MAIL.popOutReply(row.getAttribute("data-mail-id"));
    });
    root.addEventListener("mouseenter", (event) => {
      const btn = event.target.closest?.("[data-mail-id]");
      if (!btn) return;
      void window.DIMAD_MAIL.prefetch(btn.getAttribute("data-mail-id"));
    }, true);
  },

  bindFolders() {
    const root = document.getElementById("mail-folders");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    root.addEventListener("click", (event) => {
      const btn = event.target.closest?.("[data-folder-id]");
      if (!btn) return;
      void window.DIMAD_MAIL.selectFolder(btn.getAttribute("data-folder-id"), btn.getAttribute("data-folder-name"));
    });
  },

  replyToolsHtml(target, includePopout = true) {
    return `<div class="flex flex-wrap items-center justify-end gap-0.5">
      ${toolBtn("Bold", `DIMAD_MAIL.formatDraft('bold','${target}')`, '<span class="font-bold text-[11px]">B</span>')}
      ${toolBtn("Italic", `DIMAD_MAIL.formatDraft('italic','${target}')`, '<span class="italic text-[11px]">I</span>')}
      ${toolBtn("Underline", `DIMAD_MAIL.formatDraft('underline','${target}')`, '<span class="underline text-[11px]">U</span>')}
      <span class="w-px h-3.5 bg-neutral-700 mx-0.5"></span>
      ${toolBtn("Attach files", `DIMAD_MAIL.attachDraft()`, '<i class="fa-solid fa-paperclip text-[10px]"></i>')}
      ${toolBtn("Insert link", `DIMAD_MAIL.insertLink('${target}')`, '<i class="fa-solid fa-link text-[10px]"></i>')}
      ${toolBtn("Insert signature", `DIMAD_MAIL.insertSignature('${target}')`, '<i class="fa-solid fa-pen-nib text-[10px]"></i>')}
      ${toolBtn("Print", `DIMAD_MAIL.printMessage()`, '<i class="fa-solid fa-print text-[10px]"></i>')}
      ${includePopout ? toolBtn("Pop out reply", `DIMAD_MAIL.popOutReply()`, '<i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-amber-400"></i>') : ""}
    </div>`;
  },

  bindAttach() {
    const input = document.getElementById("mail-attach-input");
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    input.addEventListener("change", () => {
      const extra = Array.from(input.files || []);
      this.replyFiles = this.replyFiles.concat(extra);
      input.value = "";
      this.renderAttachChips();
    });
  },

  renderAttachChips() {
    const html = this.replyFiles
      .map(
        (file, i) =>
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-brand-border bg-brand-black text-[9px] font-mono text-slate-300">
            <i class="fa-solid fa-paperclip text-[8px] text-slate-500"></i>${escapeHtml(file.name)}
            <button type="button" onclick="DIMAD_MAIL.removeAttach(${i})" class="text-slate-500 hover:text-brand-alert">✕</button>
          </span>`
      )
      .join("");
    ["mail-quick-files", "mail-popout-files"].forEach((id) => {
      const root = document.getElementById(id);
      if (root) root.innerHTML = html;
    });
  },

  removeAttach(index) {
    this.replyFiles.splice(index, 1);
    this.renderAttachChips();
  },

  focusEditor(id) {
    const el = document.getElementById(id);
    if (el) el.focus();
    return el;
  },

  formatDraft(command, target) {
    const el = this.focusEditor(target);
    if (!el) return;
    if (el.isContentEditable) {
      document.execCommand(command, false, null);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = el.value.slice(start, end) || "text";
    const wrap = command === "bold" ? ["**", "**"] : command === "italic" ? ["_", "_"] : ["", ""];
    const next = `${el.value.slice(0, start)}${wrap[0]}${selected}${wrap[1]}${el.value.slice(end)}`;
    el.value = next;
  },

  attachDraft() {
    this.bindAttach();
    document.getElementById("mail-attach-input")?.click();
  },

  insertLink(target) {
    const el = this.focusEditor(target);
    if (!el) return;
    const url = window.prompt("Insert link URL", "https://");
    if (!url) return;
    if (el.isContentEditable) {
      document.execCommand("createLink", false, url);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = el.value.slice(start, end) || url;
    el.value = `${el.value.slice(0, start)}${selected} (${url})${el.value.slice(end)}`;
  },

  insertSignature(target) {
    const el = this.focusEditor(target);
    if (!el) return;
    let signature = "";
    try {
      signature = String(localStorage.getItem("dimad_mail_signature") || "");
    } catch {
      signature = "";
    }
    if (!signature) {
      signature = window.prompt("Save a signature to insert in replies", "—\nSent from DIMAD OS") || "";
      if (!signature) return;
      try {
        localStorage.setItem("dimad_mail_signature", signature);
      } catch {
        /* ignore */
      }
    }
    if (el.isContentEditable) {
      el.focus();
      document.execCommand("insertText", false, `\n\n${signature}`);
      return;
    }
    el.value = `${el.value || ""}\n\n${signature}`;
  },

  printMessage() {
    const msg = this.popoutMessage || this.currentMessage();
    if (!msg) return;
    const frame = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!frame) return;
    frame.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(msg.subject || "Email")}</title>
      <style>body{font-family:Inter,sans-serif;padding:24px;color:#111} .meta{color:#555;font-size:12px;margin-bottom:16px}</style></head><body>
      <h1>${escapeHtml(msg.subject || "(no subject)")}</h1>
      <div class="meta">${escapeHtml(senderLabel(msg))} · ${escapeHtml(msg.from?.address || "")} · ${escapeHtml(formatStamp(msg.receivedAt))}</div>
      <div>${safeBodyHtml(msg.body || msg.snippet || "")}</div>
      </body></html>`);
    frame.document.close();
    frame.focus();
    frame.print();
  },

  async popOutReply(id) {
    if (id) await this.open(id);
    const msg = this.currentMessage();
    if (!msg) return;
    this.popoutMessage = msg;
    const pop = document.getElementById("mail-popout");
    if (!pop) return;
    const draft = editorText(document.getElementById("mail-quick-reply"));
    const title = document.getElementById("mail-popout-title");
    const subject = document.getElementById("mail-popout-subject");
    const meta = document.getElementById("mail-popout-meta");
    const original = document.getElementById("mail-popout-original");
    const body = document.getElementById("mail-popout-body");
    const tools = document.getElementById("mail-popout-tools");
    if (title) title.textContent = "REPLY";
    if (subject) subject.textContent = msg.subject ? `Re: ${msg.subject.replace(/^Re:\s*/i, "")}` : "Reply";
    if (meta) meta.textContent = `${senderLabel(msg)} · ${msg.from?.address || ""}`;
    if (original) original.innerHTML = safeBodyHtml(msg.body || msg.snippet || "");
    if (body) body.innerText = draft;
    if (tools) tools.innerHTML = this.replyToolsHtml("mail-popout-body", false);
    const status = document.getElementById("mail-popout-status");
    if (status) {
      status.classList.add("hidden");
      status.textContent = "";
    }
    this.renderAttachChips();
    pop.classList.remove("hidden");
    pop.classList.add("flex");
    body?.focus();
  },

  closePopout() {
    const pop = document.getElementById("mail-popout");
    if (!pop) return;
    pop.classList.add("hidden");
    pop.classList.remove("flex");
    this.popoutMessage = null;
    const body = document.getElementById("mail-popout-body");
    if (body) body.innerHTML = "";
  },

  async sendPopout() {
    const msg = this.popoutMessage || this.currentMessage();
    const body = this.withAttachments(editorText(document.getElementById("mail-popout-body")));
    if (!msg?.from?.address) return;
    await this.send({
      to: msg.from.address,
      subject: msg.subject ? `Re: ${msg.subject.replace(/^Re:\s*/i, "")}` : "(No Subject)",
      body,
      threadId: msg.threadId || msg.id || "",
      statusEl: document.getElementById("mail-popout-status"),
      btn: document.getElementById("mail-popout-send"),
      sendLabel: "Send Reply",
      closeCompose: false
    });
    const status = document.getElementById("mail-popout-status");
    if (status && status.classList.contains("text-brand-mint")) {
      this.replyFiles = [];
      this.renderAttachChips();
      this.closePopout();
    }
  },

  withAttachments(body) {
    if (!this.replyFiles.length) return body;
    const names = this.replyFiles.map((file) => file.name).join(", ");
    return `${body}\n\n[Attachments selected: ${names}]`;
  },

  bindSearch() {
    const input = document.getElementById("mail-search");
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    input.addEventListener("input", () => {
      window.DIMAD_MAIL.filterQuery = input.value || "";
      window.DIMAD_MAIL.renderList();
    });
  },

  renderFolders() {
    const root = document.getElementById("mail-folders");
    const title = document.getElementById("mail-folder-title");
    if (title) title.textContent = this.folderName || "Inbox";
    if (!root) return;
    this.bindFolders();
    if (!this.folders.length) {
      root.innerHTML = `<button type="button" data-folder-id="${SCHEDULED_ID}" data-folder-name="Scheduled" class="flex items-center gap-2 w-full text-left px-3 py-1.5 text-[11px] font-mono font-semibold border-l-2 ${this.folderId === SCHEDULED_ID ? "border-amber-500 bg-amber-500/10 text-white" : "border-transparent text-slate-300 hover:bg-brand-black/50"}">
        <i class="fa-solid fa-clock w-3.5 text-center text-slate-400"></i>
        <span class="truncate">Scheduled</span>
      </button>
      <div class="px-3 py-3 text-[10px] font-mono text-slate-500">Loading folders…</div>`;
      return;
    }
    const scheduledFolder = {
      id: SCHEDULED_ID,
      name: "Scheduled",
      type: "scheduled",
      unread: 0,
      total: this.readScheduled().length,
      parentId: ""
    };
    const hud = this.folders.filter((row) => HUD_SYSTEM.includes(row.type) && row.type !== "scheduled");
    if (!hud.some((row) => row.type === "drafts")) {
      const inboxAt = hud.findIndex((row) => row.type === "inbox");
      hud.splice(inboxAt === -1 ? 0 : inboxAt + 1, 0, {
        id: DRAFTS_ID,
        name: "Drafts",
        type: "drafts",
        unread: 0,
        total: this.readDrafts().length,
        parentId: ""
      });
    }
    const sentAt = hud.findIndex((row) => row.type === "sent");
    hud.splice(sentAt === -1 ? hud.length : sentAt + 1, 0, scheduledFolder);
    const more = this.folders.filter((row) => row.type !== "custom" && !HUD_SYSTEM.includes(row.type));
    const custom = this.folders.filter((row) => row.type === "custom");
    const item = (folder) => {
      const active = String(folder.id) === String(this.folderId);
      const unread = folder.unread
        ? `<span class="ml-auto text-[9px] font-mono tabular-nums text-brand-gold">${folder.unread}</span>`
        : "";
      const tone = active
        ? "border-amber-500 bg-amber-500/10 text-white"
        : "border-transparent text-slate-300 hover:bg-brand-black/50";
      return `<button type="button" data-folder-id="${escapeHtml(folder.id)}" data-folder-name="${escapeHtml(folder.name)}" class="flex items-center gap-2 w-full text-left px-3 py-1.5 text-[11px] font-mono font-semibold border-l-2 ${tone} whitespace-nowrap">
        <i class="fa-solid ${folderIcon(folder.type)} w-3.5 text-center text-slate-400"></i>
        <span class="truncate">${escapeHtml(folder.name)}</span>
        ${unread}
      </button>`;
    };
    const head = (label) =>
      `<div class="px-3 pt-2.5 pb-1 text-[8px] font-mono uppercase tracking-[0.16em] text-slate-600">${label}</div>`;
    root.innerHTML = [
      hud.length ? head("Mailbox") + hud.map(item).join("") : "",
      more.length ? head("More") + more.map(item).join("") : "",
      custom.length ? head("Labels") + custom.map(item).join("") : ""
    ].join("");
  },

  async loadFolders() {
    this.bindFolders();
    this.renderFolders();
    try {
      const token = await idToken();
      const res = await fetch(`${apiBase()}/api/email/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      console.log("Email folders payload", res.status, data);
      if (!res.ok || data.ok === false) {
        console.error("Email folders failed", data);
        return data;
      }
      this.folders = Array.isArray(data.folders) ? data.folders : [];
      if (!this.folderId || this.folderId === "inbox") {
        const inbox = this.folders.find((row) => row.type === "inbox") || this.folders[0];
        if (inbox) {
          const previous = this.folderId;
          this.folderId = inbox.id;
          this.folderName = inbox.name || "Inbox";
          if (previous && this.folderCache[previous] && !this.folderCache[inbox.id]) {
            this.folderCache[inbox.id] = this.folderCache[previous];
          }
          if (this.messages.length && !this.folderCache[inbox.id]) this.folderCache[inbox.id] = this.messages;
        }
      }
      this.renderFolders();
      return data;
    } catch (err) {
      console.error("Email folders failed", err);
      return { ok: false };
    }
  },

  cacheKey(folderId) {
    return String(folderId || this.folderId || "inbox");
  },

  applyPending(list) {
    return (list || [])
      .filter((msg) => msg && msg.id && !this.pending[msg.id]?.deleted)
      .map((msg) => {
        const overlay = this.pending[msg.id];
        return overlay ? { ...msg, ...overlay, deleted: undefined } : msg;
      });
  },

  writeCache(folderId, list) {
    const key = this.cacheKey(folderId);
    const merged = this.applyPending(list).map((msg) => {
      const full = this.bodyCache[msg.id];
      return full ? { ...msg, body: full.body || msg.body, to: full.to || msg.to } : msg;
    });
    this.folderCache[key] = merged;
    return merged;
  },

  paintFolder(id, name, { silent } = {}) {
    this.folderId = id;
    this.folderName = name || this.folders.find((row) => String(row.id) === String(id))?.name || "Folder";
    const cached = this.folderCache[this.cacheKey(id)];
    if (cached) {
      this.messages = this.applyPending(cached);
      this.loading = false;
      this.renderFolders();
      this.renderList();
      if (!this.activeId) this.renderReader(null);
      return true;
    }
    if (!silent) {
      this.messages = [];
      this.loading = true;
      this.renderFolders();
      this.showSkeleton();
    }
    return false;
  },

  async selectFolder(id, name) {
    if (!id) return;
    this.activeId = "";
    this.activeMessage = null;
    this.draftMode = null;
    if (id === SCHEDULED_ID) {
      this.paintScheduled();
      this.applyLayout();
      return;
    }
    if (id === DRAFTS_ID) {
      this.paintLocalDrafts();
      this.applyLayout();
      return;
    }
    const hadCache = this.paintFolder(id, name);
    this.renderReader(null);
    this.applyLayout();
    await this.refresh({ keepExisting: hadCache, silent: hadCache, folderId: id });
  },

  showSkeleton() {
    const root = document.getElementById("mail-list");
    if (!root) return;
    this.bindList();
    if (this.messages.length) return;
    root.innerHTML = skeletonHtml();
  },

  visibleMessages() {
    const q = String(this.filterQuery || "").trim().toLowerCase();
    if (!q) return this.messages;
    return this.messages.filter((msg) => {
      const hay = [
        msg.subject,
        msg.snippet,
        msg.body,
        msg.from?.name,
        msg.from?.address
      ]
        .map((part) => String(part || "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  },

  renderList() {
    const root = document.getElementById("mail-list");
    if (!root) return;
    this.bindList();
    this.bindSearch();
    if (this.loading && !this.messages.length) {
      root.innerHTML = skeletonHtml();
      return;
    }
    if (!this.messages.length) {
      root.innerHTML = `<div class="p-6 text-center space-y-2">
        <i class="fa-regular fa-folder-open text-slate-600"></i>
        <div class="text-[10px] font-mono text-slate-500">${escapeHtml(this.folderName || "This folder")} is empty.</div>
      </div>`;
      return;
    }
    const rows = this.visibleMessages();
    if (!rows.length) {
      root.innerHTML = '<div class="p-6 text-center text-[10px] font-mono text-slate-500">No matches in this folder.</div>';
      return;
    }
    root.innerHTML = rows.map((msg) => this.layout === "list" ? this.listRowHtml(msg) : this.splitRowHtml(msg)).join("");
  },

  splitRowHtml(msg) {
    const active = msg.id === this.activeId;
    const unread = !!msg.unread;
    const wrap = active
      ? "border-l-2 border-amber-500 bg-amber-500/10"
      : "border-l-2 border-transparent hover:bg-brand-black/40";
    return `<button type="button" data-mail-id="${escapeHtml(msg.id)}" class="w-full text-left px-3 py-2.5 border-b border-brand-border/80 mail-doc-sans ${wrap}">
      <div class="flex gap-2.5">
        <span class="mt-0.5 w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 text-brand-gold text-[10px] font-mono font-bold flex items-center justify-center shrink-0">${escapeHtml(senderInitial(msg))}</span>
        <span class="min-w-0 flex-1">
          <span class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-bold truncate ${unread ? "text-white" : "text-slate-100"}">${escapeHtml(senderLabel(msg))}${msg.flagged ? ' <i class="fa-solid fa-star text-brand-gold text-[9px]"></i>' : ""}</span>
            <span class="text-[9px] font-mono text-slate-500 flex-shrink-0">${escapeHtml(formatStamp(msg.receivedAt))}</span>
          </span>
          <span class="block text-[11px] ${unread ? "text-slate-100" : "text-slate-300"} truncate">${escapeHtml(msg.subject)}</span>
          <span class="block text-[10px] text-slate-500 truncate">${escapeHtml(msg.snippet)}</span>
        </span>
      </div>
    </button>`;
  },

  listRowHtml(msg) {
    const unread = !!msg.unread;
    const chips = messageChips(msg)
      .map((chip) => `<span class="px-1.5 py-0.5 rounded bg-brand-black border border-brand-border text-[8px] font-mono tracking-wide text-slate-400">${escapeHtml(chip)}</span>`)
      .join("");
    return `<div data-mail-id="${escapeHtml(msg.id)}" class="group flex items-center gap-2 w-full px-2 py-1.5 border-b border-brand-border/80 mail-doc-sans cursor-pointer hover:bg-brand-black/50 ${unread ? "bg-brand-black/20" : ""}">
      <label class="shrink-0 flex items-center" data-mail-check>
        <input type="checkbox" class="w-3.5 h-3.5 rounded border-brand-border bg-brand-black text-amber-500 focus:ring-0" tabindex="-1">
      </label>
      <button type="button" data-mail-star class="shrink-0 w-6 h-6 rounded text-[11px] ${msg.flagged ? "text-brand-gold" : "text-slate-600 hover:text-brand-gold"}" title="${msg.flagged ? "Unstar" : "Star"}">
        <i class="fa-${msg.flagged ? "solid" : "regular"} fa-star"></i>
      </button>
      <span class="w-[11.5rem] shrink-0 text-[12px] truncate ${unread ? "font-bold text-white" : "font-semibold text-slate-200"}">${escapeHtml(senderLabel(msg))}</span>
      <span class="min-w-0 flex-1 truncate text-[12px]">
        <span class="${unread ? "font-semibold text-slate-100" : "text-slate-300"}">${escapeHtml(msg.subject || "(no subject)")}</span>
        <span class="text-slate-500"> — ${escapeHtml(msg.snippet || "")}</span>
      </span>
      <span class="hidden sm:flex items-center gap-1 shrink-0">${chips}</span>
      <span class="w-[4.75rem] shrink-0 text-right text-[10px] font-mono ${unread ? "text-slate-300" : "text-slate-500"}">${escapeHtml(formatStamp(msg.receivedAt))}</span>
    </div>`;
  },

  renderReader(message) {
    const root = document.getElementById("mail-reader");
    if (!root) return;
    this.applyReadFont();
    if (!message) {
      this.activeMessage = null;
      root.innerHTML = `<div class="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-6 gap-2">
        <div class="w-12 h-12 rounded-full border border-brand-border bg-brand-black/50 flex items-center justify-center text-slate-500">
          <i class="fa-regular fa-envelope"></i>
        </div>
        <div class="text-[12px] text-slate-300">Select a message</div>
      </div>`;
      this.applyLayout();
      return;
    }
    const keepDraft = message.id === this.activeMessage?.id;
    const savedDraft = keepDraft ? editorText(document.getElementById("mail-quick-reply")) : "";
    const savedTo = keepDraft ? document.getElementById("mail-inline-to")?.value || "" : "";
    const savedCc = keepDraft ? document.getElementById("mail-inline-cc")?.value || "" : "";
    const savedBcc = keepDraft ? document.getElementById("mail-inline-bcc")?.value || "" : "";
    if (!keepDraft) this.draftMode = null;
    this.activeMessage = message;
    const fromName = escapeHtml(message.from?.name || senderLabel(message));
    const fromAddr = escapeHtml(message.from?.address || "");
    const toLine = (message.to || [])
      .map((row) => row.address || row.name)
      .filter(Boolean)
      .join(", ");
    root.innerHTML = `
      <div class="flex flex-col h-full min-h-0">
        <div class="px-5 pt-4 pb-3 border-b border-brand-border space-y-3 shrink-0">
          <h3 class="text-[18px] font-semibold text-white leading-snug">${escapeHtml(message.subject || "(no subject)")}</h3>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 text-brand-gold text-[12px] font-mono font-bold flex items-center justify-center shrink-0">${escapeHtml(senderInitial(message))}</span>
              <div class="min-w-0">
                <div class="text-[13px] text-slate-100 truncate">${fromName}</div>
                <div class="text-[10px] font-mono text-slate-500 truncate">${fromAddr}${toLine ? ` · to ${escapeHtml(toLine)}` : ""}</div>
              </div>
            </div>
            <div class="text-[10px] font-mono text-slate-500 shrink-0">${escapeHtml(formatStamp(message.receivedAt))}</div>
          </div>
          <div class="flex flex-wrap gap-1">
            <button type="button" onclick="DIMAD_MAIL.startInline('reply')" class="px-2 py-1 rounded-md border border-brand-border text-[9px] font-mono font-bold text-slate-200 hover:text-brand-gold">Reply</button>
            <button type="button" onclick="DIMAD_MAIL.startInline('replyAll')" class="px-2 py-1 rounded-md border border-brand-border text-[9px] font-mono font-bold text-slate-200 hover:text-brand-gold">Reply all</button>
            <button type="button" onclick="DIMAD_MAIL.startInline('forward')" class="px-2 py-1 rounded-md border border-brand-border text-[9px] font-mono font-bold text-slate-200 hover:text-brand-gold">Forward</button>
            <button type="button" onclick="DIMAD_MAIL.toggleRead()" class="px-2 py-1 rounded-md border border-brand-border text-[9px] font-mono font-bold text-slate-200 hover:text-brand-gold">${message.unread ? "Mark read" : "Mark unread"}</button>
            <button type="button" onclick="DIMAD_MAIL.star()" class="px-2 py-1 rounded-md border border-brand-border text-[9px] font-mono font-bold ${message.flagged ? "text-brand-gold" : "text-slate-200"} hover:text-brand-gold">${message.flagged ? "Starred" : "Star"}</button>
            <button type="button" onclick="DIMAD_MAIL.trash()" class="px-2 py-1 rounded-md border border-brand-border text-[9px] font-mono font-bold text-slate-200 hover:text-brand-gold">Trash</button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <div class="mail-doc-body text-[15px] leading-relaxed text-slate-100 max-w-3xl">${safeBodyHtml(message.body || message.snippet)}</div>
          <div id="mail-inline-actions" class="flex flex-wrap gap-2">
            <button type="button" onclick="DIMAD_MAIL.startInline('reply')" class="px-4 py-1.5 rounded-lg text-xs font-mono bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold">Reply</button>
            <button type="button" onclick="DIMAD_MAIL.startInline('forward')" class="px-4 py-1.5 rounded-lg text-xs font-mono border border-brand-border text-slate-200 hover:text-brand-gold">Forward</button>
          </div>
          <div id="mail-compose-inline" class="hidden max-w-3xl rounded-xl border border-amber-500/30 bg-neutral-900/80 p-4 space-y-3">
            <div class="flex items-center justify-between gap-2 text-xs font-mono text-neutral-400">
              <span id="mail-inline-label">REPLYING TO: <strong class="text-amber-400">${fromAddr || "Recipient"}</strong></span>
              ${this.replyToolsHtml("mail-quick-reply")}
            </div>
            <div class="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2">
              <div class="flex items-start gap-2">
                <span class="w-9 mt-1.5 text-[10px] font-mono text-slate-500 shrink-0">To:</span>
                <div class="min-w-0 flex-1 flex flex-wrap items-center gap-1">
                  <div id="mail-chips-to" class="contents"></div>
                  <input id="mail-inline-to" data-chip-field="to" type="text" autocomplete="off" class="min-w-[8rem] flex-1 bg-transparent text-sm text-neutral-100 font-mono focus:outline-none placeholder-neutral-600" placeholder="add recipients…">
                </div>
                <button type="button" onclick="DIMAD_MAIL.toggleInlineExtras()" class="mt-1 text-[10px] font-mono text-neutral-500 hover:text-amber-400 shrink-0">Cc/Bcc</button>
              </div>
              <div id="mail-inline-extras" class="hidden space-y-2">
                <div class="flex items-start gap-2">
                  <span class="w-9 mt-1.5 text-[10px] font-mono text-slate-500 shrink-0">Cc:</span>
                  <div class="min-w-0 flex-1 flex flex-wrap items-center gap-1">
                    <div id="mail-chips-cc" class="contents"></div>
                    <input id="mail-inline-cc" data-chip-field="cc" type="text" autocomplete="off" class="min-w-[8rem] flex-1 bg-transparent text-sm text-neutral-100 font-mono focus:outline-none placeholder-neutral-600" placeholder="add cc…">
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-9 mt-1.5 text-[10px] font-mono text-slate-500 shrink-0">Bcc:</span>
                  <div class="min-w-0 flex-1 flex flex-wrap items-center gap-1">
                    <div id="mail-chips-bcc" class="contents"></div>
                    <input id="mail-inline-bcc" data-chip-field="bcc" type="text" autocomplete="off" class="min-w-[8rem] flex-1 bg-transparent text-sm text-neutral-100 font-mono focus:outline-none placeholder-neutral-600" placeholder="add bcc…">
                  </div>
                </div>
              </div>
            </div>
            <div id="mail-quick-reply" contenteditable="true" data-mail-editor data-placeholder="Type your reply here..." class="w-full min-h-[6rem] p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500 text-sm mail-doc-sans"></div>
            <div id="mail-quick-files" class="flex flex-wrap gap-1"></div>
            <div id="mail-schedule-row" class="hidden items-center gap-2">
              <input id="mail-schedule-at" type="datetime-local" class="bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1 text-[11px] font-mono text-slate-200">
              <button type="button" onclick="DIMAD_MAIL.confirmSchedule()" class="px-3 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-500 text-slate-950">Confirm schedule</button>
            </div>
            <div class="flex items-center justify-between gap-2">
              <p id="mail-quick-status" class="hidden text-[10px] font-mono"></p>
              <div class="ml-auto flex items-center gap-2">
                <button type="button" onclick="DIMAD_MAIL.discardQuickReply()" title="Delete draft" aria-label="Delete draft" class="w-8 h-8 rounded-lg text-slate-400 hover:text-brand-alert hover:bg-neutral-800 flex items-center justify-center">
                  <i class="fa-solid fa-trash text-[11px]"></i>
                </button>
                <div class="relative inline-flex">
                  <button type="button" id="mail-quick-send" onclick="DIMAD_MAIL.sendInline()" class="px-4 py-1.5 rounded-l-lg text-xs font-mono bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold disabled:opacity-50">Send</button>
                  <button type="button" onclick="DIMAD_MAIL.toggleSendMenu()" title="More send options" class="px-2 py-1.5 rounded-r-lg text-xs font-mono bg-amber-500 hover:bg-amber-400 text-neutral-950 border-l border-amber-700/40">
                    <i class="fa-solid fa-caret-down"></i>
                  </button>
                  <div id="mail-send-menu" class="hidden absolute right-0 bottom-full mb-1 w-40 rounded-md border border-brand-border bg-neutral-950 shadow-xl z-10">
                    <button type="button" onclick="DIMAD_MAIL.sendInline()" class="w-full text-left px-3 py-2 text-[11px] font-mono text-slate-200 hover:bg-neutral-800">Send now</button>
                    <button type="button" onclick="DIMAD_MAIL.showSchedule()" class="w-full text-left px-3 py-2 text-[11px] font-mono text-slate-200 hover:bg-neutral-800">Schedule send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    this.applyReadFont();
    this.applyLayout();
    this.renderAttachChips();
    if (this.draftMode) {
      this.startInline(this.draftMode, { restore: savedDraft, keepChips: true });
    }
  },

  async mount() {
    this.connected = true;
    this.paintShell();
    this.bindList();
    this.bindFolders();
    this.bindSearch();
    this.bindAttach();
    this.bindChipInputs();
    void this.flushScheduled();
    if (!this.scheduledTimer) this.scheduledTimer = setInterval(() => void this.flushScheduled(), 30000);
    const cachedInbox = this.folderCache[this.cacheKey(this.folderId || "inbox")];
    if (cachedInbox?.length) {
      this.messages = this.applyPending(cachedInbox);
      this.renderList();
    } else {
      this.showSkeleton();
    }
    this.renderFolders();
    this.renderReader(this.activeMessage);
    await waitForAuth().catch(() => null);
    const keepExisting = !!this.messages.length;
    const [folderResult] = await Promise.all([
      this.loadFolders(),
      this.refresh({ keepExisting, silent: keepExisting, folderId: this.folderId || "inbox" })
    ]);
    return folderResult;
  },

  async refresh(opts) {
    const keepExisting = !!(opts && opts.keepExisting);
    const silent = !!(opts && opts.silent);
    const folderId = (opts && opts.folderId) || this.folderId || "inbox";
    if (folderId === SCHEDULED_ID || this.folderId === SCHEDULED_ID) {
      this.paintScheduled();
      return { ok: true, messages: this.messages };
    }
    if (folderId === DRAFTS_ID || this.folderId === DRAFTS_ID) {
      this.paintLocalDrafts();
      return { ok: true, messages: this.messages };
    }
    const key = this.cacheKey(folderId);
    if (this.inflightByFolder[key]) return this.inflightByFolder[key];
    const requestId = ++this.fetchId;
    this.inflightFolder = folderId;
    if (!silent && !this.folderCache[key]?.length) {
      this.loading = true;
      this.showSkeleton();
    }
    const run = (async () => {
      try {
        await waitForAuth();
        const token = await idToken();
        const params = new URLSearchParams({ limit: "30" });
        if (folderId && folderId !== "inbox") params.set("folderId", folderId);
        else if (this.folderId && this.folderId !== "inbox") params.set("folderId", this.folderId);
        const res = await fetch(`${apiBase()}/api/email/messages?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        console.log("Email folder payload", folderId || "inbox", res.status, data);
        const errEl = document.getElementById("mail-error");
        if (!res.ok || data.ok === false) {
          const remembered = typeof window.DIMAD_AURINKO?.isConnected === "function" && window.DIMAD_AURINKO.isConnected();
          if (!remembered && !this.folders.length && !this.messages.length) {
            this.connected = false;
            this.paintShell();
          }
          if (errEl && !silent) {
            errEl.classList.remove("hidden");
            errEl.textContent = `Folder failed: ${data.error || res.status}.`;
          }
          if (this.cacheKey(this.folderId) === key) this.renderList();
          return data;
        }
        if (errEl) {
          errEl.classList.add("hidden");
          errEl.textContent = "";
        }
        const incoming = Array.isArray(data.messages) ? data.messages.filter((row) => row && row.id) : [];
        if (incoming.length || !keepExisting) {
          this.writeCache(key, incoming);
        } else {
          console.warn("Kept existing inbox; later fetch returned 0 messages");
        }
        this.connected = true;
        this.paintShell();
        if (this.cacheKey(this.folderId) === key || (!this.folderId && key === "inbox")) {
          this.messages = this.folderCache[key] || this.messages;
          this.mergeLocalDraftsIfNeeded(folderId);
          this.loading = false;
          this.renderList();
          if (!this.activeId) this.renderReader(null);
        }
        return data;
      } catch (err) {
        console.error("Email refresh failed", err);
        const remembered = typeof window.DIMAD_AURINKO?.isConnected === "function" && window.DIMAD_AURINKO.isConnected();
        if (!remembered && !this.messages.length) {
          this.connected = false;
          this.paintShell();
        }
        return { ok: false };
      } finally {
        delete this.inflightByFolder[key];
        if (requestId === this.fetchId) {
          this.loading = false;
          this.inflight = null;
          if (this.cacheKey(this.folderId) === key && this.messages.length) this.renderList();
        }
      }
    })();
    this.inflightByFolder[key] = run;
    this.inflight = run;
    return run;
  },

  rememberBody(message) {
    if (!message?.id) return message;
    this.bodyCache[message.id] = message;
    Object.keys(this.folderCache).forEach((key) => {
      this.folderCache[key] = (this.folderCache[key] || []).map((row) => (row.id === message.id ? { ...row, ...message } : row));
    });
    this.messages = this.messages.map((row) => (row.id === message.id ? { ...row, ...message } : row));
    return message;
  },

  async prefetch(id) {
    if (!id) return null;
    if (this.bodyCache[id]) return this.bodyCache[id];
    if (this.prefetchInflight[id]) return this.prefetchInflight[id];
    this.prefetchInflight[id] = (async () => {
      try {
        const token = await idToken();
        const res = await fetch(`${apiBase()}/api/email/messages?id=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (data.message?.id) this.rememberBody(data.message);
        return data.message;
      } catch (err) {
        console.warn("Email prefetch failed", id, err);
        return null;
      } finally {
        delete this.prefetchInflight[id];
      }
    })();
    return this.prefetchInflight[id];
  },

  async open(id) {
    if (String(id).startsWith("draft-")) {
      const draft = this.readDrafts().find((row) => row.id === id);
      if (draft) {
        this.activeDraftId = draft.id;
        this.recipientChips = draft.chips || { to: [], cc: [], bcc: [] };
        this.draftMode = draft.mode || "reply";
        this.activeId = draft.id;
        this.renderList();
        this.renderReader(draft);
        this.startInline(this.draftMode, { restore: draft.body || "", keepChips: true });
        this.applyLayout();
        return;
      }
    }
    if (id !== this.activeId) this.draftMode = null;
    this.activeId = id;
    const local = this.bodyCache[id] || this.messages.find((row) => row.id === id) || null;
    this.applyLayout();
    this.renderList();
    if (local) this.renderReader(local);
    const full = local?.body ? local : await this.prefetch(id);
    const message = this.bodyCache[id] || full || local;
    if (message) this.renderReader(message);
    if (message?.unread) void this.mutate("read", { unread: false }, message.id);
  },

  currentMessage() {
    return this.activeMessage || this.messages.find((row) => row.id === this.activeId) || null;
  },

  compose(defaults) {
    const modal = document.getElementById("mail-compose");
    if (!modal) return;
    this.composeMin = false;
    const form = document.getElementById("mail-compose-form");
    if (form) form.classList.remove("hidden");
    document.getElementById("mail-to").value = "";
    document.getElementById("mail-subject").value = defaults?.subject || "";
    document.getElementById("mail-body").value = defaults?.body || "";
    const cc = document.getElementById("mail-cc");
    const bcc = document.getElementById("mail-bcc");
    if (cc) cc.value = "";
    if (bcc) bcc.value = "";
    this.recipientChips = {
      to: this.tokensToChips(defaults?.to || ""),
      cc: this.tokensToChips(defaults?.cc || ""),
      bcc: this.tokensToChips(defaults?.bcc || "")
    };
    this.bindChipInputs();
    this.renderAllChips();
    const extras = document.getElementById("mail-compose-extras");
    if (extras) extras.classList.toggle("hidden", !defaults?.cc && !defaults?.bcc);
    const title = document.getElementById("mail-compose-title");
    if (title) title.textContent = defaults?.title || (defaults?.subject?.startsWith("Re:") ? "REPLY" : defaults?.subject?.startsWith("Fwd:") ? "FORWARD" : "NEW MESSAGE");
    const status = document.getElementById("mail-send-status");
    if (status) {
      status.classList.add("hidden");
      status.textContent = "";
    }
    this.composeThreadId = defaults?.threadId || "";
    this.applyComposeFont();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("mail-body")?.focus();
  },

  closeCompose() {
    const modal = document.getElementById("mail-compose");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.composeMin = false;
    ["mail-to", "mail-cc", "mail-bcc", "mail-subject", "mail-body"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  },

  tokensToChips(value) {
    return String(value || "")
      .split(/[,;]+/)
      .map((part) => parseContactToken(part))
      .filter(Boolean);
  },

  chipString(field) {
    const chips = (this.recipientChips[field] || []).map((row) => row.address);
    const leftover = document.querySelector(`[data-chip-field="${field}"]`)?.value || "";
    const extra = parseContactToken(leftover);
    return extra ? chips.concat(extra.address).join(", ") : chips.join(", ");
  },

  mailboxContacts() {
    const map = new Map();
    const add = (row) => {
      const address = String(row?.address || "").trim().toLowerCase();
      if (!address || !EMAIL_RE.test(address)) return;
      const name = String(row?.name || "").trim();
      const prev = map.get(address);
      if (!prev || (name && !prev.name)) map.set(address, { name, address });
    };
    Object.values(this.folderCache).forEach((list) => (list || []).forEach((msg) => {
      add(msg.from);
      (msg.to || []).forEach(add);
    }));
    Object.values(this.bodyCache).forEach((msg) => {
      add(msg.from);
      (msg.to || []).forEach(add);
    });
    this.readDrafts().forEach((row) => {
      (row.chips?.to || []).forEach(add);
      (row.chips?.cc || []).forEach(add);
      add(row.from);
    });
    this.readScheduled().forEach((row) => {
      (row.to || []).forEach(add);
      add(row.from);
    });
    return Array.from(map.values()).sort((a, b) => (a.name || a.address).localeCompare(b.name || b.address));
  },

  renderChipRow(field) {
    const html = (this.recipientChips[field] || [])
      .map(
        (row, index) =>
          `<span class="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-100">
            <span class="truncate">${escapeHtml(row.name || row.address)}</span>
            <button type="button" data-chip-remove="${field}:${index}" class="text-amber-300/80 hover:text-white leading-none">×</button>
          </span>`
      )
      .join("");
    [`mail-chips-${field}`, `mail-chips-compose-${field}`].forEach((id) => {
      const root = document.getElementById(id);
      if (root) root.innerHTML = html;
    });
  },

  renderAllChips() {
    ["to", "cc", "bcc"].forEach((field) => this.renderChipRow(field));
  },

  addChip(field, token) {
    const contact = typeof token === "string" ? parseContactToken(token) : token;
    if (!contact) return false;
    const list = this.recipientChips[field] || [];
    if (list.some((row) => row.address === contact.address)) return true;
    this.recipientChips[field] = list.concat(contact);
    this.renderChipRow(field);
    this.hideSuggest();
    this.queueDraftSave();
    return true;
  },

  removeChip(field, index) {
    this.recipientChips[field] = (this.recipientChips[field] || []).filter((_, i) => i !== index);
    this.renderChipRow(field);
    this.queueDraftSave();
  },

  bindChipInputs() {
    const root = document.getElementById("view-ent-email");
    if (!root || root.dataset.chipsBound === "1") return;
    root.dataset.chipsBound = "1";
    root.addEventListener("keydown", (event) => {
      const input = event.target.closest?.("[data-chip-field]");
      if (!input) return;
      const field = input.getAttribute("data-chip-field");
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        this.moveSuggest(event.key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (this.pickSuggest(field) || this.addChip(field, input.value)) input.value = "";
        return;
      }
      if (event.key === " " || event.key === "," || event.key === ";" || event.key === "Tab") {
        if (parseContactToken(input.value) || this.currentSuggest()) {
          event.preventDefault();
          if (this.pickSuggest(field) || this.addChip(field, input.value)) input.value = "";
        }
        return;
      }
      if (event.key === "Backspace" && !input.value && (this.recipientChips[field] || []).length) {
        this.removeChip(field, this.recipientChips[field].length - 1);
      }
      if (event.key === "Escape") this.hideSuggest();
    });
    root.addEventListener("input", (event) => {
      const input = event.target.closest?.("[data-chip-field]");
      if (!input) return;
      this.showSuggest(input.getAttribute("data-chip-field"), input);
    });
    root.addEventListener("click", (event) => {
      const remove = event.target.closest?.("[data-chip-remove]");
      if (remove) {
        const [field, index] = remove.getAttribute("data-chip-remove").split(":");
        this.removeChip(field, Number(index));
        return;
      }
      const choice = event.target.closest?.("[data-suggest-index]");
      if (choice) {
        const field = this.suggestField;
        this.suggestIndex = Number(choice.getAttribute("data-suggest-index"));
        const input = document.querySelector(`[data-chip-field="${field}"]`);
        if (this.pickSuggest(field) && input) input.value = "";
      }
    });
    document.addEventListener("mousedown", (event) => {
      if (!event.target.closest?.("#mail-contact-suggest, [data-chip-field]")) this.hideSuggest();
    });
  },

  currentSuggest() {
    const rows = this.suggestRows || [];
    return rows[this.suggestIndex] || null;
  },

  showSuggest(field, input) {
    const menu = document.getElementById("mail-contact-suggest");
    if (!menu || !input) return;
    const query = String(input.value || "").trim().toLowerCase();
    const used = new Set((this.recipientChips[field] || []).map((row) => row.address));
    const rows = this.mailboxContacts()
      .filter((row) => !used.has(row.address))
      .filter((row) => !query || row.address.includes(query) || (row.name || "").toLowerCase().includes(query))
      .slice(0, 8);
    this.suggestField = field;
    this.suggestRows = rows;
    this.suggestIndex = 0;
    if (!rows.length || !query) {
      this.hideSuggest();
      return;
    }
    const rect = input.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.width = `${Math.max(rect.width, 260)}px`;
    menu.innerHTML = rows
      .map(
        (row, index) =>
          `<button type="button" data-suggest-index="${index}" class="w-full text-left px-3 py-2 text-[11px] font-mono ${index === 0 ? "bg-amber-500/15 text-amber-100" : "text-slate-200 hover:bg-neutral-800"}">
            <span class="block truncate">${escapeHtml(row.name || row.address)}</span>
            ${row.name ? `<span class="block truncate text-[10px] text-slate-500">${escapeHtml(row.address)}</span>` : ""}
          </button>`
      )
      .join("");
    menu.classList.remove("hidden");
  },

  moveSuggest(delta) {
    const rows = this.suggestRows || [];
    if (!rows.length) return;
    this.suggestIndex = (this.suggestIndex + delta + rows.length) % rows.length;
    const menu = document.getElementById("mail-contact-suggest");
    if (!menu) return;
    [...menu.querySelectorAll("[data-suggest-index]")].forEach((btn, index) => {
      btn.classList.toggle("bg-amber-500/15", index === this.suggestIndex);
      btn.classList.toggle("text-amber-100", index === this.suggestIndex);
    });
  },

  pickSuggest(field) {
    const row = this.currentSuggest();
    if (!row) return false;
    this.addChip(field, row);
    this.hideSuggest();
    return true;
  },

  hideSuggest() {
    const menu = document.getElementById("mail-contact-suggest");
    if (menu) {
      menu.classList.add("hidden");
      menu.innerHTML = "";
    }
    this.suggestRows = [];
  },

  readDrafts() {
    try {
      const rows = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  },

  writeDrafts(rows) {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(rows));
  },

  queueDraftSave() {
    clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => this.persistDraft(), 350);
  },

  persistDraft() {
    if (!this.draftMode || !this.activeDraftId) return;
    const msg = this.currentMessage();
    const payload = this.inlinePayload() || {};
    const row = {
      id: this.activeDraftId,
      mode: this.draftMode,
      replyToId: msg?.id && !String(msg.id).startsWith("draft-") ? msg.id : "",
      threadId: payload.threadId || msg?.threadId || "",
      subject: payload.subject || msg?.subject || "(No Subject)",
      snippet: String(payload.body || "").slice(0, 160),
      body: payload.body || "",
      chips: {
        to: (this.recipientChips.to || []).slice(),
        cc: (this.recipientChips.cc || []).slice(),
        bcc: (this.recipientChips.bcc || []).slice()
      },
      to: (this.recipientChips.to || []).slice(),
      from: { name: "Me", address: this.mailboxEmail() },
      receivedAt: new Date().toISOString(),
      unread: false,
      flagged: false
    };
    const rows = this.readDrafts().filter((item) => item.id !== row.id);
    rows.unshift(row);
    this.writeDrafts(rows);
    this.folderCache[DRAFTS_ID] = rows;
    const draftsFolder = this.folders.find((item) => item.type === "drafts");
    if (this.folderId === DRAFTS_ID || this.folderId === draftsFolder?.id) {
      this.mergeLocalDraftsIfNeeded(this.folderId);
      this.renderList();
    }
    this.renderFolders();
  },

  removeDraft(id) {
    const next = this.readDrafts().filter((row) => row.id !== id);
    this.writeDrafts(next);
    if (this.activeDraftId === id) this.activeDraftId = "";
    this.renderFolders();
    if (this.folderId === DRAFTS_ID || this.folders.find((row) => row.id === this.folderId)?.type === "drafts") {
      this.mergeLocalDraftsIfNeeded(this.folderId);
      this.renderList();
    }
  },

  paintLocalDrafts() {
    const rows = this.readDrafts();
    this.folderId = DRAFTS_ID;
    this.folderName = "Drafts";
    this.messages = rows;
    this.folderCache[DRAFTS_ID] = rows;
    this.loading = false;
    this.renderFolders();
    this.renderList();
    this.renderReader(this.activeMessage);
  },

  mergeLocalDraftsIfNeeded(folderId) {
    const folder = this.folders.find((row) => String(row.id) === String(folderId));
    if (folderId !== DRAFTS_ID && folder?.type !== "drafts") return;
    const local = this.readDrafts();
    const remote = (this.messages || []).filter((row) => !String(row.id).startsWith("draft-"));
    this.messages = local.concat(remote);
  },

  startInline(mode, opts) {
    const msg = this.currentMessage();
    if (!msg) return;
    this.draftMode = mode === "forward" ? "forward" : mode === "replyAll" ? "replyAll" : "reply";
    this.sendMenuOpen = false;
    const actions = document.getElementById("mail-inline-actions");
    const box = document.getElementById("mail-compose-inline");
    const label = document.getElementById("mail-inline-label");
    const toInput = document.getElementById("mail-inline-to");
    const ccInput = document.getElementById("mail-inline-cc");
    const bccInput = document.getElementById("mail-inline-bcc");
    const extras = document.getElementById("mail-inline-extras");
    const editor = document.getElementById("mail-quick-reply");
    const menu = document.getElementById("mail-send-menu");
    const scheduleRow = document.getElementById("mail-schedule-row");
    if (actions) actions.classList.add("hidden");
    if (box) box.classList.remove("hidden");
    if (menu) menu.classList.add("hidden");
    if (scheduleRow) {
      scheduleRow.classList.add("hidden");
      scheduleRow.classList.remove("flex");
    }
    const mine = this.mailboxEmail();
    const replyAllTo = [msg.from?.address, ...((msg.to || []).map((row) => row.address))]
      .map((part) => String(part || "").trim())
      .filter((part, i, all) => part && part.toLowerCase() !== mine && all.indexOf(part) === i)
      .join(", ");
    const defaultTo = this.draftMode === "forward" ? "" : this.draftMode === "replyAll" ? replyAllTo || msg.from?.address : msg.from?.address;
    if (this.draftMode === "forward") {
      if (label) label.innerHTML = `FORWARDING: <strong class="text-amber-400">${escapeHtml(msg.subject || "(no subject)")}</strong>`;
      if (editor && !opts?.restore) {
        const quoted = msg.body || msg.snippet || "";
        editor.innerText = quoted ? `\n\n---------- Forwarded message ----------\n${quoted}` : "";
      }
    } else {
      if (label) label.innerHTML = `REPLYING TO: <strong class="text-amber-400">${escapeHtml(defaultTo || "Recipient")}</strong>`;
      if (editor && !opts?.restore) editor.innerHTML = "";
    }
    if (!opts?.keepChips) {
      this.recipientChips = {
        to: this.tokensToChips(opts?.to || defaultTo || ""),
        cc: this.tokensToChips(opts?.cc || ""),
        bcc: this.tokensToChips(opts?.bcc || "")
      };
    }
    if (toInput) toInput.value = "";
    if (ccInput) ccInput.value = "";
    if (bccInput) bccInput.value = "";
    if (extras) extras.classList.toggle("hidden", !!(this.recipientChips.cc.length || this.recipientChips.bcc.length || opts?.cc || opts?.bcc));
    if (editor && opts?.restore) editor.innerText = opts.restore;
    this.bindChipInputs();
    this.renderAllChips();
    if (!this.activeDraftId || !opts?.keepChips) {
      this.activeDraftId = `draft-${msg.id || "new"}-${this.draftMode}`;
    }
    this.persistDraft();
    if (editor && editor.dataset.draftBound !== "1") {
      editor.dataset.draftBound = "1";
      editor.addEventListener("input", () => this.queueDraftSave());
    }
    this.renderAttachChips();
    toInput?.focus();
    box?.scrollIntoView({ block: "nearest" });
  },

  toggleInlineExtras() {
    const extras = document.getElementById("mail-inline-extras");
    if (!extras) return;
    extras.classList.toggle("hidden");
    if (!extras.classList.contains("hidden")) document.getElementById("mail-inline-cc")?.focus();
  },

  toggleSendMenu() {
    const menu = document.getElementById("mail-send-menu");
    if (!menu) return;
    this.sendMenuOpen = !this.sendMenuOpen;
    menu.classList.toggle("hidden", !this.sendMenuOpen);
  },

  showSchedule() {
    this.sendMenuOpen = false;
    const menu = document.getElementById("mail-send-menu");
    if (menu) menu.classList.add("hidden");
    const row = document.getElementById("mail-schedule-row");
    const input = document.getElementById("mail-schedule-at");
    if (row) {
      row.classList.remove("hidden");
      row.classList.add("flex");
    }
    if (input && !input.value) {
      const later = new Date(Date.now() + 60 * 60 * 1000);
      const pad = (n) => String(n).padStart(2, "0");
      input.value = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}T${pad(later.getHours())}:${pad(later.getMinutes())}`;
    }
    input?.focus();
  },

  inlinePayload() {
    const msg = this.currentMessage();
    if (!msg) return null;
    const mode = this.draftMode || "reply";
    const body = this.withAttachments(editorText(document.getElementById("mail-quick-reply")));
    const to = this.chipString("to");
    const cc = this.chipString("cc");
    const bcc = this.chipString("bcc");
    const subject =
      mode === "forward"
        ? msg.subject
          ? `Fwd: ${msg.subject.replace(/^Fwd:\s*/i, "")}`
          : "(No Subject)"
        : msg.subject
          ? `Re: ${msg.subject.replace(/^Re:\s*/i, "")}`
          : "(No Subject)";
    return {
      to,
      cc,
      bcc,
      subject,
      body,
      threadId: mode === "forward" ? "" : msg.threadId || msg.id || ""
    };
  },

  async sendInline() {
    this.sendMenuOpen = false;
    const menu = document.getElementById("mail-send-menu");
    if (menu) menu.classList.add("hidden");
    const payload = this.inlinePayload();
    if (!payload?.to?.trim()) {
      const status = document.getElementById("mail-quick-status");
      if (status) {
        status.classList.remove("hidden", "text-brand-mint");
        status.classList.add("text-brand-alert");
        status.textContent = "Add a recipient before sending.";
      }
      return;
    }
    await this.send({
      ...payload,
      statusEl: document.getElementById("mail-quick-status"),
      btn: document.getElementById("mail-quick-send"),
      sendLabel: "Send",
      closeCompose: false
    });
    const status = document.getElementById("mail-quick-status");
    if (status && status.classList.contains("text-brand-mint")) {
      if (this.activeDraftId) this.removeDraft(this.activeDraftId);
      this.discardQuickReply();
    }
  },

  confirmSchedule() {
    const when = document.getElementById("mail-schedule-at")?.value;
    const payload = this.inlinePayload();
    if (!payload?.to?.trim() || !when) return;
    const sendAt = new Date(when).getTime();
    if (Number.isNaN(sendAt)) return;
    if (sendAt <= Date.now()) {
      void this.sendInline();
      return;
    }
    this.saveScheduled({
      id: `sched-${Date.now()}`,
      ...payload,
      sendAt,
      receivedAt: new Date(sendAt).toISOString(),
      subject: payload.subject,
      snippet: String(payload.body || "").slice(0, 160),
      body: payload.body,
      from: { name: "Me", address: this.mailboxEmail() },
      to: payload.to.split(",").map((part) => ({ name: "", address: part.trim() })).filter((row) => row.address),
      unread: false,
      flagged: false
    });
    this.discardQuickReply();
    const status = document.getElementById("mail-quick-status");
    if (status) {
      status.classList.remove("hidden", "text-brand-alert");
      status.classList.add("text-brand-mint");
      status.textContent = "Scheduled.";
    }
    this.renderFolders();
  },

  readScheduled() {
    try {
      const rows = JSON.parse(localStorage.getItem(SCHEDULED_KEY) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  },

  writeScheduled(rows) {
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify(rows));
  },

  saveScheduled(row) {
    const rows = this.readScheduled().filter((item) => item.id !== row.id);
    rows.unshift(row);
    this.writeScheduled(rows);
    this.folderCache[SCHEDULED_ID] = rows;
    if (this.folderId === SCHEDULED_ID) {
      this.messages = rows;
      this.renderList();
    }
  },

  paintScheduled() {
    const rows = this.readScheduled();
    this.folderId = SCHEDULED_ID;
    this.folderName = "Scheduled";
    this.messages = rows;
    this.folderCache[SCHEDULED_ID] = rows;
    this.loading = false;
    this.renderFolders();
    this.renderList();
    this.renderReader(this.activeMessage);
  },

  async flushScheduled() {
    const due = this.readScheduled().filter((row) => Number(row.sendAt) && Number(row.sendAt) <= Date.now());
    if (!due.length) return;
    const remaining = this.readScheduled().filter((row) => !due.some((item) => item.id === row.id));
    this.writeScheduled(remaining);
    for (const row of due) {
      await this.send({
        to: row.to?.map?.((part) => part.address).filter(Boolean).join(", ") || row.to,
        subject: row.subject,
        body: row.body,
        cc: row.cc || "",
        bcc: row.bcc || "",
        threadId: row.threadId || "",
        closeCompose: false
      });
    }
    if (this.folderId === SCHEDULED_ID) this.paintScheduled();
    this.renderFolders();
  },

  focusQuickReply() {
    this.startInline("reply");
  },

  discardQuickReply() {
    if (this.activeDraftId) this.removeDraft(this.activeDraftId);
    this.draftMode = null;
    this.sendMenuOpen = false;
    this.recipientChips = { to: [], cc: [], bcc: [] };
    this.hideSuggest();
    const box = document.getElementById("mail-quick-reply");
    if (box) {
      if (box.tagName === "TEXTAREA") box.value = "";
      else box.innerHTML = "";
    }
    const compose = document.getElementById("mail-compose-inline");
    const actions = document.getElementById("mail-inline-actions");
    const menu = document.getElementById("mail-send-menu");
    const scheduleRow = document.getElementById("mail-schedule-row");
    ["mail-inline-to", "mail-inline-cc", "mail-inline-bcc"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const extras = document.getElementById("mail-inline-extras");
    if (extras) extras.classList.add("hidden");
    if (compose) compose.classList.add("hidden");
    if (actions) actions.classList.remove("hidden");
    if (menu) menu.classList.add("hidden");
    if (scheduleRow) {
      scheduleRow.classList.add("hidden");
      scheduleRow.classList.remove("flex");
    }
    this.replyFiles = [];
    this.renderAttachChips();
    const status = document.getElementById("mail-quick-status");
    if (status) {
      status.classList.add("hidden");
      status.textContent = "";
    }
  },

  mailboxEmail() {
    try {
      return String(JSON.parse(localStorage.getItem("dimad_aurinko") || "{}").email || "").toLowerCase();
    } catch {
      return "";
    }
  },

  reply() {
    this.startInline("reply");
  },

  replyAll() {
    this.startInline("replyAll");
  },

  forward() {
    this.startInline("forward");
  },

  patchMessage(id, patch) {
    const apply = (list) => (list || []).map((row) => (row.id === id ? { ...row, ...patch } : row));
    this.messages = apply(this.messages);
    Object.keys(this.folderCache).forEach((key) => {
      this.folderCache[key] = apply(this.folderCache[key]);
    });
    if (this.bodyCache[id]) this.bodyCache[id] = { ...this.bodyCache[id], ...patch };
    if (this.activeMessage?.id === id) this.activeMessage = { ...this.activeMessage, ...patch };
  },

  removeMessage(id) {
    this.messages = this.messages.filter((row) => row.id !== id);
    Object.keys(this.folderCache).forEach((key) => {
      this.folderCache[key] = (this.folderCache[key] || []).filter((row) => row.id !== id);
    });
    delete this.bodyCache[id];
    if (this.activeId === id) {
      this.activeId = "";
      this.activeMessage = null;
      this.renderReader(null);
      this.applyLayout();
    }
  },

  async mutate(action, patch, id) {
    const messageId = id || this.currentMessage()?.id;
    if (!messageId) return { ok: false };
    const snapshot = this.bodyCache[messageId] || this.messages.find((row) => row.id === messageId) || this.currentMessage();
    this.pending[messageId] = { ...(this.pending[messageId] || {}), ...patch };
    if (patch.deleted) this.removeMessage(messageId);
    else this.patchMessage(messageId, patch);
    this.renderList();
    if (this.activeId === messageId && !patch.deleted) this.renderReader(this.currentMessage());
    try {
      const token = await idToken();
      const res = await fetch(`${apiBase()}/api/email/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: messageId, action })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `Update failed (${res.status}).`);
      delete this.pending[messageId];
      return { ok: true };
    } catch (err) {
      console.error("Email mutate failed", action, err);
      delete this.pending[messageId];
      if (patch.deleted && snapshot) {
        this.messages = [snapshot, ...this.messages];
        this.writeCache(this.folderId, this.messages);
        this.activeId = snapshot.id;
        this.renderReader(snapshot);
      } else if (snapshot) {
        this.patchMessage(messageId, snapshot);
        if (this.activeId === messageId) this.renderReader(this.currentMessage());
      }
      this.renderList();
      return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
    }
  },

  toggleStar(id) {
    const msg = this.messages.find((row) => row.id === id) || this.bodyCache[id] || this.currentMessage();
    if (!msg) return;
    const flagged = !msg.flagged;
    void this.mutate(flagged ? "star" : "unstar", { flagged }, msg.id);
  },

  star() {
    const msg = this.currentMessage();
    if (!msg) return;
    this.toggleStar(msg.id);
  },

  toggleRead() {
    const msg = this.currentMessage();
    if (!msg) return;
    const unread = !msg.unread;
    void this.mutate(unread ? "unread" : "read", { unread }, msg.id);
  },

  trash() {
    const msg = this.currentMessage();
    if (!msg) return;
    if (this.folderId === SCHEDULED_ID || String(msg.id).startsWith("sched-")) {
      this.writeScheduled(this.readScheduled().filter((row) => row.id !== msg.id));
      this.removeMessage(msg.id);
      this.renderFolders();
      return;
    }
    if (this.folderId === DRAFTS_ID || String(msg.id).startsWith("draft-")) {
      this.removeDraft(msg.id);
      this.removeMessage(msg.id);
      this.renderReader(null);
      return;
    }
    void this.mutate("trash", { deleted: true }, msg.id);
  },

  async sendQuickReply() {
    return this.sendInline();
  },

  async send(override) {
    const to = override?.to ?? (this.chipString("to") || document.getElementById("mail-to")?.value || "");
    const subject = (override?.subject ?? (document.getElementById("mail-subject")?.value || "")).trim() || "(No Subject)";
    const body = override?.body ?? (document.getElementById("mail-body")?.value || "");
    const cc = override?.cc ?? (this.chipString("cc") || document.getElementById("mail-cc")?.value || "");
    const bcc = override?.bcc ?? (this.chipString("bcc") || document.getElementById("mail-bcc")?.value || "");
    const threadId = override?.threadId ?? this.composeThreadId ?? (this.currentMessage()?.threadId || this.currentMessage()?.id || "");
    const status = override?.statusEl || document.getElementById("mail-send-status");
    const btn = override?.btn || document.getElementById("mail-send-btn");
    const sendLabel = override?.sendLabel || "Send Message";
    const closeCompose = override?.closeCompose !== false;
    const setStatus = (text, ok) => {
      if (!status) return;
      status.classList.remove("hidden", "text-brand-alert", "text-brand-mint");
      status.classList.add(ok ? "text-brand-mint" : "text-brand-alert");
      status.textContent = text;
    };
    if (!to.trim()) {
      setStatus("Add a recipient before sending.", false);
      return;
    }
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      threadId: threadId || `optimistic-${Date.now()}`,
      subject,
      snippet: String(body || "").slice(0, 160),
      body,
      from: { name: "Me", address: this.mailboxEmail() },
      to: to.split(",").map((part) => ({ name: "", address: part.trim() })).filter((row) => row.address),
      receivedAt: new Date().toISOString(),
      unread: false,
      flagged: false
    };
    const sentFolder = this.folders.find((row) => row.type === "sent");
    if (sentFolder) {
      const key = this.cacheKey(sentFolder.id);
      this.folderCache[key] = [optimistic, ...(this.folderCache[key] || [])];
      if (this.folderId === sentFolder.id) {
        this.messages = this.folderCache[key];
        this.renderList();
      }
    }
    if (closeCompose) this.closeCompose();
    else setStatus("Sending...", true);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending...";
    }
    try {
      const token = await idToken();
      const res = await fetch(`${apiBase()}/api/email/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ to, subject, body, cc, bcc, threadId })
      });
      const data = await res.json().catch(() => ({}));
      console.log("Email send", res.status, data);
      if (!res.ok || data.ok === false) {
        console.error("Email send failed", data);
        if (sentFolder) {
          const key = this.cacheKey(sentFolder.id);
          this.folderCache[key] = (this.folderCache[key] || []).filter((row) => row.id !== optimistic.id);
          if (this.folderId === sentFolder.id) {
            this.messages = this.folderCache[key];
            this.renderList();
          }
        }
        if (closeCompose) {
          this.compose({ to, subject, body, cc, bcc, threadId, title: "NEW MESSAGE" });
        }
        setStatus(data.error || `Send failed (${res.status}).`, false);
        return;
      }
      setStatus("Sent.", true);
      if (sentFolder) void this.refresh({ keepExisting: true, silent: true, folderId: sentFolder.id });
    } catch (err) {
      console.error("Email send failed", err);
      if (closeCompose) this.compose({ to, subject, body, cc, bcc, threadId, title: "NEW MESSAGE" });
      setStatus(err instanceof Error ? err.message : "Send failed.", false);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = sendLabel;
      }
    }
  }
};
