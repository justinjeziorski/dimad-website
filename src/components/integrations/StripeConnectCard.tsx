"use client";

import { useEffect, useRef, useState } from "react";
import type { StripeConnectedMetrics } from "@/lib/stripe-types";

type Flash = { tone: "ok" | "bad"; text: string };

const FLASH_MS = 2 * 60 * 1000;

const REASONS: Record<string, string> = {
  denied: "Stripe connection was cancelled.",
  csrf: "Stripe connection was blocked by a security check. Try again.",
  missing_code: "Stripe did not return an authorization code.",
  token_exchange_failed: "Stripe could not finish connecting the account.",
  firestore_write_failed: "Stripe connected, but saving the account failed.",
  firestore_permission_denied: "Saving the Stripe account was denied. The integrations rule needs to be deployed.",
  missing_client_id: "Stripe Connect is not configured on this server.",
  missing_stripe_secret: "Stripe is not configured on this server.",
  login_required: "Sign in, then connect Stripe.",
  invalid_stripe_account: "Stripe did not return an account id.",
  reconnect_required: "This Stripe link needs to be reconnected."
};

type DimadUser = { getIdToken: () => Promise<string> };
type DimadAuth = {
  currentUser?: DimadUser | null;
  onAuthStateChanged?: (cb: (user: DimadUser | null) => void) => () => void;
};

function dimadAuth(): DimadAuth | null {
  const views = [window.parent, window];
  for (const view of views) {
    try {
      const auth = (view as Window & { DIMAD_FIREBASE?: { auth?: DimadAuth } }).DIMAD_FIREBASE?.auth;
      if (auth) return auth;
    } catch {
      /* parent is a different origin */
    }
  }
  return null;
}

function waitForToken(maxMs: number) {
  return new Promise<string>((resolve) => {
    const deadline = Date.now() + maxMs;
    let settled = false;
    const finish = (token: string) => {
      if (settled) return;
      settled = true;
      resolve(token);
    };
    const bind = (auth: DimadAuth) => {
      if (auth.currentUser) {
        auth.currentUser.getIdToken().then(finish).catch(() => finish(""));
        return;
      }
      if (auth.onAuthStateChanged) {
        const unsub = auth.onAuthStateChanged((user) => {
          unsub?.();
          if (!user) finish("");
          else user.getIdToken().then(finish).catch(() => finish(""));
        });
        return;
      }
      finish("");
    };
    const tick = () => {
      const auth = dimadAuth();
      if (auth) {
        bind(auth);
        return;
      }
      if (Date.now() >= deadline) finish("");
      else setTimeout(tick, 50);
    };
    tick();
  });
}

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

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

async function stripeFetch(path: string, token: string, method = "GET") {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { method, headers, credentials: "include", cache: "no-store" });
  const data = await res.json().catch(() => ({ ok: false, error: "stripe_request_failed" }));
  return { res, data };
}

export default function StripeConnectCard() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [metrics, setMetrics] = useState<StripeConnectedMetrics | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<Flash | null>(null);

  async function loadMetrics(token: string) {
    setLoading(true);
    setError("");
    try {
      if (!token) {
        setSignedOut(true);
        setMetrics(null);
        postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
        return;
      }
      setSignedOut(false);
      const { res, data } = await stripeFetch("/api/integrations/stripe/metrics", token);
      if (res.status === 401) {
        setSignedOut(true);
        setMetrics(null);
        postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
        return;
      }
      if (!data.ok) {
        setMetrics(null);
        setError(explain(data.error));
        if (data.error === "reconnect_required") setSignedOut(false);
        return;
      }
      if (!data.connected) {
        setMetrics(null);
        postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
        return;
      }
      setMetrics(data as StripeConnectedMetrics);
      postToDashboard({ type: "dimad-stripe-status", connected: true, display: data.display });
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
      const token = await waitForToken(4000);
      const { res, data } = await stripeFetch("/api/integrations/stripe/connect?format=json", token);
      if (res.status === 401 || data.error === "missing_id_token" || data.error === "invalid_session") {
        (window.top || window).location.assign("/login.html");
        return;
      }
      if (!res.ok || !data.url) {
        setError(explain(data.error, "Could not start Stripe Connect."));
        setConnecting(false);
        return;
      }
      (window.top || window).location.assign(data.url);
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
      const token = await waitForToken(4000);
      const { res, data } = await stripeFetch("/api/integrations/stripe/metrics", token, "DELETE");
      if (!res.ok || data.ok === false) {
        setError(explain(data.error, "Could not disconnect Stripe."));
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
    let cancel = false;
    void (async () => {
      const token = await waitForToken(8000);
      if (cancel) return;
      await loadMetrics(token);
    })();
    return () => {
      cancel = true;
    };
    // Mount load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-stripe-connect") void startConnect();
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
  const when = (unix: number) => new Date(unix * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <section ref={rootRef} className="stripe-connect-card bg-zinc-950 border border-zinc-800 rounded-2xl">
      <style>{`
        .stripe-connect-card {
          box-sizing: border-box;
          width: 100%;
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 16px;
          padding: 14px 16px 16px;
          color: #fafafa;
          font-family: "JetBrains Mono", ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace;
        }
        .stripe-connect-card * { box-sizing: border-box; }
        .stripe-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .stripe-kicker { margin: 0; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #a1a1aa; }
        .stripe-connect-card h2 { margin: 3px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
        .stripe-meta { margin: 6px 0 0; color: #71717a; font-size: 10px; }
        .stripe-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
        .stripe-badge, .stripe-ghost, .stripe-primary { font: inherit; }
        .stripe-badge {
          align-self: center;
          border: 1px solid #3f3f46;
          border-radius: 999px;
          padding: 2px 7px;
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #d4d4d8;
        }
        .stripe-badge.live { color: #86efac; border-color: #166534; }
        .stripe-ghost, .stripe-primary { cursor: pointer; border-radius: 10px; }
        .stripe-ghost {
          background: #09090b;
          color: #e4e4e7;
          border: 1px solid #3f3f46;
          padding: 6px 8px;
          font-size: 10px;
        }
        .stripe-ghost:hover:not(:disabled) { border-color: #d4d4d8; color: #fff; }
        .stripe-ghost:disabled, .stripe-primary:disabled { opacity: 0.55; cursor: wait; }
        .stripe-primary {
          display: flex;
          width: 100%;
          justify-content: center;
          margin-top: 12px;
          background: #fafafa;
          color: #09090b;
          border: 0;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }
        .stripe-primary:hover { background: #e4e4e7; }
        .stripe-ghost:focus-visible, .stripe-primary:focus-visible { outline: 2px solid #e4e4e7; outline-offset: 2px; }
        .stripe-note { margin: 8px 0 0; color: #a1a1aa; font-size: 11px; line-height: 1.5; }
        .stripe-banner { margin-bottom: 10px; border-radius: 10px; padding: 8px 10px; font-size: 11px; line-height: 1.4; }
        .stripe-banner.ok { background: #052e16; color: #bbf7d0; border: 1px solid #166534; }
        .stripe-banner.bad { background: #450a0a; color: #fecaca; border: 1px solid #7f1d1d; }
        .stripe-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .stripe-metric { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 8px 10px; min-width: 0; }
        .stripe-metric .k { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #a1a1aa; }
        .stripe-metric .v { margin-top: 4px; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
        .stripe-metric .s { margin-top: 3px; font-size: 10px; color: #71717a; }
        .stripe-list-label { margin: 12px 0 0; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #a1a1aa; }
        .stripe-payments { max-height: 168px; overflow: auto; margin-top: 4px; }
        .stripe-pay { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 6px 0; border-top: 1px solid #27272a; font-size: 11px; }
        .stripe-pay .desc { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d4d4d8; }
        .stripe-pay time { flex: none; color: #71717a; }
        .stripe-pay b { flex: none; font-weight: 650; }
        .stripe-empty { margin: 8px 0 0; color: #71717a; font-size: 11px; }
        @media (max-width: 720px) { .stripe-metrics { grid-template-columns: 1fr; } }
      `}</style>

      {flash ? <div className={`stripe-banner ${flash.tone}`} role="status">{flash.text}</div> : null}
      {error ? <div className="stripe-banner bad" role="alert">{error}</div> : null}

      <div className="stripe-head">
        <div>
          <p className="stripe-kicker">Stripe</p>
          <h2>Sales & Revenue</h2>
          {connected ? (
            <p className="stripe-meta">
              {metrics?.livemode ? "Live" : "Test mode"} · {metrics?.accountLabel} · connected
            </p>
          ) : null}
        </div>
        {connected ? (
          <div className="stripe-actions">
            <span className={metrics?.livemode ? "stripe-badge live" : "stripe-badge"}>{metrics?.livemode ? "Live" : "Test"}</span>
            <button type="button" className="stripe-ghost" onClick={() => void (async () => { const token = await waitForToken(4000); await loadMetrics(token); })()} disabled={loading}>
              Refresh
            </button>
            <button type="button" className="stripe-ghost" onClick={() => void disconnect()} disabled={loading}>
              Disconnect
            </button>
          </div>
        ) : null}
      </div>

      {loading && !connected ? <p className="stripe-note">Checking your Stripe connection…</p> : null}

      {!loading && !connected ? (
        <>
          <p className="stripe-note">
            {signedOut
              ? "Sign in to DIMAD, then connect the Stripe account you already use."
              : "Connect your existing Stripe account so DIMAD can load live balance, charges, and subscription revenue in the dashboard."}
          </p>
          <a
            className="stripe-primary"
            href="/api/integrations/stripe/connect"
            onClick={(event) => {
              event.preventDefault();
              if (!connecting) void startConnect();
            }}
            aria-disabled={connecting}
          >
            {connecting ? "Connecting…" : "Connect with Stripe"}
          </a>
        </>
      ) : null}

      {connected && metrics ? (
        <>
          <div className="stripe-metrics">
            <div className="stripe-metric bg-zinc-900 border border-zinc-800">
              <div className="k">Available balance</div>
              <div className="v">{metrics.display.available}</div>
              <div className="s">Pending {metrics.display.pending}</div>
            </div>
            <div className="stripe-metric bg-zinc-900 border border-zinc-800">
              <div className="k">30-day gross</div>
              <div className="v">{metrics.display.gross30d}</div>
              <div className="s">{metrics.successfulCount} successful charge{metrics.successfulCount === 1 ? "" : "s"}</div>
            </div>
            <div className="stripe-metric bg-zinc-900 border border-zinc-800">
              <div className="k">Active MRR</div>
              <div className="v">{metrics.display.mrr}</div>
              <div className="s">
                {metrics.activeSubscriptions}{metrics.subscriptionsCapped ? "+" : ""} active subscription{metrics.activeSubscriptions === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <p className="stripe-list-label">Recent payments</p>
          {metrics.recent.length ? (
            <div className="stripe-payments">
              {metrics.recent.map((payment) => (
                <div className="stripe-pay" key={payment.id}>
                  <time dateTime={new Date(payment.created * 1000).toISOString()}>{when(payment.created)}</time>
                  <span className="desc">{payment.description}</span>
                  <b>{payment.displayAmount}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="stripe-empty">No successful charges in the last 30 days.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
