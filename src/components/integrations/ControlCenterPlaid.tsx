"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import { authFetch, waitForFirebaseToken } from "@/lib/auth/client";
import { INTEGRATION_CARD_CSS } from "@/components/integrations/integration-card.css";
import { isLocalHost, plaidAppOrigin, writePlaidLinkToken } from "@/lib/integrations/plaid/client";
import { cacheWorkspaceResponse } from "@/hooks/useWorkspaceHydration";
import type { PlaidAccountClass, PlaidPayload } from "@/lib/integrations/plaid/types";

type PlaidData = PlaidPayload & { ok?: boolean; connected?: boolean; error?: string };

const CLASS_LABELS: Record<PlaidAccountClass, string> = {
  operating: "Business Operating",
  tax: "Tax Reserve",
  personal: "Personal / Excluded"
};

const REASONS: Record<string, string> = {
  missing_plaid_client_id: "Plaid is not configured on this server.",
  missing_plaid_secret: "Plaid secret is not configured on this server.",
  plaid_link_token_failed: "Could not start Plaid Link.",
  plaid_exchange_failed: "Could not finish linking the bank account.",
  invalid_plaid_credentials: "Plaid rejected the saved bank connection. Reconnect.",
  plaid_request_failed: "Could not reach Plaid.",
  firestore_write_failed: "Bank linked, but saving the connection failed.",
  firestore_permission_denied: "Saving the bank connection was denied. Deploy the integrations rule.",
  login_required: "Sign in, then connect a bank account."
};

function explain(code: string | undefined, fallback = "Could not load Plaid.") {
  if (!code) return fallback;
  if (REASONS[code]) return REASONS[code];
  if (code.includes(" ") && code.length < 180) return code;
  return fallback;
}

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

function moneyExpense(amount: number) {
  const abs = Math.abs(amount);
  const sign = amount > 0 ? "-" : "+";
  return `${sign}$${abs.toFixed(2)}`;
}

export default function ControlCenterPlaid() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [bankData, setBankData] = useState<PlaidData | null>(null);
  const [error, setError] = useState("");
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [draftClasses, setDraftClasses] = useState<Record<string, PlaidAccountClass>>({});
  const [savingClasses, setSavingClasses] = useState(false);

  const prefetchLinkToken = useCallback(async () => {
    try {
      const { res, data, token } = await authFetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!token || res.status === 401) {
        setSignedOut(true);
        return "";
      }
      setSignedOut(false);
      const next = String(data.link_token || "");
      if (!res.ok || !next) {
        setError(explain(String(data.error || ""), "Could not prepare Plaid Link."));
        return "";
      }
      setLinkToken(next);
      writePlaidLinkToken(next);
      return next;
    } catch {
      setError("Could not prepare Plaid Link.");
      return "";
    }
  }, []);

  const applyPayload = useCallback((data: Record<string, unknown>, fromCache = false) => {
    setSignedOut(false);
    if (!data.connected) {
      setBankData(null);
      postToDashboard({ type: "dimad-plaid-status", connected: false });
      if (data.error && !fromCache) setError(explain(String(data.error)));
      return;
    }
    if (data.error && !fromCache) setError(explain(String(data.error)));
    const payload = data as PlaidData;
    setBankData(payload);
    postToDashboard({
      type: "dimad-plaid-status",
      connected: true,
      institutionName: payload.institutionName,
      netLiquidity: payload.metrics?.netLiquidity || 0
    });
  }, []);

  const loadData = useCallback(
    async (force = false) => {
      setError("");
      if (!force) {
        const cached = takeWorkspaceHydration("plaid");
        if (cached) {
          applyPayload(cached, true);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      try {
        let last: { res: Response; data: Record<string, unknown>; token: string } | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          last = await authFetch("/api/plaid/data");
          if (last.token && last.res.status !== 401) break;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 900));
        }
        const { res, data, token } = last || { res: new Response(null, { status: 401 }), data: {}, token: "" };
        if (!token || res.status === 401) {
          setSignedOut(true);
          setBankData(null);
          postToDashboard({ type: "dimad-plaid-status", connected: false });
          setError("Sign in to DIMAD, then connect a bank account.");
          return;
        }
        cacheWorkspaceResponse("plaid", data as Record<string, unknown>, res.ok, res.status);
        applyPayload(data as Record<string, unknown>);
      } catch {
        setError("Failed to fetch bank data.");
      } finally {
        setLoading(false);
      }
    },
    [applyPayload]
  );

  async function startConnect() {
    setConnecting(true);
    setError("");
    let token = linkToken;
    if (!token) token = await prefetchLinkToken();
    if (!token) {
      if (signedOut) (window.top || window).location.assign("/login.html");
      setConnecting(false);
      return;
    }
    const idToken = await waitForFirebaseToken(8000);
    if (!idToken) {
      setError("Sign in to DIMAD, then connect a bank account.");
      setConnecting(false);
      return;
    }
    const origin = isLocalHost(window.location.hostname) ? plaidAppOrigin() : window.location.origin;
    const connectUrl =
      `${origin}/integrations/plaid-connect` +
      `?link_token=${encodeURIComponent(token)}&id_token=${encodeURIComponent(idToken)}`;
    const topWin = window.top || window;
    const popup = topWin.open(connectUrl, "dimad_plaid_link", "popup=yes,width=520,height=780");
    if (!popup) {
      topWin.location.assign(connectUrl);
      return;
    }
    setConnecting(false);
  }

  function openClassify() {
    if (!bankData?.accounts?.length) return;
    const next: Record<string, PlaidAccountClass> = {};
    for (const account of bankData.accounts) {
      next[account.accountId] = account.accountClass || "operating";
    }
    setDraftClasses(next);
    setClassifyOpen(true);
  }

  async function saveClasses() {
    setSavingClasses(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/plaid/data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountClasses: draftClasses })
      });
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not save account classifications."));
        setSavingClasses(false);
        return;
      }
      applyPayload(data as Record<string, unknown>);
      setClassifyOpen(false);
    } catch {
      setError("Could not save account classifications.");
    } finally {
      setSavingClasses(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect this bank account from Dimad?")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/plaid/data", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not disconnect Plaid."));
        setLoading(false);
        return;
      }
      setBankData(null);
      postToDashboard({ type: "dimad-plaid-status", connected: false });
      void prefetchLinkToken();
    } catch {
      setError("Could not disconnect Plaid.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    void prefetchLinkToken();
  }, [loadData, prefetchLinkToken]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-plaid-connect") void startConnect();
      if (event.data?.type === "dimad-plaid-refresh") void loadData(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [loadData]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-plaid-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, bankData, error, connecting, signedOut, linkToken, classifyOpen]);

  const connected = Boolean(bankData?.itemId || bankData?.institutionName);

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>
      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div className="dimad-int-brand plaid" aria-hidden>
            $
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">Plaid</p>
            <h2>{connected ? bankData!.institutionName : "Bank accounts"}</h2>
            {connected ? (
              <p className="dimad-int-meta">Finance &amp; expenses (excluded from revenue)</p>
            ) : (
              <p className="dimad-int-meta">Secure bank linking for cash and spend tracking</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <AccountBadge
              tone="shopify"
              label={bankData!.institutionName || "Bank"}
              hint="Viewing"
              monogram="P"
              onLogout={() => void disconnect()}
              logoutLabel="Disconnect bank"
            />
            <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadData(true)}>
              Refresh
            </button>
          </div>
        ) : null}
      </div>

      {loading && !connected ? <IntegrationLoadingBar tone="stripe" label="Loading bank data..." /> : null}

      {!loading && !connected ? (
        <>
          <p className="dimad-int-note">
            {signedOut
              ? "Sign in to DIMAD, then connect a bank account."
              : "Connect checking, savings, and credit accounts via Plaid to track liquidity and expenses."}
          </p>
          <button
            type="button"
            className="dimad-int-primary plaid"
            disabled={connecting || signedOut}
            onClick={() => void startConnect()}
          >
            {connecting ? "Opening secure Link…" : "Connect Bank Account"}
          </button>
        </>
      ) : null}

      {connected && bankData ? (
        <>
          <p className="dimad-int-note" style={{ marginTop: 0 }}>
            Finance &amp; Expenses — excluded from Gross Revenue / MRR snapshots.
          </p>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Operating cash</div>
              <div className="v">{bankData.metrics.operatingCashDisplay || bankData.metrics.cashAvailableDisplay}</div>
              <div className="s">Business accounts</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Tax reserve</div>
              <div className="v">{bankData.metrics.taxReserveDisplay || "$0.00"}</div>
              <div className="s">Designated reserve</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Burn estimate</div>
              <div className="v">{bankData.metrics.burnRateDisplay || "—"}</div>
              <div className="s">Outflows pace</div>
            </div>
          </div>

          <div className="dimad-int-col" style={{ marginTop: 12 }}>
            <h3>Recent expenses</h3>
            {bankData.recentTransactions.length ? (
              bankData.recentTransactions.slice(0, 6).map((tx) => (
                <div className="dimad-int-row" key={tx.transactionId}>
                  <span className="title">
                    {tx.merchantName}
                    <span className="meta" style={{ display: "block" }}>
                      {tx.date} · {tx.category}
                    </span>
                  </span>
                  <b>{moneyExpense(tx.amount)}</b>
                </div>
              ))
            ) : (
              <p className="dimad-int-empty">No recent transactions synced yet.</p>
            )}
          </div>

          <div className="dimad-int-foot">
            <button type="button" className="dimad-int-ghost" onClick={openClassify}>
              Classify accounts
            </button>
            <button type="button" className="dimad-int-link" onClick={() => void disconnect()}>
              Disconnect
            </button>
          </div>
        </>
      ) : null}

      {classifyOpen && bankData ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(7,10,15,0.72)",
            display: "grid",
            placeItems: "center",
            padding: 16
          }}
          onClick={() => setClassifyOpen(false)}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              background: "#0B0F17",
              border: "1px solid #1E293B",
              borderRadius: 16,
              padding: 16
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="dimad-int-kicker">Account classification</p>
            <h3 style={{ margin: "4px 0 12px", fontSize: 14 }}>Designate bank accounts</h3>
            <p className="dimad-int-note">
              Personal accounts are excluded from operating liquidity. Tax reserve is tracked separately from burn.
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {bankData.accounts.map((account) => (
                <label key={account.accountId} style={{ display: "grid", gap: 4, fontSize: 11 }}>
                  <span style={{ color: "#94a3b8" }}>
                    {account.name}
                    {account.mask ? ` ···${account.mask}` : ""}
                  </span>
                  <select
                    value={draftClasses[account.accountId] || "operating"}
                    onChange={(event) =>
                      setDraftClasses((prev) => ({
                        ...prev,
                        [account.accountId]: event.target.value as PlaidAccountClass
                      }))
                    }
                    style={{
                      background: "#070A0F",
                      color: "#e2e8f0",
                      border: "1px solid #1E293B",
                      borderRadius: 8,
                      padding: "8px 10px"
                    }}
                  >
                    {Object.entries(CLASS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" className="dimad-int-ghost" onClick={() => setClassifyOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="dimad-int-primary plaid"
                disabled={savingClasses}
                onClick={() => void saveClasses()}
              >
                {savingClasses ? "Saving…" : "Save classifications"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
