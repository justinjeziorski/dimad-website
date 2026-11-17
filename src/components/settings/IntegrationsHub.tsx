"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { authFetch, waitForFirebaseToken } from "@/lib/dimad-auth-client";
import {
  startGumroadOAuth,
  startShopifyOAuth,
  startStripeOAuth,
  startXOauth,
  startYoutubeOAuth
} from "@/lib/oauth-client";
import { isLocalHost, plaidAppOrigin, writePlaidLinkToken } from "@/lib/plaid-client";
import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";

type AuthMode = "oauth" | "shopify" | "api-key" | "plaid";

type IntegrationDef = {
  id: string;
  label: string;
  hint: string;
  group: "Revenue" | "Growth" | "Finance";
  mode: AuthMode;
  logo: string;
  logoColor: string;
  statusUrl: string;
  disconnectUrl: string;
  disconnectMethod?: "DELETE";
  helpSteps?: { title: string; detail: string }[];
};

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "stripe",
    label: "Stripe",
    hint: "Payments & MRR",
    group: "Revenue",
    mode: "oauth",
    logo: "https://cdn.simpleicons.org/stripe/635BFF",
    logoColor: "#635BFF",
    statusUrl: "/api/integrations/stripe/metrics",
    disconnectUrl: "/api/integrations/stripe/metrics"
  },
  {
    id: "shopify",
    label: "Shopify",
    hint: "Storefront sales",
    group: "Revenue",
    mode: "shopify",
    logo: "https://cdn.simpleicons.org/shopify/96BF48",
    logoColor: "#96BF48",
    statusUrl: "/api/shopify/data?range=week",
    disconnectUrl: "/api/shopify/data"
  },
  {
    id: "lemon",
    label: "Lemon Squeezy",
    hint: "Digital products",
    group: "Revenue",
    mode: "api-key",
    logo: "https://cdn.simpleicons.org/lemonsqueezy/FFC233",
    logoColor: "#FFC233",
    statusUrl: "/api/lemonsqueezy/data",
    disconnectUrl: "/api/lemonsqueezy/connect",
    helpSteps: [
      {
        title: "Log into Lemon Squeezy",
        detail: "Open the Lemon Squeezy Dashboard and sign in to your merchant account."
      },
      {
        title: "Find your Store ID",
        detail:
          "In the browser URL, the number after /dashboard/ is your Store ID (e.g. app.lemonsqueezy.com/dashboard/12345)."
      },
      {
        title: "Generate an API key",
        detail: "Go to Settings → API → Create API Key. Label it Dimad Integration, then copy the token."
      },
      {
        title: "Connect in DIMAD",
        detail: "Paste your Store ID and API key below, then click Connect."
      }
    ]
  },
  {
    id: "gumroad",
    label: "Gumroad",
    hint: "Creator commerce",
    group: "Revenue",
    mode: "oauth",
    logo: "https://cdn.simpleicons.org/gumroad/FF90E8",
    logoColor: "#FF90E8",
    statusUrl: "/api/gumroad/data",
    disconnectUrl: "/api/gumroad/data"
  },
  {
    id: "patreon",
    label: "Patreon",
    hint: "Memberships",
    group: "Revenue",
    mode: "oauth",
    logo: "https://cdn.simpleicons.org/patreon/FF424D",
    logoColor: "#FF424D",
    statusUrl: "/api/patreon/data",
    disconnectUrl: "/api/patreon/data"
  },
  {
    id: "youtube",
    label: "YouTube",
    hint: "Audience & views",
    group: "Growth",
    mode: "oauth",
    logo: "https://cdn.simpleicons.org/youtube/FF0000",
    logoColor: "#FF0000",
    statusUrl: "/api/youtube/data",
    disconnectUrl: "/api/youtube/data"
  },
  {
    id: "x",
    label: "X",
    hint: "Followers & reach",
    group: "Growth",
    mode: "oauth",
    logo: "https://cdn.simpleicons.org/x/FFFFFF",
    logoColor: "#E2E8F0",
    statusUrl: "/api/x/data",
    disconnectUrl: "/api/x/data"
  },
  {
    id: "mailerlite",
    label: "MailerLite",
    hint: "List health",
    group: "Growth",
    mode: "api-key",
    logo: "https://cdn.simpleicons.org/mailerlite/09C269",
    logoColor: "#09C269",
    statusUrl: "/api/mailerlite/data",
    disconnectUrl: "/api/mailerlite/connect",
    helpSteps: [
      {
        title: "Open Integrations",
        detail: "Log into MailerLite and click Integrations in the left sidebar."
      },
      {
        title: "Open API tokens",
        detail: "Click Use next to API, then Generate new token."
      },
      {
        title: "Create the Dimad token",
        detail: "Name it Dimad, create the token, and copy it immediately (shown once)."
      },
      {
        title: "Connect in DIMAD",
        detail: "Paste the token below and click Connect."
      }
    ]
  },
  {
    id: "plaid",
    label: "Plaid",
    hint: "Expenses & liquidity (excluded from revenue)",
    group: "Finance",
    mode: "plaid",
    logo: "https://cdn.simpleicons.org/plaid/00B4FF",
    logoColor: "#00B4FF",
    statusUrl: "/api/plaid/data",
    disconnectUrl: "/api/plaid/data"
  }
];

const GROUPS = ["Revenue", "Growth", "Finance"] as const;

type StatusMap = Record<string, { connected: boolean; label?: string }>;

function postResize(height: number) {
  if (window.parent === window) return;
  window.parent.postMessage(
    { type: "dimad-integrations-hub-resize", height },
    window.location.origin
  );
}

export default function IntegrationsHub() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<StatusMap>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [helpId, setHelpId] = useState("");
  const [expandId, setExpandId] = useState("");
  const [shopInput, setShopInput] = useState("");
  const [lemonStoreId, setLemonStoreId] = useState("");
  const [lemonApiKey, setLemonApiKey] = useState("");
  const [mailerToken, setMailerToken] = useState("");
  const helpPanelId = useId();

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    const next: StatusMap = {};
    await Promise.all(
      INTEGRATIONS.map(async (item) => {
        try {
          const { data, res } = await authFetch(item.statusUrl);
          const connected = Boolean(data.connected) && res.ok;
          let label = "";
          if (item.id === "stripe") label = String(data.accountLabel || "");
          if (item.id === "shopify") label = String(data.shop || data.shopName || "");
          if (item.id === "lemon") label = String(data.storeName || data.storeId || "");
          if (item.id === "gumroad") label = String(data.name || data.email || "");
          if (item.id === "patreon") label = String(data.campaignName || "");
          if (item.id === "youtube") label = String(data.channelTitle || "");
          if (item.id === "x") label = String(data.username ? `@${data.username}` : "");
          if (item.id === "mailerlite") label = String(data.accountLabel || "");
          if (item.id === "plaid") label = String(data.institutionName || "");
          next[item.id] = { connected, label };
        } catch {
          next[item.id] = { connected: false };
        }
      })
    );
    setStatus(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (
        event.data?.type === "dimad-patreon-oauth-done" ||
        event.data?.type === "dimad-plaid-refresh" ||
        event.data?.type === "dimad-shopify-refresh"
      ) {
        void refreshStatus();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refreshStatus]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const publish = () => postResize(Math.ceil(node.getBoundingClientRect().height) + 8);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, status, helpId, expandId, error]);

  async function connectOauth(item: IntegrationDef) {
    setBusyId(item.id);
    setError("");
    try {
      if (item.id === "stripe") {
        const result = await startStripeOAuth();
        if (!result.ok) setError(result.error === "login_required" ? "Sign in first." : "Could not start Stripe Connect.");
        return;
      }
      if (item.id === "gumroad") {
        const result = await startGumroadOAuth();
        if (!result.ok) setError(result.error === "login_required" ? "Sign in first." : "Could not start Gumroad OAuth.");
        return;
      }
      if (item.id === "youtube") {
        const result = await startYoutubeOAuth();
        if (!result.ok) setError(result.error === "login_required" ? "Sign in first." : "Could not start YouTube OAuth.");
        return;
      }
      if (item.id === "x") {
        const result = await startXOauth();
        if (!result.ok) setError(result.error === "login_required" ? "Sign in first." : "Could not start X OAuth.");
        return;
      }
      if (item.id === "patreon") {
        const popup = window.open("about:blank", "patreon_oauth", "popup=yes,width=620,height=760");
        const { res, data, token } = await authFetch("/api/auth/patreon?format=json");
        if (!token || res.status === 401) {
          (window.top || window).location.assign("/login.html");
          return;
        }
        const url = String(data.url || data.authorizeUrl || "");
        if (!res.ok || !url) {
          setError(String(data.error || "Could not start Patreon OAuth."));
          popup?.close();
          return;
        }
        if (popup) popup.location.href = url;
        else (window.top || window).location.assign(url);
        return;
      }
    } catch {
      setError(`Could not connect ${item.label}.`);
    } finally {
      setBusyId("");
    }
  }

  async function connectShopify() {
    setBusyId("shopify");
    setError("");
    try {
      const result = await startShopifyOAuth(shopInput);
      if (!result.ok) {
        setError(
          result.error === "missing_shop"
            ? "Enter your myshopify.com store domain."
            : result.error === "login_required"
              ? "Sign in first."
              : "Could not start Shopify OAuth."
        );
      }
    } catch {
      setError("Could not start Shopify OAuth.");
    } finally {
      setBusyId("");
    }
  }

  async function connectLemon() {
    setBusyId("lemon");
    setError("");
    const storeId = lemonStoreId.trim();
    const apiKey = lemonApiKey.trim();
    if (!storeId || !/^\d+$/.test(storeId)) {
      setError("Use your numeric Lemon Squeezy store ID.");
      setBusyId("");
      return;
    }
    if (!apiKey || apiKey.length < 12) {
      setError("Paste a Lemon Squeezy API key from Settings → API.");
      setBusyId("");
      return;
    }
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
        setError(String(data.error || "Could not connect Lemon Squeezy."));
        return;
      }
      setExpandId("");
      setLemonApiKey("");
      await refreshStatus();
    } catch {
      setError("Could not connect Lemon Squeezy.");
    } finally {
      setBusyId("");
    }
  }

  async function connectMailerLite() {
    setBusyId("mailerlite");
    setError("");
    const apiToken = mailerToken.trim();
    if (!apiToken || apiToken.length < 12) {
      setError("Paste a MailerLite API token.");
      setBusyId("");
      return;
    }
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
        setError(String(data.error || "Could not connect MailerLite."));
        return;
      }
      setExpandId("");
      setMailerToken("");
      await refreshStatus();
    } catch {
      setError("Could not connect MailerLite.");
    } finally {
      setBusyId("");
    }
  }

  async function connectPlaid() {
    setBusyId("plaid");
    setError("");
    try {
      const idToken = await waitForFirebaseToken(8000);
      if (!idToken) {
        setError("Sign in first.");
        return;
      }
      const { res, data, token } = await authFetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!token || res.status === 401) {
        (window.top || window).location.assign("/login.html");
        return;
      }
      const linkToken = String(data.link_token || "");
      if (!res.ok || !linkToken) {
        setError(String(data.error || "Could not start Plaid Link."));
        return;
      }
      writePlaidLinkToken(linkToken);
      const origin = isLocalHost(window.location.hostname) ? plaidAppOrigin() : window.location.origin;
      const connectUrl =
        `${origin}/integrations/plaid-connect` +
        `?link_token=${encodeURIComponent(linkToken)}&id_token=${encodeURIComponent(idToken)}`;
      const topWin = window.top || window;
      const popup = topWin.open(connectUrl, "dimad_plaid_link", "popup=yes,width=520,height=780");
      if (!popup) topWin.location.assign(connectUrl);
    } catch {
      setError("Could not start Plaid Link.");
    } finally {
      setBusyId("");
    }
  }

  async function disconnect(item: IntegrationDef) {
    if (!window.confirm(`Disconnect ${item.label} from Dimad?`)) return;
    setBusyId(item.id);
    setError("");
    try {
      const { res, data } = await authFetch(item.disconnectUrl, { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(String(data.error || `Could not disconnect ${item.label}.`));
        return;
      }
      await refreshStatus();
    } catch {
      setError(`Could not disconnect ${item.label}.`);
    } finally {
      setBusyId("");
    }
  }

  function onConnectClick(item: IntegrationDef) {
    setError("");
    if (item.mode === "oauth") {
      void connectOauth(item);
      return;
    }
    if (item.mode === "plaid") {
      void connectPlaid();
      return;
    }
    setExpandId((prev) => (prev === item.id ? "" : item.id));
    setHelpId("");
  }

  return (
    <div
      ref={rootRef}
      style={{
        color: SNAPSHOT_THEME.ink,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace'
      }}
    >
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: SNAPSHOT_THEME.gold }}>
        Settings & Vault
      </p>
      <h1 style={{ margin: "8px 0 6px", fontSize: 24, fontWeight: 700 }}>Integrations</h1>
      <p style={{ margin: "0 0 18px", color: SNAPSHOT_THEME.mute, fontSize: 12, maxWidth: 560, lineHeight: 1.5 }}>
        Connect commerce and audience platforms. Revenue snapshots never include Plaid bank balances.
      </p>

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(229,115,115,0.35)",
            background: "rgba(229,115,115,0.08)",
            color: "#F5B7B1",
            fontSize: 12
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        {GROUPS.map((group) => (
          <section
            key={group}
            style={{
              background: "rgba(17, 34, 64, 0.72)",
              border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
              borderRadius: 16,
              padding: 16
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: SNAPSHOT_THEME.gold
              }}
            >
              {group}
            </h2>
            <div style={{ display: "grid", gap: 8 }}>
              {INTEGRATIONS.filter((item) => item.group === group).map((item) => {
                const row = status[item.id];
                const connected = Boolean(row?.connected);
                const busy = busyId === item.id;
                const expanded = expandId === item.id;
                const helpOpen = helpId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      background: "rgba(7, 16, 31, 0.35)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ display: "block", fontSize: 13 }}>{item.label}</strong>
                          {item.helpSteps ? (
                            <button
                              type="button"
                              title="How to find your API credentials"
                              aria-expanded={helpOpen}
                              aria-controls={`${helpPanelId}-${item.id}`}
                              onClick={() => setHelpId((prev) => (prev === item.id ? "" : item.id))}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                                background: "transparent",
                                color: SNAPSHOT_THEME.mute,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                lineHeight: 1,
                                padding: 0
                              }}
                            >
                              ?
                            </button>
                          ) : null}
                        </div>
                        <span style={{ color: SNAPSHOT_THEME.mute, fontSize: 11 }}>
                          {connected && row?.label ? row.label : item.hint}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {loading ? (
                          <span style={{ color: SNAPSHOT_THEME.mute, fontSize: 11 }}>…</span>
                        ) : connected ? (
                          <>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                color: SNAPSHOT_THEME.ok,
                                fontSize: 11,
                                fontWeight: 700
                              }}
                            >
                              <span aria-hidden>✓</span> Connected
                            </span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void disconnect(item)}
                              style={{
                                border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                                background: "transparent",
                                color: SNAPSHOT_THEME.mute,
                                borderRadius: 999,
                                padding: "7px 12px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              {busy ? "…" : "Disconnect"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onConnectClick(item)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              border: `1px solid ${item.logoColor}55`,
                              background: `${item.logoColor}18`,
                              color: SNAPSHOT_THEME.ink,
                              borderRadius: 999,
                              padding: "7px 12px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.logo} alt="" width={14} height={14} style={{ display: "block" }} />
                            {busy ? "Connecting…" : `Connect ${item.label}`}
                          </button>
                        )}
                      </div>
                    </div>

                    {helpOpen && item.helpSteps ? (
                      <div
                        id={`${helpPanelId}-${item.id}`}
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 10,
                          border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                          background: "rgba(7,16,31,0.65)",
                          display: "grid",
                          gap: 10
                        }}
                      >
                        {item.helpSteps.map((step, index) => (
                          <div key={step.title} style={{ display: "flex", gap: 10 }}>
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                background: SNAPSHOT_THEME.goldSoft,
                                color: SNAPSHOT_THEME.gold,
                                fontSize: 10,
                                fontWeight: 700,
                                display: "inline-grid",
                                placeItems: "center",
                                flexShrink: 0
                              }}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: SNAPSHOT_THEME.ink }}>
                                {step.title}
                              </p>
                              <p style={{ margin: "3px 0 0", fontSize: 11, color: SNAPSHOT_THEME.mute, lineHeight: 1.45 }}>
                                {step.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {!connected && expanded && item.mode === "shopify" ? (
                      <form
                        style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void connectShopify();
                        }}
                      >
                        <input
                          value={shopInput}
                          onChange={(event) => setShopInput(event.target.value)}
                          placeholder="your-store.myshopify.com"
                          autoComplete="off"
                          style={inputStyle}
                        />
                        <button type="submit" disabled={busy} style={primaryBtnStyle(item.logoColor)}>
                          {busy ? "Connecting…" : "Continue to Shopify"}
                        </button>
                      </form>
                    ) : null}

                    {!connected && expanded && item.id === "lemon" ? (
                      <form
                        style={{ marginTop: 12, display: "grid", gap: 8 }}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void connectLemon();
                        }}
                      >
                        <input
                          value={lemonStoreId}
                          onChange={(event) => setLemonStoreId(event.target.value)}
                          placeholder="Store ID (e.g. 12345)"
                          autoComplete="off"
                          style={inputStyle}
                        />
                        <input
                          value={lemonApiKey}
                          onChange={(event) => setLemonApiKey(event.target.value)}
                          placeholder="API key"
                          type="password"
                          autoComplete="off"
                          style={inputStyle}
                        />
                        <button type="submit" disabled={busy} style={{ ...primaryBtnStyle(item.logoColor), width: "fit-content" }}>
                          {busy ? "Connecting…" : "Connect Lemon Squeezy"}
                        </button>
                      </form>
                    ) : null}

                    {!connected && expanded && item.id === "mailerlite" ? (
                      <form
                        style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void connectMailerLite();
                        }}
                      >
                        <input
                          value={mailerToken}
                          onChange={(event) => setMailerToken(event.target.value)}
                          placeholder="MailerLite API token"
                          type="password"
                          autoComplete="off"
                          style={{ ...inputStyle, minWidth: 220, flex: 1 }}
                        />
                        <button type="submit" disabled={busy} style={primaryBtnStyle(item.logoColor)}>
                          {busy ? "Connecting…" : "Connect MailerLite"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "#070A0F",
  color: SNAPSHOT_THEME.ink,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 10,
  padding: "9px 11px",
  fontSize: 12,
  fontFamily: "inherit",
  minWidth: 200,
  flex: 1
};

function primaryBtnStyle(color: string): CSSProperties {
  return {
    border: `1px solid ${color}55`,
    background: `${color}22`,
    color: SNAPSHOT_THEME.ink,
    borderRadius: 999,
    padding: "9px 14px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit"
  };
}
