"use client";

import { useEffect, useRef, useState } from "react";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import { authFetch } from "@/lib/dimad-auth-client";
import { INTEGRATION_CARD_CSS } from "@/lib/integration-card.css";
import { startGumroadOAuth } from "@/lib/oauth-client";
import { cacheWorkspaceResponse } from "@/lib/use-workspace-hydration";
import type { GumroadStorePayload } from "@/lib/gumroad-types";

type GumroadData = GumroadStorePayload & { ok?: boolean; connected?: boolean; error?: string };
type Flash = { tone: "ok" | "bad"; text: string };

const FLASH_MS = 2 * 60 * 1000;

const REASONS: Record<string, string> = {
  denied: "Gumroad connection was cancelled.",
  csrf: "Gumroad connection was blocked by a security check. Try again.",
  missing_code: "Gumroad did not return an authorization code.",
  token_exchange_failed: "Gumroad could not finish connecting the account.",
  invalid_gumroad_credentials: "Gumroad rejected the saved access token. Reconnect.",
  gumroad_request_failed: "Could not reach Gumroad.",
  firestore_write_failed: "Gumroad connected, but saving the account failed.",
  firestore_permission_denied: "Saving the Gumroad account was denied. Deploy the integrations rule.",
  missing_client_id: "Gumroad OAuth is not configured on this server.",
  missing_client_secret: "Gumroad OAuth secret is not configured on this server.",
  login_required: "Sign in, then connect Gumroad."
};

function explain(code: string | undefined, fallback = "Could not load Gumroad.") {
  if (!code) return fallback;
  if (REASONS[code]) return REASONS[code];
  if (code.includes(" ") && code.length < 180) return code;
  return fallback;
}

function readFlash(): Flash | null {
  try {
    const raw = sessionStorage.getItem("dimad_gumroad_flash");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status?: string; reason?: string; at?: number };
    if (!parsed.at || Date.now() - parsed.at > FLASH_MS) return null;
    if (parsed.status === "connected") {
      return { tone: "ok", text: "Gumroad account connected. Sales below are live." };
    }
    return { tone: "bad", text: REASONS[parsed.reason || ""] || "Gumroad connection failed." };
  } catch {
    return null;
  }
}

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

export default function GumroadWidget() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [storeData, setStoreData] = useState<GumroadData | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<Flash | null>(null);

  function applyPayload(data: Record<string, unknown>, fromCache = false) {
    setSignedOut(false);
    if (!data.connected) {
      setStoreData(null);
      postToDashboard({ type: "dimad-gumroad-status", connected: false });
      if (data.error && !fromCache) setError(explain(String(data.error)));
      return;
    }
    if (data.error && !fromCache) setError(explain(String(data.error)));
    const payload = data as GumroadData;
    setStoreData(payload);
    postToDashboard({
      type: "dimad-gumroad-status",
      connected: true,
      name: payload.name,
      email: payload.email,
      saleCount: payload.metrics?.saleCount || 0,
      productCount: payload.metrics?.productCount || 0,
      revenue: payload.metrics?.grossVolume || 0
    });
  }

  async function loadData(force = false) {
    setError("");
    if (!force) {
      const cached = takeWorkspaceHydration("gumroad");
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
        last = await authFetch("/api/gumroad/data");
        if (last.token && last.res.status !== 401) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 900));
      }
      const { res, data, token } = last || { res: new Response(null, { status: 401 }), data: {}, token: "" };
      if (!token || res.status === 401) {
        setSignedOut(true);
        setStoreData(null);
        postToDashboard({ type: "dimad-gumroad-status", connected: false });
        setError("Sign in to DIMAD, then connect Gumroad.");
        return;
      }
      cacheWorkspaceResponse("gumroad", data as Record<string, unknown>, res.ok, res.status);
      applyPayload(data as Record<string, unknown>);
    } catch {
      setError("Failed to fetch from Gumroad.");
    } finally {
      setLoading(false);
    }
  }

  async function startConnect() {
    setConnecting(true);
    setError("");
    try {
      const result = await startGumroadOAuth();
      if (!result.ok) {
        if (result.error === "login_required") {
          (window.top || window).location.assign("/login.html");
          return;
        }
        setError(explain(result.error, "Could not start Gumroad OAuth."));
        setConnecting(false);
      }
    } catch {
      setError("Could not start Gumroad OAuth.");
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Log out of this Gumroad account?")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/gumroad/data", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not disconnect Gumroad."));
        setLoading(false);
        return;
      }
      setStoreData(null);
      postToDashboard({ type: "dimad-gumroad-status", connected: false });
    } catch {
      setError("Could not disconnect Gumroad.");
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
      if (event.data?.type === "dimad-gumroad-connect") void startConnect();
      if (event.data?.type === "dimad-gumroad-refresh") void loadData(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-gumroad-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, storeData, error, flash, connecting, signedOut]);

  const connected = Boolean(storeData?.userId || storeData?.email || storeData?.name);

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {flash ? <div className={`dimad-int-banner ${flash.tone}`} role="status">{flash.text}</div> : null}
      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div className="dimad-int-brand gumroad" aria-hidden>
            G
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">Gumroad</p>
            <h2>{connected ? storeData!.name : "Digital sales"}</h2>
            {connected ? (
              <p className="dimad-int-meta">
                {[storeData!.email, storeData!.profileUrl].filter(Boolean).join(" · ") || "Connected creator"}
              </p>
            ) : (
              <p className="dimad-int-meta">Products, packs, and checkout</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <AccountBadge
              tone="shopify"
              label={storeData!.name || storeData!.email || "Gumroad"}
              hint="Viewing"
              monogram="G"
              onLogout={() => void disconnect()}
              logoutLabel="Log out Gumroad"
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
              ? "Sign in to DIMAD, then connect Gumroad."
              : "Authorize DIMAD to read your Gumroad profile, products, and sales."}
          </p>
          <button type="button" className="dimad-int-primary gumroad" disabled={connecting} onClick={() => void startConnect()}>
            {connecting ? "Connecting…" : "Connect Gumroad"}
          </button>
        </>
      ) : null}

      {connected && storeData ? (
        <>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Gross volume</div>
              <div className="v">{storeData.metrics.grossDisplay}</div>
              <div className="s">Recent sales</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Products</div>
              <div className="v">{storeData.metrics.productCount}</div>
              <div className="s">In catalog</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Sales</div>
              <div className="v">{storeData.metrics.saleCount}</div>
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
              <h3>Recent sales</h3>
              {storeData.sales.length ? (
                storeData.sales.slice(0, 4).map((sale) => (
                  <div className="dimad-int-row" key={sale.id}>
                    <span className="title">
                      {sale.productName} · {sale.email}
                    </span>
                    <b>
                      {sale.price.toFixed(2)} {sale.currency}
                    </b>
                  </div>
                ))
              ) : (
                <p className="dimad-int-empty">No sales synced yet.</p>
              )}
            </div>
          </div>

          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via Gumroad API v2
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
