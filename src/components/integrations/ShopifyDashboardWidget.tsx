"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch, waitForFirebaseToken } from "@/lib/dimad-auth-client";
import { INTEGRATION_CARD_CSS } from "@/lib/integration-card.css";
import type { ShopifyStorePayload } from "@/lib/shopify-types";

type StoreData = ShopifyStorePayload & { ok?: boolean; connected?: boolean; error?: string };

const FLASH_MS = 2 * 60 * 1000;

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

export default function ShopifyDashboardWidget() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [shopInput, setShopInput] = useState("");
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      let last: { res: Response; data: Record<string, unknown>; token: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        last = await authFetch("/api/shopify/data");
        if (last.token && last.res.status !== 401) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 900));
      }
      const { res, data, token } = last || { res: new Response(null, { status: 401 }), data: {}, token: "" };
      if (!token || res.status === 401) {
        setSignedOut(true);
        setStoreData(null);
        postToDashboard({ type: "dimad-shopify-status", connected: false });
        setError("Sign in to DIMAD, then refresh Shopify metrics.");
        return;
      }
      setSignedOut(false);
      if (!data.connected || !data.shop) {
        setStoreData(null);
        postToDashboard({ type: "dimad-shopify-status", connected: false });
        if (data.error) setError(String(data.error));
        else if (new URLSearchParams(window.location.search).get("connected") === "1") {
          setError("Shopify authorized, but store credentials were not saved. Connect again.");
        }
        return;
      }
      if (data.error) setError(String(data.error));
      const payload = data as StoreData;
      setStoreData(payload);
      postToDashboard({
        type: "dimad-shopify-status",
        connected: true,
        shop: payload.shop.domain || payload.shop.name,
        orderCount: payload.orders?.edges?.length || 0,
        productCount: payload.products?.edges?.length || 0,
        revenue: (payload.orders?.edges || []).reduce(
          (sum, edge) => sum + Number(edge.node?.totalPriceSet?.shopMoney?.amount || 0),
          0
        ),
        currency: payload.shop.currencyCode || "USD"
      });
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
      const token = await waitForFirebaseToken(4000);
      if (!token) {
        (window.top || window).location.assign("/login.html");
        return;
      }
      (window.top || window).location.assign(
        `/api/auth/shopify?shop=${encodeURIComponent(shop)}&id_token=${encodeURIComponent(token)}`
      );
    } catch {
      setError("Could not start Shopify connect.");
      setConnecting(false);
    }
  }

  useEffect(() => {
    setFlash(readFlash());
    void loadData();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-shopify-connect") {
        document.getElementById("shopify-widget-shop")?.focus();
      }
      if (event.data?.type === "dimad-shopify-refresh") void loadData();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
  }, [loading, storeData, error, flash, connecting, signedOut]);

  const connected = Boolean(storeData?.shop);
  const productCount = storeData?.products?.edges?.length || 0;
  const orderCount = storeData?.orders?.edges?.length || 0;

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {flash ? <div className={`dimad-int-banner ${flash.tone}`} role="status">{flash.text}</div> : null}
      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div className="dimad-int-brand shopify" aria-hidden>S</div>
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">Shopify</p>
            <h2>{connected ? storeData!.shop.name : "Storefront"}</h2>
            {connected ? (
              <p className="dimad-int-meta">
                {storeData!.shop.domain}
                {storeData!.shop.email ? ` · ${storeData!.shop.email}` : ""}
              </p>
            ) : (
              <p className="dimad-int-meta">Sync live store revenue, orders, and products</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadData()}>
              Refresh
            </button>
          </div>
        ) : null}
      </div>

      {loading && !connected ? <p className="dimad-int-note">Syncing Shopify metrics…</p> : null}

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
          <button
            type="button"
            className="dimad-int-ghost"
            style={{ marginTop: 10 }}
            onClick={() => postToDashboard({ type: "dimad-shopify-lemon" })}
          >
            Lemon Squeezy
          </button>
        </>
      ) : null}

      {connected && storeData ? (
        <>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Currency</div>
              <div className="v">{storeData.shop.currencyCode}</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Catalog items</div>
              <div className="v">{productCount}+</div>
              <div className="s">Recent products</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Recent orders</div>
              <div className="v">{orderCount}</div>
              <div className="s">Latest fulfillment queue</div>
            </div>
          </div>

          <div className="dimad-int-grid">
            <div className="dimad-int-col">
              <h3>Recent products</h3>
              {storeData.products.edges.length ? (
                storeData.products.edges.map(({ node }) => (
                  <div className="dimad-int-row" key={node.id}>
                    <span className="title">{node.title}</span>
                    <span className="meta">Stock: {node.totalInventory ?? "—"}</span>
                  </div>
                ))
              ) : (
                <p className="dimad-int-empty">No products yet on this store.</p>
              )}
            </div>
            <div className="dimad-int-col">
              <h3>Recent orders</h3>
              {storeData.orders.edges.length ? (
                storeData.orders.edges.map(({ node }) => (
                  <div className="dimad-int-row" key={node.id}>
                    <span className="title">{node.name}</span>
                    <b>
                      {node.totalPriceSet.shopMoney.amount} {node.totalPriceSet.shopMoney.currencyCode}
                    </b>
                  </div>
                ))
              ) : (
                <p className="dimad-int-empty">No orders yet on this test store.</p>
              )}
            </div>
          </div>

          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via Shopify Admin API
            </span>
            <button
              type="button"
              className="dimad-int-link"
              onClick={() => postToDashboard({ type: "dimad-open-sales" })}
            >
              View in Sales & Revenue →
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
