"use client";

import { useEffect, useRef, useState } from "react";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { authFetch } from "@/lib/dimad-auth-client";
import { INTEGRATION_CARD_CSS } from "@/lib/integration-card.css";
import { startShopifyOAuth, startStripeOAuth } from "@/lib/oauth-client";
import type { ShopifyRangeKey, ShopifyStorePayload } from "@/lib/shopify-types";
import type { StripeConnectedMetrics } from "@/lib/stripe-types";

type ShopifyData = ShopifyStorePayload & { ok?: boolean; connected?: boolean; error?: string };
type StripeData = StripeConnectedMetrics & { ok?: boolean; connected?: boolean; error?: string };

const RANGES: Array<{ id: ShopifyRangeKey; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "custom", label: "Custom" }
];

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

function normalizeShop(raw: string) {
  let shop = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  if (!shop) return "";
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : "";
}

function changeClass(percent: number | null | undefined) {
  if (percent == null || percent === 0) return "flat";
  return percent > 0 ? "up" : "down";
}

function formatChange(percent: number | null | undefined) {
  if (percent == null) return "n/a vs prior";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}% vs prior`;
}

export default function SalesRevenueBoard() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [shopifyConnecting, setShopifyConnecting] = useState(false);
  const [shopInput, setShopInput] = useState("");
  const [range, setRange] = useState<ShopifyRangeKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [stripe, setStripe] = useState<StripeData | null>(null);
  const [shopify, setShopify] = useState<ShopifyData | null>(null);
  const [error, setError] = useState("");

  async function loadAll(nextRange = range, from = customFrom, to = customTo) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range: nextRange });
      if (nextRange === "custom") {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }
      const [stripeRes, shopifyRes] = await Promise.all([
        authFetch("/api/integrations/stripe/metrics"),
        authFetch(`/api/shopify/data?${params.toString()}`)
      ]);

      if (stripeRes.res.status === 401) {
        setStripe(null);
        postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
      } else if (stripeRes.data?.ok && stripeRes.data.connected) {
        setStripe(stripeRes.data as StripeData);
        postToDashboard({ type: "dimad-stripe-status", connected: true, display: stripeRes.data.display });
      } else {
        setStripe(null);
        postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
      }

      if (shopifyRes.res.status === 401) {
        setShopify(null);
        postToDashboard({ type: "dimad-shopify-status", connected: false });
      } else if (shopifyRes.data?.connected && shopifyRes.data.shop) {
        const payload = shopifyRes.data as ShopifyData;
        setShopify(payload);
        if (payload.error) setError(String(payload.error));
        postToDashboard({
          type: "dimad-shopify-status",
          connected: true,
          shop: payload.shop.domain || payload.shop.name,
          orderCount: payload.period?.orderCount || 0,
          productCount: payload.activeProductCount || 0,
          revenue: payload.period?.revenue?.amount || 0,
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

  async function connectStripe() {
    setStripeConnecting(true);
    setError("");
    try {
      const result = await startStripeOAuth();
      if (!result.ok) {
        if (result.error === "login_required") {
          (window.top || window).location.assign("/login.html");
          return;
        }
        setError(String(result.error || "Could not start Stripe Connect."));
        setStripeConnecting(false);
      }
    } catch {
      setError("Could not start Stripe Connect.");
      setStripeConnecting(false);
    }
  }

  async function connectShopify(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    const shop = normalizeShop(shopInput);
    if (!shop) {
      setError("Use a valid domain like mystore.myshopify.com.");
      return;
    }
    setShopifyConnecting(true);
    setError("");
    try {
      const result = await startShopifyOAuth(shop);
      if (!result.ok) {
        if (result.error === "login_required") {
          (window.top || window).location.assign("/login.html");
          return;
        }
        setError(result.error === "missing_shop" ? "Use a valid domain like mystore.myshopify.com." : String(result.error || "Could not start Shopify connect."));
        setShopifyConnecting(false);
      }
    } catch {
      setError("Could not start Shopify connect.");
      setShopifyConnecting(false);
    }
  }

  async function disconnectStripe() {
    if (!window.confirm("Log out of this Stripe account?")) return;
    setLoading(true);
    try {
      const { res, data } = await authFetch("/api/integrations/stripe/metrics", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(String(data.error || "Could not disconnect Stripe."));
        return;
      }
      setStripe(null);
      postToDashboard({ type: "dimad-stripe-status", connected: false, display: null });
    } catch {
      setError("Could not disconnect Stripe.");
    } finally {
      setLoading(false);
    }
  }

  async function disconnectShopify() {
    if (!window.confirm("Log out of this Shopify store?")) return;
    setLoading(true);
    try {
      const { res, data } = await authFetch("/api/shopify/data", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(String(data.error || "Could not disconnect Shopify."));
        return;
      }
      setShopify(null);
      postToDashboard({ type: "dimad-shopify-status", connected: false });
    } catch {
      setError("Could not disconnect Shopify.");
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
  }, [loading, stripe, shopify, error, range, customFrom, customTo]);

  const period = shopify?.period;
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

      {(stripe || shopify) && (
        <div className="dimad-int-card">
          <p className="sales-section-title">Business cash flow</p>
          <p className="sales-section-copy">Stripe recurring revenue beside Shopify store sales for the selected window</p>
          <div className="dimad-int-metrics four">
            <div className="dimad-int-metric">
              <div className="k">Stripe MRR</div>
              <div className="v">{stripe?.display.mrr || "—"}</div>
              <div className="s">
                {stripe
                  ? `${stripe.activeSubscriptions}${stripe.subscriptionsCapped ? "+" : ""} subscriptions`
                  : "Not connected"}
              </div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Stripe available</div>
              <div className="v">{stripe?.display.available || "—"}</div>
              <div className="s">Pending {stripe?.display.pending || "—"}</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Shopify net sales</div>
              <div className="v">{period?.netSales.display || "—"}</div>
              <div className={`dimad-int-change ${changeClass(period?.changes.netSales.percent)}`}>
                {period ? formatChange(period.changes.netSales.percent) : "Connect a store"}
              </div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Shopify gross</div>
              <div className="v">{period?.grossSales.display || "—"}</div>
              <div className="s">{period ? `${period.orderCount} orders · ${currency}` : "—"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="dimad-int-card">
        <div className="dimad-int-head">
          <div>
            <p className="sales-section-title">Stripe Financials</p>
            <p className="sales-section-copy">Live Connect metrics for balance, gross, and MRR</p>
          </div>
          <div className="dimad-int-actions">
            {stripe ? (
              <AccountBadge
                tone="stripe"
                label={stripe.accountLabel}
                hint={stripe.livemode ? "Live account" : "Test account"}
                monogram="$"
                onLogout={() => void disconnectStripe()}
              />
            ) : null}
            <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadAll()}>
              Refresh
            </button>
          </div>
        </div>

        {loading && !stripe ? <IntegrationLoadingBar tone="stripe" /> : null}

        {!loading && !stripe ? (
          <>
            <p className="dimad-int-note">Connect Stripe here to pull live balance, charges, and subscription MRR.</p>
            <button type="button" className="dimad-int-primary" disabled={stripeConnecting} onClick={() => void connectStripe()}>
              {stripeConnecting ? "Connecting…" : "Connect with Stripe"}
            </button>
          </>
        ) : null}

        {stripe ? (
          <div className="dimad-int-metrics" style={{ marginTop: 12 }}>
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
            <p className="sales-section-copy">Deep-dive e-commerce telemetry from your connected storefront</p>
          </div>
          {shopify?.shop ? (
            <AccountBadge
              tone="shopify"
              label={shopify.shop.email || shopify.shop.domain || shopify.shop.name}
              hint="Viewing store"
              onLogout={() => void disconnectShopify()}
              logoutLabel="Log out store"
            />
          ) : null}
        </div>

        {loading && !shopify ? <IntegrationLoadingBar tone="amber" /> : null}

        {!loading && !shopify ? (
          <>
            <p className="dimad-int-note">Connect Shopify here — no need to leave Revenue.</p>
            <form className="dimad-int-form" onSubmit={(event) => void connectShopify(event)}>
              <input
                value={shopInput}
                onChange={(event) => setShopInput(event.target.value)}
                placeholder="your-store.myshopify.com"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="dimad-int-amber" disabled={shopifyConnecting}>
                {shopifyConnecting ? "Connecting…" : "Connect Shopify"}
              </button>
            </form>
          </>
        ) : null}

        {shopify && period ? (
          <div style={{ marginTop: 4 }}>
            <div className="dimad-int-pills" role="tablist" aria-label="Shopify date range">
              {RANGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`dimad-int-pill ${range === item.id ? "active" : ""}`}
                  disabled={loading}
                  onClick={() => {
                    setRange(item.id);
                    if (item.id !== "custom") void loadAll(item.id);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {range === "custom" ? (
              <div className="dimad-int-dates">
                <label>
                  From
                  <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
                </label>
                <label>
                  To
                  <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
                </label>
                <button
                  type="button"
                  className="dimad-int-ghost"
                  disabled={loading || !customFrom || !customTo}
                  onClick={() => void loadAll("custom", customFrom, customTo)}
                >
                  Apply
                </button>
              </div>
            ) : null}

            <div className="dimad-int-metrics four" style={{ marginTop: 12 }}>
              <div className="dimad-int-metric">
                <div className="k">Gross sales</div>
                <div className="v">{period.grossSales.display}</div>
                <div className={`dimad-int-change ${changeClass(period.changes.grossSales.percent)}`}>
                  {formatChange(period.changes.grossSales.percent)}
                </div>
              </div>
              <div className="dimad-int-metric">
                <div className="k">Net sales</div>
                <div className="v">{period.netSales.display}</div>
                <div className={`dimad-int-change ${changeClass(period.changes.netSales.percent)}`}>
                  {formatChange(period.changes.netSales.percent)}
                </div>
              </div>
              <div className="dimad-int-metric">
                <div className="k">Discounts</div>
                <div className="v">{period.discounts.display}</div>
                <div className="s">Refunds {period.refunds.display}</div>
              </div>
              <div className="dimad-int-metric">
                <div className="k">AOV</div>
                <div className="v">{period.aov.display}</div>
                <div className="s">{period.orderCount} orders</div>
              </div>
            </div>

            <div className="dimad-int-metrics" style={{ marginTop: 8 }}>
              <div className="dimad-int-metric">
                <div className="k">Fulfilled</div>
                <div className="v">{period.fulfillment.fulfilled}</div>
              </div>
              <div className="dimad-int-metric">
                <div className="k">Unfulfilled</div>
                <div className="v">{period.fulfillment.unfulfilled}</div>
              </div>
              <div className="dimad-int-metric">
                <div className="k">Processing</div>
                <div className="v">{period.fulfillment.processing}</div>
              </div>
            </div>

            <div className="dimad-int-grid">
              <div className="dimad-int-col">
                <h3>Top products</h3>
                <table className="dimad-int-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="right">Units</th>
                      <th className="right">Gross</th>
                      <th className="right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(shopify.topProducts || []).map((node) => (
                      <tr key={node.id}>
                        <td className="strong">{node.title}</td>
                        <td className="right">{node.unitsSold ?? 0}</td>
                        <td className="right strong">
                          {Number(node.grossSales || 0).toFixed(2)} {currency}
                        </td>
                        <td className="right">{node.totalInventory ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!shopify.topProducts?.length ? <p className="dimad-int-empty">No product sales in this window.</p> : null}
              </div>

              <div className="dimad-int-col">
                <h3>Customers & traffic</h3>
                <div className="dimad-int-metrics" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="dimad-int-metric">
                    <div className="k">New</div>
                    <div className="v">{period.customers.newCount}</div>
                    <div className="s">{(period.customers.newShare * 100).toFixed(0)}%</div>
                  </div>
                  <div className="dimad-int-metric">
                    <div className="k">Returning</div>
                    <div className="v">{period.customers.returningCount}</div>
                    <div className="s">{(period.customers.returningShare * 100).toFixed(0)}%</div>
                  </div>
                  <div className="dimad-int-metric">
                    <div className="k">Sessions</div>
                    <div className="v">{period.traffic.sessions == null ? "—" : period.traffic.sessions}</div>
                    <div className="s">Storefront visits</div>
                  </div>
                  <div className="dimad-int-metric">
                    <div className="k">Conversion</div>
                    <div className="v">
                      {period.traffic.conversionRate == null
                        ? "—"
                        : `${(period.traffic.conversionRate * (period.traffic.conversionRate <= 1 ? 100 : 1)).toFixed(2)}%`}
                    </div>
                    <div className="s">Analytics when available</div>
                  </div>
                </div>
                {period.traffic.topReferrers?.length ? (
                  <div style={{ marginTop: 10 }}>
                    {period.traffic.topReferrers.map((row) => (
                      <div className="dimad-int-row" key={row.source}>
                        <span className="title">{row.source}</span>
                        <span className="meta">{row.sessions} sessions</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dimad-int-empty">Referrer breakdown appears when Shopify analytics grants access.</p>
                )}
              </div>
            </div>

            <div className="dimad-int-col" style={{ marginTop: 14 }}>
              <h3>Recent transactions</h3>
              <table className="dimad-int-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Payment</th>
                    <th>Fulfillment</th>
                    <th className="right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(shopify.orders?.edges || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                        No orders in this window.
                      </td>
                    </tr>
                  ) : (
                    shopify.orders.edges.map(({ node }) => (
                      <tr key={node.id}>
                        <td className="strong">{node.name}</td>
                        <td className="mint">{node.displayFinancialStatus || "—"}</td>
                        <td>{node.displayFulfillmentStatus || "—"}</td>
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
        ) : null}
      </div>
    </section>
  );
}
