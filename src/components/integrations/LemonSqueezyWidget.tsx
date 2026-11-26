"use client";

import { useEffect, useRef, useState } from "react";
import { postToDashboard } from "@/lib/embeds/postToDashboard";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { authFetch } from "@/lib/auth/client";
import { authFetchWithRetry } from "@/lib/auth/authFetchRetry";
import { INTEGRATION_CARD_CSS } from "@/components/integrations/integration-card.css";
import type { LemonStorePayload } from "@/lib/integrations/lemon/types";

type LemonData = LemonStorePayload & { ok?: boolean; connected?: boolean; error?: string };

const REASONS: Record<string, string> = {
  missing_api_key: "Enter a valid Lemon Squeezy API key.",
  missing_store_id: "Enter your numeric Lemon Squeezy store ID.",
  invalid_lemon_credentials: "Lemon Squeezy rejected those credentials.",
  lemon_request_failed: "Could not reach Lemon Squeezy.",
  firestore_permission_denied: "Saving Lemon credentials was denied.",
  firestore_write_failed: "Could not save Lemon credentials."
};

function explain(code: string | undefined, fallback = "Could not load Lemon Squeezy.") {
  if (!code) return fallback;
  if (REASONS[code]) return REASONS[code];
  if (code.includes(" ") && code.length < 180) return code;
  return fallback;
}

export default function LemonSqueezyWidget() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [storeIdInput, setStoreIdInput] = useState("");
  const [storeData, setStoreData] = useState<LemonData | null>(null);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const { res, data, token } = await authFetchWithRetry("/api/lemonsqueezy/data");
      if (!token || res.status === 401) {
        setSignedOut(true);
        setStoreData(null);
        postToDashboard({ type: "dimad-lemon-status", connected: false });
        setError("Sign in to DIMAD, then connect Lemon Squeezy.");
        return;
      }
      setSignedOut(false);
      if (!data.connected) {
        setStoreData(null);
        postToDashboard({ type: "dimad-lemon-status", connected: false });
        if (data.error) setError(explain(String(data.error)));
        return;
      }
      if (data.error) setError(explain(String(data.error)));
      const payload = data as LemonData;
      setStoreData(payload);
      postToDashboard({
        type: "dimad-lemon-status",
        connected: true,
        storeId: payload.storeId,
        storeName: payload.storeName,
        orderCount: payload.metrics?.orderCount || 0,
        productCount: payload.metrics?.productCount || 0,
        revenue: payload.metrics?.grossVolume || 0,
        currency: payload.currency || "USD"
      });
    } catch {
      setError("Failed to fetch from Lemon Squeezy.");
    } finally {
      setLoading(false);
    }
  }

  async function startConnect(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    const apiKey = apiKeyInput.trim();
    const storeId = storeIdInput.trim();
    if (!storeId || !/^\d+$/.test(storeId)) {
      setError("Use your numeric Lemon Squeezy store ID.");
      return;
    }
    if (!apiKey || apiKey.length < 12) {
      setError("Paste a Lemon Squeezy API key from Settings → API.");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const { res, data, token } = await authFetch("/api/lemonsqueezy/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, storeId })
      });
      if (!token || res.status === 401) {
        (window.top || window).location.assign("/login.html");
        return;
      }
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not connect Lemon Squeezy."));
        setConnecting(false);
        return;
      }
      setApiKeyInput("");
      await loadData();
    } catch {
      setError("Could not connect Lemon Squeezy.");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Log out of this Lemon Squeezy store?")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/lemonsqueezy/connect", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not disconnect Lemon Squeezy."));
        setLoading(false);
        return;
      }
      setStoreData(null);
      postToDashboard({ type: "dimad-lemon-status", connected: false });
    } catch {
      setError("Could not disconnect Lemon Squeezy.");
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
      if (event.data?.type === "dimad-lemon-connect") {
        document.getElementById("lemon-widget-store")?.focus();
      }
      if (event.data?.type === "dimad-lemon-refresh") void loadData();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-lemon-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, storeData, error, connecting, signedOut, helpOpen]);

  const connected = Boolean(storeData?.storeId);

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div className="dimad-int-brand shopify" aria-hidden>
            L
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">Lemon Squeezy</p>
            <h2>{connected ? storeData!.storeName : "Checkout"}</h2>
            {connected ? (
              <p className="dimad-int-meta">
                Store {storeData!.storeId}
                {storeData!.currency ? ` · ${storeData!.currency}` : ""}
              </p>
            ) : (
              <p className="dimad-int-meta">Sync digital sales, licenses, and subscriptions</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <AccountBadge
              tone="shopify"
              label={storeData!.storeName || `Store ${storeData!.storeId}`}
              hint="Viewing"
              monogram="L"
              onLogout={() => void disconnect()}
              logoutLabel="Log out store"
            />
            <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadData()}>
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
              ? "Sign in to DIMAD, then connect Lemon Squeezy."
              : "Paste your store ID and API key from Lemon Squeezy → Settings → API."}
          </p>
          <form className="dimad-int-form stack" onSubmit={(event) => void startConnect(event)}>
            <input
              id="lemon-widget-store"
              value={storeIdInput}
              onChange={(event) => setStoreIdInput(event.target.value)}
              placeholder="Store ID (e.g. 12345)"
              autoComplete="off"
              spellCheck={false}
            />
            <input
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="API key"
              type="password"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="dimad-int-amber" disabled={connecting}>
              {connecting ? "Connecting…" : "Connect Lemon Squeezy"}
            </button>
          </form>

          <div className="dimad-int-help">
            <button
              type="button"
              className="dimad-int-help-trigger"
              aria-expanded={helpOpen}
              aria-controls="lemon-help-body"
              onClick={() => setHelpOpen((open) => !open)}
            >
              <span className="dimad-int-help-mark" aria-hidden>
                ?
              </span>
              <span className="dimad-int-help-title">Where do I find my Store ID and API Key?</span>
              <span className="dimad-int-help-chevron" aria-hidden>
                ▾
              </span>
            </button>
            {helpOpen ? (
              <div id="lemon-help-body" className="dimad-int-help-body" role="region" aria-label="Lemon Squeezy credentials guide">
                <div className="dimad-int-help-step">
                  <span className="n">1</span>
                  <div>
                    <p className="t">Log into Lemon Squeezy</p>
                    <p className="d">Go to the Lemon Squeezy Dashboard and sign in to your merchant account.</p>
                  </div>
                </div>
                <div className="dimad-int-help-step">
                  <span className="n">2</span>
                  <div>
                    <p className="t">Find your Store ID</p>
                    <p className="d">
                      On your main dashboard, look at the browser URL. The numeric string right after{" "}
                      <code>/dashboard/</code> is your Store ID (e.g.{" "}
                      <code>app.lemonsqueezy.com/dashboard/12345</code>).
                    </p>
                  </div>
                </div>
                <div className="dimad-int-help-step">
                  <span className="n">3</span>
                  <div>
                    <p className="t">Generate an API key</p>
                    <p className="d">
                      Open Settings → API → Create API Key. Label it something like{" "}
                      <code>Dimad Integration</code>, then copy the generated token.
                    </p>
                  </div>
                </div>
                <div className="dimad-int-help-step">
                  <span className="n">4</span>
                  <div>
                    <p className="t">Complete the connection</p>
                    <p className="d">Paste both your Store ID and API Key into this widget and click Connect.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {connected && storeData ? (
        <>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Gross volume</div>
              <div className="v">{storeData.metrics.grossDisplay}</div>
              <div className="s">Recent orders</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Products</div>
              <div className="v">{storeData.metrics.productCount}</div>
              <div className="s">In catalog</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Orders</div>
              <div className="v">{storeData.metrics.orderCount}</div>
              <div className="s">Synced queue</div>
            </div>
          </div>

          <div className="dimad-int-grid">
            <div className="dimad-int-col">
              <h3>Recent products</h3>
              {storeData.products.length ? (
                storeData.products.slice(0, 4).map((product) => (
                  <div className="dimad-int-row" key={product.id}>
                    <span className="title">{product.name}</span>
                    <span className="meta">
                      {product.price.toFixed(2)} {product.currency}
                    </span>
                  </div>
                ))
              ) : (
                <p className="dimad-int-empty">No products synced yet.</p>
              )}
            </div>
            <div className="dimad-int-col">
              <h3>Recent orders</h3>
              {storeData.orders.length ? (
                storeData.orders.slice(0, 4).map((order) => (
                  <div className="dimad-int-row" key={order.id}>
                    <span className="title">
                      #{order.orderNumber || order.id} · {order.customerName}
                    </span>
                    <b>
                      {order.total.toFixed(2)} {order.currency}
                    </b>
                  </div>
                ))
              ) : (
                <p className="dimad-int-empty">No orders synced yet.</p>
              )}
            </div>
          </div>

          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via Lemon Squeezy API v1
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
