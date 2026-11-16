"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import { authFetch } from "@/lib/dimad-auth-client";
import { INTEGRATION_CARD_CSS } from "@/lib/integration-card.css";
import { cacheWorkspaceResponse } from "@/lib/use-workspace-hydration";
import type { PlaidPayload } from "@/lib/plaid-types";

type PlaidData = PlaidPayload & { ok?: boolean; connected?: boolean; error?: string };

const LINK_TOKEN_KEY = "dimad_plaid_link_token";

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
      try {
        localStorage.setItem(LINK_TOKEN_KEY, next);
      } catch {
        /* ignore */
      }
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
    // Chase OAuth must run in a real browser window on the allowlisted HTTPS origin.
    const appOrigin = String(process.env.NEXT_PUBLIC_PLAID_APP_ORIGIN || "https://dimad.co").replace(/\/$/, "");
    const local = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const connectUrl = `${local ? appOrigin : window.location.origin}/integrations/plaid-connect?link_token=${encodeURIComponent(token)}`;
    const topWin = window.top || window;
    const popup = topWin.open(connectUrl, "dimad_plaid_link", "popup=yes,width=520,height=780");
    if (!popup) {
      topWin.location.assign(connectUrl);
      return;
    }
    setConnecting(false);
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
  }, [loading, bankData, error, connecting, signedOut, linkToken]);

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
              <p className="dimad-int-meta">Balances and recent expenses</p>
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
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Cash available</div>
              <div className="v">{bankData.metrics.cashAvailableDisplay}</div>
              <div className="s">Checking / savings</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Credit balance</div>
              <div className="v">{bankData.metrics.creditBalanceDisplay}</div>
              <div className="s">Cards</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Net liquidity</div>
              <div className="v">{bankData.metrics.netLiquidityDisplay}</div>
              <div className="s">{bankData.metrics.accountCount} accounts</div>
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
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via Plaid
            </span>
            <button type="button" className="dimad-int-link" onClick={() => void disconnect()}>
              Disconnect
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
