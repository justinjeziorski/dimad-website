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

window.DIMAD_MAIL = {
  connected: false,
  messages: [],
  activeId: "",

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

  renderList() {
    const root = document.getElementById("mail-list");
    if (!root) return;
    this.bindList();
    if (!this.messages.length) {
      root.innerHTML = '<div class="p-4 text-[11px] text-slate-500">Inbox is empty.</div>';
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
    this.bindList();
    const list = document.getElementById("mail-list");
    if (list) list.innerHTML = '<div class="p-4 text-[11px] text-slate-500">Loading inbox…</div>';
    this.connected = true;
    this.paintShell();
    await this.refresh();
  },

  async refresh() {
    const list = document.getElementById("mail-list");
    if (list) list.innerHTML = '<div class="p-4 text-[11px] text-slate-500">Loading inbox…</div>';
    try {
      await waitForAuth();
      const token = await idToken();
      const res = await fetch(`${apiBase()}/api/email/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      console.log("Email inbox payload", res.status, data);
      const errEl = document.getElementById("mail-error");
      if (!res.ok || data.ok === false) {
        this.connected = false;
        this.paintShell();
        if (errEl) {
          errEl.classList.remove("hidden");
          errEl.textContent = `Inbox failed: ${data.error || res.status}. Open DevTools → Network for /api/email/messages.`;
        }
        return data;
      }
      if (errEl) {
        errEl.classList.add("hidden");
        errEl.textContent = "";
      }
      this.connected = true;
      this.messages = data.messages || [];
      this.paintShell();
      this.renderList();
      if (!this.activeId) this.renderReader(null);
      return data;
    } catch (err) {
      console.error("Email refresh failed", err);
      this.connected = false;
      this.paintShell();
      return { ok: false };
    }
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
      window.alert("Could not send this email. Check the connected mailbox and try again.");
      return;
    }
    this.closeCompose();
    await this.refresh();
  }
};
