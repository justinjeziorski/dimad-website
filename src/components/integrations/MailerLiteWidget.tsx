"use client";

import { useEffect, useRef, useState } from "react";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import { authFetch } from "@/lib/dimad-auth-client";
import { INTEGRATION_CARD_CSS } from "@/lib/integration-card.css";
import { cacheWorkspaceResponse } from "@/lib/use-workspace-hydration";
import type { MailerLitePayload } from "@/lib/mailerlite-types";

type MailerLiteData = MailerLitePayload & { ok?: boolean; connected?: boolean; error?: string };

const REASONS: Record<string, string> = {
  missing_api_token: "Paste a valid MailerLite API token.",
  invalid_mailerlite_token: "Invalid MailerLite API token",
  "Invalid MailerLite API token": "Invalid MailerLite API token",
  mailerlite_request_failed: "Could not reach MailerLite.",
  firestore_write_failed: "MailerLite connected, but saving the token failed.",
  firestore_permission_denied: "Saving the MailerLite token was denied. Deploy the integrations rule.",
  login_required: "Sign in, then connect MailerLite."
};

function explain(code: string | undefined, fallback = "Could not load MailerLite.") {
  if (!code) return fallback;
  if (REASONS[code]) return REASONS[code];
  if (code.includes(" ") && code.length < 180) return code;
  return fallback;
}

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

export default function MailerLiteWidget() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [accountData, setAccountData] = useState<MailerLiteData | null>(null);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  function applyPayload(data: Record<string, unknown>, fromCache = false) {
    setSignedOut(false);
    if (!data.connected) {
      setAccountData(null);
      postToDashboard({ type: "dimad-mailerlite-status", connected: false });
      if (data.error && !fromCache) setError(explain(String(data.error)));
      return;
    }
    if (data.error && !fromCache) setError(explain(String(data.error)));
    const payload = data as MailerLiteData;
    setAccountData(payload);
    postToDashboard({
      type: "dimad-mailerlite-status",
      connected: true,
      subscribers: payload.metrics?.subscriberCount || 0,
      avgOpenDisplay: payload.metrics?.avgOpenDisplay || "0.0%",
      avgClickDisplay: payload.metrics?.avgClickDisplay || "0.0%"
    });
  }

  async function loadData(force = false) {
    setError("");
    if (!force) {
      const cached = takeWorkspaceHydration("mailerlite");
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
        last = await authFetch("/api/mailerlite/data");
        if (last.token && last.res.status !== 401) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 900));
      }
      const { res, data, token } = last || { res: new Response(null, { status: 401 }), data: {}, token: "" };
      if (!token || res.status === 401) {
        setSignedOut(true);
        setAccountData(null);
        postToDashboard({ type: "dimad-mailerlite-status", connected: false });
        setError("Sign in to DIMAD, then connect MailerLite.");
        return;
      }
      cacheWorkspaceResponse("mailerlite", data as Record<string, unknown>, res.ok, res.status);
      applyPayload(data as Record<string, unknown>);
    } catch {
      setError("Failed to fetch from MailerLite.");
    } finally {
      setLoading(false);
    }
  }

  async function startConnect(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    const apiToken = tokenInput.trim();
    if (!apiToken || apiToken.length < 12) {
      setError("Paste a MailerLite API token from Integrations → API.");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const { res, data, token } = await authFetch("/api/mailerlite/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken })
      });
      if (!token || res.status === 401) {
        (window.top || window).location.assign("/login.html");
        return;
      }
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not connect MailerLite."));
        setConnecting(false);
        return;
      }
      setTokenInput("");
      await loadData();
    } catch {
      setError("Could not connect MailerLite.");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Log out of this MailerLite account?")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/mailerlite/connect", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not disconnect MailerLite."));
        setLoading(false);
        return;
      }
      setAccountData(null);
      postToDashboard({ type: "dimad-mailerlite-status", connected: false });
    } catch {
      setError("Could not disconnect MailerLite.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-mailerlite-connect") {
        document.getElementById("mailerlite-widget-token")?.focus();
      }
      if (event.data?.type === "dimad-mailerlite-refresh") void loadData(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-mailerlite-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, accountData, error, connecting, signedOut, helpOpen]);

  const connected = Boolean(accountData?.connectedAt || accountData?.metrics);
  const latest = accountData?.campaigns?.[0];

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div className="dimad-int-brand mailerlite" aria-hidden>
            M
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">MailerLite</p>
            <h2>{connected ? "Email list" : "Email"}</h2>
            {connected ? (
              <p className="dimad-int-meta">Waitlist, campaigns, and list growth</p>
            ) : (
              <p className="dimad-int-meta">Waitlist, campaigns, and list growth</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <AccountBadge
              tone="shopify"
              label="MailerLite"
              hint="Viewing"
              monogram="M"
              onLogout={() => void disconnect()}
              logoutLabel="Log out MailerLite"
            />
            <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadData(true)}>
              Refresh
            </button>
          </div>
        ) : null}
      </div>

      {loading && !connected ? <IntegrationLoadingBar tone="amber" /> : null}

      {!loading && !connected ? (
        <>
          <p className="dimad-int-note">
            {signedOut
              ? "Sign in to DIMAD, then connect MailerLite."
              : "Paste your MailerLite API token to sync subscribers and campaign performance."}
          </p>
          <form className="dimad-int-form stack" onSubmit={(event) => void startConnect(event)}>
            <input
              id="mailerlite-widget-token"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="MailerLite API token"
              type="password"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="dimad-int-primary mailerlite" disabled={connecting}>
              {connecting ? "Connecting…" : "Connect MailerLite"}
            </button>
          </form>

          <div className="dimad-int-help">
            <button
              type="button"
              className="dimad-int-help-trigger"
              aria-expanded={helpOpen}
              aria-controls="mailerlite-help-body"
              onClick={() => setHelpOpen((open) => !open)}
            >
              <span className="dimad-int-help-mark" aria-hidden>
                ?
              </span>
              <span className="dimad-int-help-title">Where do I find my MailerLite API token?</span>
              <span className="dimad-int-help-chevron" aria-hidden>
                ▾
              </span>
            </button>
            {helpOpen ? (
              <div id="mailerlite-help-body" className="dimad-int-help-body" role="region" aria-label="MailerLite API token guide">
                <div className="dimad-int-help-step">
                  <span className="n">1</span>
                  <div>
                    <p className="t">Open Integrations</p>
                    <p className="d">Log into your MailerLite dashboard and click Integrations in the left sidebar.</p>
                  </div>
                </div>
                <div className="dimad-int-help-step">
                  <span className="n">2</span>
                  <div>
                    <p className="t">Open API tokens</p>
                    <p className="d">
                      Click <code>Use</code> next to <code>API</code>, then click <code>Generate new token</code>.
                    </p>
                  </div>
                </div>
                <div className="dimad-int-help-step">
                  <span className="n">3</span>
                  <div>
                    <p className="t">Create the Dimad token</p>
                    <p className="d">
                      Name it <code>Dimad</code>, click <code>Create token</code>, and copy it immediately (MailerLite only
                      shows it once).
                    </p>
                  </div>
                </div>
                <div className="dimad-int-help-step">
                  <span className="n">4</span>
                  <div>
                    <p className="t">Connect in DIMAD</p>
                    <p className="d">Paste the token above and click Connect MailerLite.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {connected && accountData ? (
        <>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Total subscribers</div>
              <div className="v">{accountData.metrics.subscriberCount.toLocaleString()}</div>
              <div className="s">All statuses</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Avg. open rate</div>
              <div className="v">{accountData.metrics.avgOpenDisplay}</div>
              <div className="s">Last sent campaigns</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Avg. click rate</div>
              <div className="v">{accountData.metrics.avgClickDisplay}</div>
              <div className="s">Last sent campaigns</div>
            </div>
          </div>

          <div className="dimad-int-col" style={{ marginTop: 14 }}>
            <h3>Latest campaign</h3>
            {latest ? (
              <div className="dimad-int-row">
                <span className="title">{latest.name}</span>
                <span className="meta">
                  {latest.openRate.toFixed(1)}% open · {latest.clickRate.toFixed(1)}% click
                </span>
              </div>
            ) : (
              <p className="dimad-int-empty">{accountData.metrics.latestCampaignName}</p>
            )}
          </div>

          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via MailerLite Connect API
            </span>
            <button type="button" className="dimad-int-link" onClick={() => postToDashboard({ type: "dimad-open-sales" })}>
              View in Revenue →
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
