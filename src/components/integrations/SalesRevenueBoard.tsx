"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/dimad-auth-client";
import { INTEGRATION_CARD_CSS } from "@/lib/integration-card.css";
import type { ShopifyStorePayload } from "@/lib/shopify-types";
import type { StripeConnectedMetrics } from "@/lib/stripe-types";

type ShopifyData = ShopifyStorePayload & { ok?: boolean; connected?: boolean; error?: string };
type StripeData = StripeConnectedMetrics & { ok?: boolean; connected?: boolean; error?: string };

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

export default function SalesRevenueBoard() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [stripe, setStripe] = useState<StripeData | null>(null);
  const [shopify, setShopify] = useState<ShopifyData | null>(null);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [stripeRes, shopifyRes] = await Promise.all([
        authFetch("/api/integrations/stripe/metrics"),
        authFetch("/api/shopify/data")
      ]);

      if (stripeRes.res.status === 401 && shopifyRes.res.status === 401) {
        setError("Sign in to load Stripe and Shopify revenue.");
        setStripe(null);
        setShopify(null);
        return;
      }

      if (stripeRes.data?.ok && stripeRes.data.connected) {
        setStripe(stripeRes.data as StripeData);
        postToDashboard({ type: "dimad-stripe-status", connected: true, display: stripeRes.data.display });
      } else {
        setStripe(null);
        postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
      }

      if (shopifyRes.data?.connected && shopifyRes.data.shop) {
        const payload = shopifyRes.data as ShopifyData;
        setShopify(payload);
        if (payload.error) setError(String(payload.error));
        const revenue = (payload.orders?.edges || []).reduce(
          (sum, edge) => sum + Number(edge.node?.totalPriceSet?.shopMoney?.amount || 0),
          0
        );
        postToDashboard({
          type: "dimad-shopify-status",
          connected: true,
          shop: payload.shop.domain || payload.shop.name,
          orderCount: payload.orders?.edges?.length || 0,
          productCount: payload.products?.edges?.length || 0,
          revenue,
          currency: payload.shop.currencyCode || "USD"
        });
      } else {
        setShopify(null);
        postToDashboard({ type: "dimad-shopify-status", connected: false });
        if (shopifyRes.data?.error) setError(String(shopifyRes.data.error));
      }
    } catch {
      setError("Could not load sales telemetry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-sales-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, stripe, shopify, error]);

  const shopifyOrders = shopify?.orders?.edges || [];
  const shopifyRevenue = shopifyOrders.reduce(
    (sum, edge) => sum + Number(edge.node?.totalPriceSet?.shopMoney?.amount || 0),
    0
  );
  const currency = shopify?.shop?.currencyCode || "USD";

  return (
    <section ref={rootRef} className="sales-board" style={{ display: "grid", gap: 12 }}>
      <style>{`
        ${INTEGRATION_CARD_CSS}
        .sales-board { font-family: "JetBrains Mono", ui-monospace, monospace; color: #f8fafc; }
        .sales-section-title {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #F59E0B;
          font-weight: 700;
        }
        .sales-section-copy { margin: 0 0 12px; font-size: 11px; color: #94a3b8; }
      `}</style>

      {error ? <div className="dimad-int-banner bad">{error}</div> : null}

      <div className="dimad-int-card">
        <div className="dimad-int-head">
          <div>
            <p className="sales-section-title">Stripe Financials</p>
            <p className="sales-section-copy">Live Connect metrics for balance, gross, and MRR</p>
          </div>
          <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadAll()}>
            Refresh
          </button>
        </div>

        {loading && !stripe ? <p className="dimad-int-note">Loading Stripe…</p> : null}
        {!loading && !stripe ? (
          <div className="dimad-int-banner bad" style={{ marginTop: 8 }}>
            No Stripe account connected yet.{" "}
            <button type="button" className="dimad-int-link" onClick={() => postToDashboard({ type: "dimad-open-command" })}>
              Connect in Command Center →
            </button>
          </div>
        ) : null}

        {stripe ? (
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Stripe MRR</div>
              <div className="v">{stripe.display.mrr}</div>
              <div className="s">
                {stripe.activeSubscriptions}
                {stripe.subscriptionsCapped ? "+" : ""} active
              </div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">30-day gross</div>
              <div className="v">{stripe.display.gross30d}</div>
              <div className="s">{stripe.successfulCount} successful charges</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Available</div>
              <div className="v">{stripe.display.available}</div>
              <div className="s">Pending {stripe.display.pending}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="dimad-int-card">
        <div className="dimad-int-head">
          <div>
            <p className="sales-section-title">Shopify Store Performance</p>
            <p className="sales-section-copy">Live e-commerce telemetry from your connected storefront</p>
          </div>
          {shopify?.shop ? <span className="dimad-int-badge">{shopify.shop.name}</span> : null}
        </div>

        {loading && !shopify ? <p className="dimad-int-note">Loading store analytics…</p> : null}

        {!loading && !shopify ? (
          <div className="dimad-int-banner bad" style={{ marginTop: 8 }}>
            No Shopify store is connected yet.{" "}
            <button type="button" className="dimad-int-link" onClick={() => postToDashboard({ type: "dimad-open-command" })}>
              Connect store in Command Center →
            </button>
          </div>
        ) : null}

        {shopify ? (
          <div className="space-y-4">
            <div className="dimad-int-metrics">
              <div className="dimad-int-metric">
                <div className="k">Store revenue (recent)</div>
                <div className="v">
                  {shopifyRevenue.toFixed(2)} {currency}
                </div>
                <div className="s">From latest orders</div>
              </div>
              <div className="dimad-int-metric">
                <div className="k">Total orders</div>
                <div className="v">{shopifyOrders.length}</div>
                <div className="s">Active fulfillment queue</div>
              </div>
              <div className="dimad-int-metric">
                <div className="k">Catalog items</div>
                <div className="v">{shopify.products?.edges?.length || 0}</div>
                <div className="s">Synced products</div>
              </div>
            </div>

            <div className="dimad-int-grid">
              <div className="dimad-int-col">
                <h3>Catalog inventory</h3>
                <table className="dimad-int-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Status</th>
                      <th className="right">Inventory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(shopify.products?.edges || []).map(({ node }) => (
                      <tr key={node.id}>
                        <td className="strong">{node.title}</td>
                        <td>{node.status}</td>
                        <td className="right strong">{node.totalInventory ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!shopify.products?.edges?.length ? <p className="dimad-int-empty">No products synced.</p> : null}
              </div>
              <div className="dimad-int-col">
                <h3>Recent transactions</h3>
                <table className="dimad-int-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Payment</th>
                      <th className="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopifyOrders.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                          No orders logged yet.
                        </td>
                      </tr>
                    ) : (
                      shopifyOrders.map(({ node }) => (
                        <tr key={node.id}>
                          <td className="strong">{node.name}</td>
                          <td className="mint">{node.displayFinancialStatus || "—"}</td>
                          <td className="right strong">
                            {node.totalPriceSet?.shopMoney?.amount} {node.totalPriceSet?.shopMoney?.currencyCode}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
