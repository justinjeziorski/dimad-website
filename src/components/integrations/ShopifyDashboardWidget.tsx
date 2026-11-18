"use client";

import { useEffect, useRef, useState } from "react";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import { authFetch } from "@/lib/auth/client";
import { authFetchWithRetry } from "@/lib/auth/authFetchRetry";
import { INTEGRATION_CARD_CSS } from "@/components/integrations/integration-card.css";
import { startShopifyOAuth } from "@/lib/auth/oauth-client";
import { cacheWorkspaceResponse } from "@/hooks/useWorkspaceHydration";
import type { ShopifyRangeKey, ShopifyStorePayload } from "@/lib/integrations/shopify/types";

type StoreData = ShopifyStorePayload & { ok?: boolean; connected?: boolean; error?: string };

const FLASH_MS = 2 * 60 * 1000;
const RANGES: Array<{ id: ShopifyRangeKey; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" }
];

function normalizeShop(raw: string) {
  let shop = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  if (!shop) return "";
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : "";
}

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

function readFlash() {
  try {
    const raw = sessionStorage.getItem("dimad_shopify_flash");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status?: string; reason?: string; at?: number };
    if (!parsed.at || Date.now() - parsed.at > FLASH_MS) return null;
    if (parsed.status === "connected") {
      return { tone: "ok" as const, text: "Shopify connected. Store metrics below are live." };
    }
    return {
      tone: "bad" as const,
      text: parsed.reason ? `Shopify connect failed (${parsed.reason}).` : "Shopify connect failed."
    };
  } catch {
    return null;
  }
}

function changeClass(percent: number | null) {
  if (percent == null || percent === 0) return "flat";
  return percent > 0 ? "up" : "down";
}

function formatChange(percent: number | null) {
  if (percent == null) return "n/a vs prior";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}% vs prior`;
}

export default function ShopifyDashboardWidget() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [shopInput, setShopInput] = useState("");
  const [range, setRange] = useState<ShopifyRangeKey>("month");
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  function applyPayload(data: Record<string, unknown>, fromCache = false) {
    setSignedOut(false);
    if (!data.connected || !data.shop) {
      setStoreData(null);
      postToDashboard({ type: "dimad-shopify-status", connected: false });
      if (data.error && !fromCache) setError(String(data.error));
      else if (!fromCache && new URLSearchParams(window.location.search).get("connected") === "1") {
        setError("Shopify authorized, but store credentials were not saved. Connect again.");
      }
      return;
    }
    if (data.error && !fromCache) setError(String(data.error));
    const payload = data as StoreData;
    setStoreData(payload);
    postToDashboard({
      type: "dimad-shopify-status",
      connected: true,
      shop: payload.shop.domain || payload.shop.name,
      orderCount: payload.period?.orderCount || payload.orders?.edges?.length || 0,
      productCount: payload.activeProductCount || payload.products?.edges?.length || 0,
      revenue: payload.period?.revenue?.amount || 0,
      currency: payload.shop.currencyCode || "USD"
    });
  }

  async function loadData(nextRange = range, force = false) {
    setError("");
    if (!force && nextRange === "week") {
      const cached = takeWorkspaceHydration("shopify");
      if (cached) {
        applyPayload(cached, true);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const { res, data, token } = await authFetchWithRetry(
        `/api/shopify/data?range=${encodeURIComponent(nextRange)}`
      );
      if (!token || res.status === 401) {
        setSignedOut(true);
        setStoreData(null);
        postToDashboard({ type: "dimad-shopify-status", connected: false });
        setError("Sign in to DIMAD, then refresh Shopify metrics.");
        return;
      }
      if (nextRange === "week") {
        cacheWorkspaceResponse("shopify", data as Record<string, unknown>, res.ok, res.status);
      }
      applyPayload(data as Record<string, unknown>);
    } catch {
      setError("Failed to fetch from Shopify.");
    } finally {
      setLoading(false);
    }
  }

  async function startConnect(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    const shop = normalizeShop(shopInput);
    if (!shop) {
      setError("Use a valid domain like mystore.myshopify.com.");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const result = await startShopifyOAuth(shop);
      if (!result.ok) {
        if (result.error === "login_required") {
          (window.top || window).location.assign("/login.html");
          return;
        }
        setError(result.error === "missing_shop" ? "Use a valid domain like mystore.myshopify.com." : String(result.error || "Could not start Shopify connect."));
        setConnecting(false);
      }
    } catch {
      setError("Could not start Shopify connect.");
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Log out of this Shopify store? DIMAD will stop reading its metrics.")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/shopify/data", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(String(data.error || "Could not disconnect Shopify."));
        setLoading(false);
        return;
      }
      setStoreData(null);
      postToDashboard({ type: "dimad-shopify-status", connected: false });
    } catch {
      setError("Could not disconnect Shopify.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setFlash(readFlash());
    void loadData(range);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-shopify-connect") {
        document.getElementById("shopify-widget-shop")?.focus();
      }
      if (event.data?.type === "dimad-shopify-refresh") void loadData(range, true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [range]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-shopify-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, storeData, error, flash, connecting, signedOut, range]);

  const connected = Boolean(storeData?.shop);
  const period = storeData?.period;

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {flash ? <div className={`dimad-int-banner ${flash.tone}`} role="status">{flash.text}</div> : null}
      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div className="dimad-int-brand shopify" aria-hidden>
            S
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">Shopify</p>
            <h2>{connected ? storeData!.shop.name : "Storefront"}</h2>
            {connected ? (
              <p className="dimad-int-meta">
                {storeData!.shop.currencyCode}
                {storeData!.shop.domain ? ` · ${storeData!.shop.domain}` : ""}
              </p>
            ) : (
              <p className="dimad-int-meta">Sync live store revenue, orders, and products</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <AccountBadge
              tone="shopify"
              label={storeData!.shop.email || storeData!.shop.domain || storeData!.shop.name}
              hint="Viewing"
              onLogout={() => void disconnect()}
              logoutLabel="Log out store"
            />
          </div>
        ) : null}
      </div>

      {loading && !connected ? <IntegrationLoadingBar tone="amber" /> : null}

      {!loading && !connected ? (
        <>
          <p className="dimad-int-note">
            {signedOut
              ? "Sign in to DIMAD, then connect your Shopify store."
              : "Enter your myshopify domain to authorize read access for products and orders."}
          </p>
          <form className="dimad-int-form" onSubmit={(event) => void startConnect(event)}>
            <input
              id="shopify-widget-shop"
              value={shopInput}
              onChange={(event) => setShopInput(event.target.value)}
              placeholder="your-store.myshopify.com"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="dimad-int-amber" disabled={connecting}>
              {connecting ? "Connecting…" : "Connect"}
            </button>
          </form>
        </>
      ) : null}

      {connected && storeData && period ? (
        <>
          <div className="dimad-int-pills" role="tablist" aria-label="Shopify timeframe">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`dimad-int-pill ${range === item.id ? "active" : ""}`}
                disabled={loading}
                onClick={() => {
                  setRange(item.id);
                  void loadData(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Revenue · {period.label}</div>
              <div className="v">{period.revenue.display}</div>
              <div className={`dimad-int-change ${changeClass(period.changes.netSales.percent)}`}>
                {formatChange(period.changes.netSales.percent)}
              </div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Orders</div>
              <div className="v">{period.orderCount}</div>
              <div className={`dimad-int-change ${changeClass(period.changes.orderCount.percent)}`}>
                {formatChange(period.changes.orderCount.percent)}
              </div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">{storeData.lowStockCount > 0 ? "Low stock" : "Active products"}</div>
              <div className="v">{storeData.lowStockCount > 0 ? storeData.lowStockCount : storeData.activeProductCount}</div>
              <div className="s">
                {storeData.lowStockCount > 0
                  ? `${storeData.activeProductCount} active in catalog`
                  : "Catalog pulse"}
              </div>
            </div>
          </div>

          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via Shopify Admin API
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
