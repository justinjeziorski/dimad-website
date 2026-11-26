"use client";

import { useEffect, useRef, useState } from "react";
import { postToDashboard } from "@/lib/embeds/postToDashboard";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import { authFetch } from "@/lib/auth/client";
import { authFetchWithRetry } from "@/lib/auth/authFetchRetry";
import { INTEGRATION_CARD_CSS } from "@/components/integrations/integration-card.css";
import { cacheWorkspaceResponse } from "@/hooks/useWorkspaceHydration";
import type { PatreonCampaignPayload } from "@/lib/integrations/patreon/types";

type PatreonData = PatreonCampaignPayload & { ok?: boolean; connected?: boolean; error?: string };
type Flash = { tone: "ok" | "bad"; text: string };

const FLASH_MS = 2 * 60 * 1000;

const REASONS: Record<string, string> = {
  denied: "Patreon connection was cancelled.",
  csrf: "Patreon connection was blocked by a security check. Try again.",
  missing_code: "Patreon did not return an authorization code.",
  token_exchange_failed: "Patreon could not finish connecting the account.",
  invalid_patreon_credentials: "Patreon rejected that access token. Generate a new one and try again.",
  patreon_request_failed: "Patreon API rejected the campaign request. Try Refresh.",
  firestore_write_failed: "Patreon connected, but saving the account failed.",
  firestore_permission_denied: "Saving the Patreon account was denied. Deploy the integrations rule.",
  missing_client_id: "Patreon OAuth is not configured on this server.",
  missing_client_secret: "Patreon OAuth secret is not configured on this server.",
  missing_access_token: "Paste a Patreon creator access token from Settings → Developers.",
  login_required: "Sign in, then connect Patreon."
};

function explain(code: string | undefined, fallback = "Could not load Patreon.") {
  if (!code) return fallback;
  if (REASONS[code]) return REASONS[code];
  if (code.includes(" ") && code.length < 180) return code;
  return fallback;
}

function readFlash(): Flash | null {
  try {
    const raw = sessionStorage.getItem("dimad_patreon_flash");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status?: string; reason?: string; at?: number };
    if (!parsed.at || Date.now() - parsed.at > FLASH_MS) return null;
    if (parsed.status === "connected") {
      return { tone: "ok", text: "Patreon campaign connected. Patron metrics below are live." };
    }
    return { tone: "bad", text: REASONS[parsed.reason || ""] || "Patreon connection failed." };
  } catch {
    return null;
  }
}

export default function PatreonWidget() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [campaignData, setCampaignData] = useState<PatreonData | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<Flash | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  function applyPayload(data: Record<string, unknown>, fromCache = false) {
    setSignedOut(false);
    if (!data.connected) {
      setCampaignData(null);
      postToDashboard({ type: "dimad-patreon-status", connected: false });
      if (data.error && !fromCache) setError(explain(String(data.error)));
      return;
    }
    if (data.error && !fromCache) setError(explain(String(data.error)));
    const payload = data as PatreonData;
    setCampaignData(payload);
    postToDashboard({
      type: "dimad-patreon-status",
      connected: true,
      campaignName: payload.campaignName,
      patronCount: payload.metrics?.patronCount || 0,
      mrr: payload.metrics?.mrrCents ? payload.metrics.mrrCents / 100 : 0,
      mrrDisplay: payload.metrics?.mrrDisplay || "0.00 USD"
    });
  }

  async function loadData(force = false) {
    setError("");
    if (!force) {
      const cached = takeWorkspaceHydration("patreon");
      if (cached) {
        applyPayload(cached, true);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { res, data, token } = await authFetchWithRetry("/api/patreon/data");
      if (!token || res.status === 401) {
        setSignedOut(true);
        setCampaignData(null);
        postToDashboard({ type: "dimad-patreon-status", connected: false });
        setError("Sign in to DIMAD, then connect Patreon.");
        return;
      }
      cacheWorkspaceResponse("patreon", data as Record<string, unknown>, res.ok, res.status);
      applyPayload(data as Record<string, unknown>);
    } catch {
      setError("Failed to fetch from Patreon.");
    } finally {
      setLoading(false);
    }
  }

  async function startConnect(popup: Window | null) {
    setConnecting(true);
    setError("");
    try {
      const { res, data, token } = await authFetch("/api/auth/patreon?format=json");
      if (!token || res.status === 401 || data.error === "missing_id_token" || data.error === "invalid_session") {
        popup?.close();
        (window.top || window).location.assign("/login.html");
        return;
      }
      if (!res.ok || !data.url) {
        popup?.close();
        setError(explain(String(data.error || ""), "Could not start Patreon OAuth."));
        setConnecting(false);
        return;
      }
      const authorizeUrl = String(data.url);
      if (popup && !popup.closed) {
        popup.location.href = authorizeUrl;
        setConnecting(false);
        return;
      }
      (window.top || window).location.assign(authorizeUrl);
    } catch {
      popup?.close();
      setError("Could not start Patreon OAuth.");
      setConnecting(false);
    }
  }

  function beginOauth() {
    // Open the popup synchronously on the click gesture so Google login is not framed.
    const popup = window.open("about:blank", "patreon_oauth", "popup=yes,width=620,height=760");
    void startConnect(popup);
  }

  async function connectWithToken(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    const accessToken = tokenInput.trim();
    if (!accessToken || accessToken.length < 12) {
      setError("Paste a Patreon creator access token from Settings → Developers.");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const { res, data, token } = await authFetch("/api/patreon/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken })
      });
      if (!token || res.status === 401) {
        (window.top || window).location.assign("/login.html");
        return;
      }
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not connect Patreon."));
        setConnecting(false);
        return;
      }
      setTokenInput("");
      await loadData();
    } catch {
      setError("Could not connect Patreon.");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Log out of this Patreon campaign?")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/patreon/data", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not disconnect Patreon."));
        setLoading(false);
        return;
      }
      setCampaignData(null);
      postToDashboard({ type: "dimad-patreon-status", connected: false });
    } catch {
      setError("Could not disconnect Patreon.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setFlash(readFlash());
    void loadData();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-patreon-connect") beginOauth();
      if (event.data?.type === "dimad-patreon-refresh") void loadData(true);
      if (event.data?.type === "dimad-patreon-oauth-done") {
        if (event.data.status === "connected") {
          setFlash({ tone: "ok", text: "Patreon campaign connected. Patron metrics below are live." });
          void loadData(true);
        } else if (event.data.status === "error") {
          setError(explain(String(event.data.reason || ""), "Patreon connection failed."));
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const onParentMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "dimad-patreon-oauth-done") return;
      if (window.parent !== window) {
        window.parent.postMessage(event.data, window.location.origin);
      }
    };
    window.addEventListener("message", onParentMessage);
    return () => window.removeEventListener("message", onParentMessage);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-patreon-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, campaignData, error, flash, connecting, signedOut, helpOpen, tokenInput]);

  const connected = Boolean(campaignData?.campaignId || campaignData?.campaignName);

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {flash ? <div className={`dimad-int-banner ${flash.tone}`} role="status">{flash.text}</div> : null}
      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div className="dimad-int-brand patreon" aria-hidden>
            P
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">Patreon</p>
            <h2>{connected ? campaignData!.campaignName : "Membership"}</h2>
            {connected ? (
              <p className="dimad-int-meta">
                {campaignData!.metrics.tierCount
                  ? `${campaignData!.metrics.tierCount} tiers · read-only analytics`
                  : "Read-only campaign analytics"}
              </p>
            ) : (
              <p className="dimad-int-meta">Tiers, pledges, and retention</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <AccountBadge
              tone="shopify"
              label={campaignData!.campaignName || "Patreon"}
              hint="Viewing"
              monogram="P"
              onLogout={() => void disconnect()}
              logoutLabel="Log out Patreon"
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
              ? "Sign in to DIMAD, then connect Patreon."
              : "Google-only Patreon accounts often hit a blank OAuth page. Use a creator access token below (recommended), or try OAuth in the popup."}
          </p>
          <button type="button" className="dimad-int-primary patreon" disabled={connecting} onClick={beginOauth}>
            {connecting ? "Connecting…" : "Connect with Patreon OAuth"}
          </button>

          <div className="dimad-int-divider">or paste token</div>
          <form className="dimad-int-form stack" onSubmit={(event) => void connectWithToken(event)}>
            <input
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Creator access token"
              type="password"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="dimad-int-amber" disabled={connecting || signedOut}>
              {connecting ? "Connecting…" : "Connect with access token"}
            </button>
          </form>

          <div className="dimad-int-help">
            <button
              type="button"
              className="dimad-int-help-trigger"
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((open) => !open)}
            >
              <span className="dimad-int-help-mark" aria-hidden>
                ?
              </span>
              <span className="dimad-int-help-title">How do I get a Patreon access token?</span>
              <span className="dimad-int-help-chevron" aria-hidden>
                ▾
              </span>
            </button>
            {helpOpen ? (
              <div className="dimad-int-help-body" role="region" aria-label="Patreon access token guide">
                <div className="dimad-int-help-step">
                  <span className="n">1</span>
                  <div>
                    <p className="t">Open Patreon Developers</p>
                    <p className="d">
                      In a normal browser tab, go to Patreon → Settings → Developers (or Clients & API Keys) while already
                      signed in.
                    </p>
                  </div>
                </div>
                <div className="dimad-int-help-step">
                  <span className="n">2</span>
                  <div>
                    <p className="t">Open your DIMAD application</p>
                    <p className="d">Select the app that uses this Client ID, or create one if needed.</p>
                  </div>
                </div>
                <div className="dimad-int-help-step">
                  <span className="n">3</span>
                  <div>
                    <p className="t">Generate an access token</p>
                    <p className="d">
                      Click <code>Generate access token</code>, copy it once, then paste it into DIMAD. Do not share it.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {connected && campaignData ? (
        <>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Monthly recurring</div>
              <div className="v">{campaignData.metrics.mrrDisplay}</div>
              <div className="s">Pledge sum</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Active patrons</div>
              <div className="v">{campaignData.metrics.patronCount}</div>
              <div className="s">Campaign total</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Tiers</div>
              <div className="v">{campaignData.metrics.tierCount}</div>
              <div className="s">Published</div>
            </div>
          </div>

          <div className="dimad-int-col" style={{ marginTop: 14 }}>
            <h3>Tier breakdown</h3>
            {campaignData.tiers.length ? (
              campaignData.tiers.slice(0, 5).map((tier) => (
                <div className="dimad-int-row" key={tier.id}>
                  <span className="title">
                    {tier.title} · {tier.amountDisplay}
                  </span>
                  <b>{tier.patronCount} patrons</b>
                </div>
              ))
            ) : (
              <p className="dimad-int-empty">No tiers synced yet.</p>
            )}
          </div>

          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via Patreon API v2
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
