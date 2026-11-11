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
        () => `<div class="rounded-lg border border-brand-border bg-brand-black/40 p-2.5 space-y-1.5">
      <div class="h-2.5 w-2/5 rounded bg-slate-700"></div>
      <div class="h-2.5 w-4/5 rounded bg-slate-800"></div>
      <div class="h-2 w-3/5 rounded bg-slate-800"></div>
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
    case "important":
      return "fa-circle-exclamation";
    default:
      return "fa-folder";
  }
}

window.DIMAD_MAIL = {
  connected: false,
  messages: [],
  folders: [],
  folderId: "",
  folderName: "Inbox",
  activeId: "",
  loading: false,
  fetchId: 0,
  inflight: null,
  inflightFolder: "",

  async connect(serviceType) {
    if (typeof window.DIMAD_AURINKO?.connect === "function") {
      return window.DIMAD_AURINKO.connect(serviceType);
    }
    const token = await idToken().catch(() => "");
    const path = `/api/auth/aurinko?serviceType=${encodeURIComponent(serviceType || "Google")}${token ? `&id_token=${encodeURIComponent(token)}` : ""}`;
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
  },

  bindList() {
    const root = document.getElementById("mail-list");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    root.addEventListener("click", (event) => {
      const btn = event.target.closest?.("[data-mail-id]");
      if (!btn) return;
      void window.DIMAD_MAIL.open(btn.getAttribute("data-mail-id"));
    });
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

  renderFolders() {
    const root = document.getElementById("mail-folders");
    const title = document.getElementById("mail-folder-title");
    if (title) title.textContent = this.folderName || "Inbox";
    if (!root) return;
    this.bindFolders();
    if (!this.folders.length) {
      root.innerHTML = '<div class="px-3 py-3 text-[11px] text-slate-500">Loading folders…</div>';
      return;
    }
    const system = this.folders.filter((row) => row.type !== "custom");
    const custom = this.folders.filter((row) => row.type === "custom");
    const item = (folder) => {
      const active = String(folder.id) === String(this.folderId);
      const unread = folder.unread ? `<span class="ml-auto text-[9px] font-mono text-brand-gold">${folder.unread}</span>` : "";
      const tone = active ? "bg-amber-500/15 text-white border-l-2 border-amber-400" : "text-slate-300 border-l-2 border-transparent hover:bg-brand-black/50";
      return `<button type="button" data-folder-id="${escapeHtml(folder.id)}" data-folder-name="${escapeHtml(folder.name)}" class="flex items-center gap-2 w-full text-left px-3 py-2 text-[11px] font-semibold ${tone} whitespace-nowrap">
        <i class="fa-solid ${folderIcon(folder.type)} w-3.5 text-center text-slate-400"></i>
        <span class="truncate">${escapeHtml(folder.name)}</span>
        ${unread}
      </button>`;
    };
    const labelsHead = custom.length
      ? '<div class="px-3 pt-3 pb-1 text-[9px] font-mono uppercase tracking-wide text-slate-600">Labels</div>'
      : "";
    root.innerHTML = `${system.map(item).join("")}${labelsHead}${custom.map(item).join("")}`;
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
      if (!this.folderId) {
        const inbox = this.folders.find((row) => row.type === "inbox") || this.folders[0];
        if (inbox) {
          this.folderId = inbox.id;
          this.folderName = inbox.name || "Inbox";
        }
      }
      this.renderFolders();
      return data;
    } catch (err) {
      console.error("Email folders failed", err);
      return { ok: false };
    }
  },

  async selectFolder(id, name) {
    if (!id) return;
    this.folderId = id;
    this.folderName = name || this.folders.find((row) => String(row.id) === String(id))?.name || "Folder";
    this.activeId = "";
    this.messages = [];
    this.renderFolders();
    this.renderReader(null);
    await this.refresh();
  },

  showSkeleton() {
    const root = document.getElementById("mail-list");
    if (!root) return;
    this.bindList();
    if (this.messages.length) return;
    root.innerHTML = skeletonHtml();
  },

  renderList() {
    const root = document.getElementById("mail-list");
    if (!root) return;
    this.bindList();
    if (this.loading && !this.messages.length) {
      root.innerHTML = skeletonHtml();
      return;
    }
    if (!this.messages.length) {
      root.innerHTML = `<div class="p-4 text-[11px] text-slate-500">${escapeHtml(this.folderName || "This folder")} is empty.</div>`;
      return;
    }
    root.innerHTML = this.messages
      .map((msg) => {
        const active = msg.id === this.activeId ? "border-l-2 border-amber-400 bg-amber-500/10" : "border-l-2 border-transparent";
        return `<button type="button" data-mail-id="${escapeHtml(msg.id)}" class="w-full text-left px-3 py-2.5 border-b border-brand-border hover:bg-brand-black/40 ${active}">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-semibold text-slate-100 truncate">${escapeHtml(msg.from?.name || msg.from?.address || "Unknown")}</span>
            <span class="text-[9px] font-mono text-slate-500 flex-shrink-0">${escapeHtml((msg.receivedAt || "").slice(0, 10))}</span>
          </div>
          <div class="text-[11px] text-slate-200 truncate">${escapeHtml(msg.subject)}</div>
          <div class="text-[10px] text-slate-500 truncate">${escapeHtml(msg.snippet)}</div>
        </button>`;
      })
      .join("");
  },

  renderReader(message) {
    const root = document.getElementById("mail-reader");
    if (!root) return;
    if (!message) {
      root.innerHTML = '<div class="text-[11px] text-slate-500">Select a message or compose a new email.</div>';
      return;
    }
    root.innerHTML = `
      <div class="space-y-3">
        <div>
          <div class="text-sm font-bold text-white">${escapeHtml(message.subject)}</div>
          <div class="text-[11px] text-slate-400 mt-1">${escapeHtml(message.from?.name || "")} &lt;${escapeHtml(message.from?.address || "")}&gt;</div>
          <div class="text-[10px] font-mono text-slate-500">${escapeHtml(message.receivedAt)}</div>
        </div>
        <div class="whitespace-pre-wrap text-[12px] text-slate-200 leading-relaxed border-t border-brand-border pt-3">${escapeHtml(message.body || message.snippet)}</div>
        <button type="button" onclick="DIMAD_MAIL.reply()" class="px-2.5 py-1.5 rounded-lg border border-brand-border text-[10px] font-bold text-slate-200 hover:text-brand-gold">Reply</button>
      </div>`;
  },

  async mount() {
    this.connected = true;
    this.paintShell();
    this.bindList();
    this.bindFolders();
    this.showSkeleton();
    this.renderFolders();
    await waitForAuth().catch(() => null);
    const folders = this.loadFolders();
    if (this.messages.length) {
      this.renderList();
      await folders;
      return this.messages;
    }
    await folders;
    return this.refresh({ keepExisting: true });
  },

  async refresh(opts) {
    const keepExisting = !!(opts && opts.keepExisting);
    const folderId = (opts && opts.folderId) || this.folderId;
    if (this.inflight && this.inflightFolder === folderId) return this.inflight;
    const requestId = ++this.fetchId;
    this.loading = true;
    this.inflightFolder = folderId;
    this.showSkeleton();
    this.inflight = (async () => {
      try {
        await waitForAuth();
        const token = await idToken();
        const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
        const res = await fetch(`${apiBase()}/api/email/messages${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (requestId !== this.fetchId) return data;
        console.log("Email folder payload", folderId || "inbox", res.status, data);
        const errEl = document.getElementById("mail-error");
        if (!res.ok || data.ok === false) {
          if (!this.folders.length && !this.messages.length) {
            this.connected = false;
            this.paintShell();
          }
          if (errEl) {
            errEl.classList.remove("hidden");
            errEl.textContent = `Folder failed: ${data.error || res.status}.`;
          }
          this.renderList();
          return data;
        }
        if (errEl) {
          errEl.classList.add("hidden");
          errEl.textContent = "";
        }
        const incoming = Array.isArray(data.messages) ? data.messages.filter((row) => row && row.id) : [];
        if (incoming.length || !keepExisting || !this.messages.length) {
          this.messages = incoming;
        } else {
          console.warn("Kept existing inbox; later fetch returned 0 messages");
        }
        this.connected = true;
        this.paintShell();
        this.renderList();
        if (!this.activeId) this.renderReader(null);
        return data;
      } catch (err) {
        console.error("Email refresh failed", err);
        if (!this.messages.length) {
          this.connected = false;
          this.paintShell();
        }
        return { ok: false };
      } finally {
        if (requestId === this.fetchId) {
          this.loading = false;
          this.inflight = null;
          if (this.messages.length) this.renderList();
        }
      }
    })();
    return this.inflight;
  },

  async open(id) {
    this.activeId = id;
    this.renderList();
    const token = await idToken();
    const res = await fetch(`${apiBase()}/api/email/messages?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    this.renderReader(data.message || this.messages.find((row) => row.id === id));
  },

  compose(defaults) {
    const modal = document.getElementById("mail-compose");
    if (!modal) return;
    document.getElementById("mail-to").value = defaults?.to || "";
    document.getElementById("mail-subject").value = defaults?.subject || "";
    document.getElementById("mail-body").value = defaults?.body || "";
    const status = document.getElementById("mail-send-status");
    if (status) {
      status.classList.add("hidden");
      status.textContent = "";
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  },

  closeCompose() {
    const modal = document.getElementById("mail-compose");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  },

  reply() {
    const msg = this.messages.find((row) => row.id === this.activeId);
    this.compose({
      to: msg?.from?.address || "",
      subject: msg?.subject ? `Re: ${msg.subject.replace(/^Re:\s*/i, "")}` : "",
      body: ""
    });
  },

  async send() {
    const to = document.getElementById("mail-to")?.value || "";
    const subject = document.getElementById("mail-subject")?.value || "";
    const body = document.getElementById("mail-body")?.value || "";
    const status = document.getElementById("mail-send-status");
    const btn = document.getElementById("mail-send-btn");
    const setStatus = (text, ok) => {
      if (!status) return;
      status.classList.remove("hidden", "text-brand-alert", "text-brand-mint");
      status.classList.add(ok ? "text-brand-mint" : "text-brand-alert");
      status.textContent = text;
    };
    if (!to.trim() || !subject.trim()) {
      setStatus("Add a recipient and subject before sending.", false);
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending…";
    }
    try {
      const token = await idToken();
      const res = await fetch(`${apiBase()}/api/email/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ to, subject, body })
      });
      const data = await res.json().catch(() => ({}));
      console.log("Email send", res.status, data);
      if (!res.ok || data.ok === false) {
        console.error("Email send failed", data);
        setStatus(data.error || `Send failed (${res.status}).`, false);
        return;
      }
      setStatus("Sent.", true);
      setTimeout(() => this.closeCompose(), 600);
      await this.refresh();
    } catch (err) {
      console.error("Email send failed", err);
      setStatus(err instanceof Error ? err.message : "Send failed.", false);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Send";
      }
    }
  }
};
