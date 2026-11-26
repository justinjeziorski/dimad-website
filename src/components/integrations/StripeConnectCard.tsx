"use client";

import { useEffect, useRef, useState } from "react";
import { postToDashboard } from "@/lib/embeds/postToDashboard";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import { authFetch } from "@/lib/auth/client";
import { INTEGRATION_CARD_CSS } from "@/components/integrations/integration-card.css";
import { startStripeOAuth } from "@/lib/auth/oauth-client";
import { cacheWorkspaceResponse } from "@/hooks/useWorkspaceHydration";
import type { StripeConnectedMetrics } from "@/lib/integrations/stripe/types";

type Flash = { tone: "ok" | "bad"; text: string };

const FLASH_MS = 2 * 60 * 1000;

const REASONS: Record<string, string> = {
  denied: "Stripe connection was cancelled.",
  csrf: "Stripe connection was blocked by a security check. Try again.",
  missing_code: "Stripe did not return an authorization code.",
  token_exchange_failed: "Stripe could not finish connecting the account.",
  firestore_write_failed: "Stripe connected, but saving the account failed.",
  firestore_permission_denied: "Saving the Stripe account was denied. Deploy the integrations rule.",
  missing_client_id: "Stripe Connect is not configured on this server.",
  missing_stripe_secret: "Stripe is not configured on this server.",
  login_required: "Sign in, then connect Stripe.",
  invalid_stripe_account: "Stripe did not return an account id.",
  reconnect_required: "This Stripe link needs to be reconnected."
};

function explain(code: string | undefined, fallback = "Could not load Stripe revenue.") {
  if (!code) return fallback;
  if (REASONS[code]) return REASONS[code];
  if (code.includes(" ") && code.length < 180 && !/sk_(live|test)_/i.test(code)) return code;
  return fallback;
}

function readFlash(): Flash | null {
  try {
    const raw = sessionStorage.getItem("dimad_stripe_flash");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status?: string; reason?: string; at?: number };
    if (!parsed.at || Date.now() - parsed.at > FLASH_MS) return null;
    if (parsed.status === "connected") {
      return { tone: "ok", text: "Stripe account connected. Revenue below is live." };
    }
    return { tone: "bad", text: REASONS[parsed.reason || ""] || "Stripe connection failed." };
  } catch {
    return null;
  }
}

export default function StripeConnectCard() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [metrics, setMetrics] = useState<StripeConnectedMetrics | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<Flash | null>(null);

  function applyPayload(data: Record<string, unknown>, fromCache = false) {
    setSignedOut(false);
    if (!data.ok) {
      setMetrics(null);
      if (!fromCache) setError(explain(typeof data.error === "string" ? data.error : undefined));
      return;
    }
    if (!data.connected) {
      setMetrics(null);
      postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
      return;
    }
    setMetrics(data as unknown as StripeConnectedMetrics);
    postToDashboard({ type: "dimad-stripe-status", connected: true, display: data.display });
  }

  async function loadMetrics(force = false) {
    setError("");
    if (!force) {
      const cached = takeWorkspaceHydration("stripe");
      if (cached) {
        applyPayload(cached, true);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { res, data, token } = await authFetch("/api/integrations/stripe/metrics");
      if (!token || res.status === 401) {
        setSignedOut(true);
        setMetrics(null);
        postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
        return;
      }
      cacheWorkspaceResponse("stripe", data as Record<string, unknown>, res.ok, res.status);
      applyPayload(data as Record<string, unknown>);
    } catch {
      setError("Could not load Stripe revenue.");
    } finally {
      setLoading(false);
    }
  }

  async function startConnect() {
    setConnecting(true);
    setError("");
    try {
      const result = await startStripeOAuth();
      if (!result.ok) {
        if (result.error === "login_required") {
          (window.top || window).location.assign("/login.html");
          return;
        }
        setError(explain(result.error, "Could not start Stripe Connect."));
        setConnecting(false);
      }
    } catch {
      setError("Could not start Stripe Connect.");
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Stripe? DIMAD will stop reading this account.")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/integrations/stripe/metrics", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(explain(typeof data.error === "string" ? data.error : undefined, "Could not disconnect Stripe."));
        setLoading(false);
        return;
      }
      setMetrics(null);
      postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
    } catch {
      setError("Could not disconnect Stripe.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setFlash(readFlash());
    void loadMetrics();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-stripe-connect") void startConnect();
      if (event.data?.type === "dimad-stripe-refresh") void loadMetrics(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-stripe-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, metrics, error, flash, connecting, signedOut]);

  const connected = Boolean(metrics);
  const when = (unix: number) =>
    new Date(unix * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {flash ? <div className={`dimad-int-banner ${flash.tone}`} role="status">{flash.text}</div> : null}
      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div className="dimad-int-brand stripe" aria-hidden>$</div>
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">Stripe</p>
            <h2>Payments</h2>
            {connected ? (
              <p className="dimad-int-meta">
                {metrics?.livemode ? "Live" : "Test mode"} · {metrics?.accountLabel}
              </p>
            ) : (
              <p className="dimad-int-meta">Balance, charges, and subscription MRR</p>
            )}
          </div>
        </div>
        {connected && metrics ? (
          <div className="dimad-int-actions">
            <span className={metrics.livemode ? "dimad-int-badge" : "dimad-int-badge muted"}>
              {metrics.livemode ? "Live" : "Test"}
            </span>
            <AccountBadge
              tone="stripe"
              label={metrics.accountLabel}
              hint={metrics.livemode ? "Live account" : "Test account"}
              monogram="$"
              onLogout={() => void disconnect()}
            />
            <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadMetrics(true)}>
              Refresh
            </button>
          </div>
        ) : null}
      </div>

      {loading && !connected ? <IntegrationLoadingBar tone="stripe" /> : null}

      {!loading && !connected ? (
        <>
          <p className="dimad-int-note">
            {signedOut
              ? "Sign in to DIMAD, then connect the Stripe account you already use."
              : "Connect your existing Stripe account so DIMAD can load live balance, charges, and subscription revenue."}
          </p>
          <button type="button" className="dimad-int-primary" disabled={connecting} onClick={() => void startConnect()}>
            {connecting ? "Connecting…" : "Connect with Stripe"}
          </button>
        </>
      ) : null}

      {connected && metrics ? (
        <>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Available balance</div>
              <div className="v">{metrics.display.available}</div>
              <div className="s">Pending {metrics.display.pending}</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">30-day gross</div>
              <div className="v">{metrics.display.gross30d}</div>
              <div className="s">
                {metrics.successfulCount} successful charge{metrics.successfulCount === 1 ? "" : "s"}
              </div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Active MRR</div>
              <div className="v">{metrics.display.mrr}</div>
              <div className="s">
                {metrics.activeSubscriptions}
                {metrics.subscriptionsCapped ? "+" : ""} active subscription
                {metrics.activeSubscriptions === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <p className="dimad-int-kicker" style={{ marginTop: 12 }}>
            Recent payments
          </p>
          {metrics.recent.length ? (
            <div>
              {metrics.recent.map((payment) => (
                <div className="dimad-int-row" key={payment.id}>
                  <time className="meta" dateTime={new Date(payment.created * 1000).toISOString()}>
                    {when(payment.created)}
                  </time>
                  <span className="title">{payment.description}</span>
                  <b>{payment.displayAmount}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="dimad-int-empty">No successful charges in the last 30 days.</p>
          )}
          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via Stripe Connect
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
