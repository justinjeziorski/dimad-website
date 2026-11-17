"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { authFetch } from "@/lib/dimad-auth-client";
import {
  compactNumber,
  downloadCsv,
  extractGrowthSources,
  extractRevenueSources,
  money,
  type GrowthSourceId
} from "@/lib/snapshot-aggregate";
import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";

export default function GrowthWorkspacePage() {
  const [growth, setGrowth] = useState<Partial<Record<GrowthSourceId, Record<string, unknown>>>>({});
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const gKeys: GrowthSourceId[] = ["youtube", "x", "mailerlite"];
    const gEndpoints: Record<GrowthSourceId, string> = {
      youtube: "/api/youtube/data",
      x: "/api/x/data",
      mailerlite: "/api/mailerlite/data"
    };
    const nextG: Partial<Record<GrowthSourceId, Record<string, unknown>>> = {};
    await Promise.all(
      gKeys.map(async (key) => {
        try {
          const { data } = await authFetch(gEndpoints[key]);
          nextG[key] = data as Record<string, unknown>;
        } catch {
          nextG[key] = { connected: false };
        }
      })
    );
    setGrowth(nextG);

    try {
      const [stripe, lemon, gumroad, patreon, shopify] = await Promise.all([
        authFetch("/api/integrations/stripe/metrics"),
        authFetch("/api/lemonsqueezy/data"),
        authFetch("/api/gumroad/data"),
        authFetch("/api/patreon/data"),
        authFetch("/api/shopify/data?range=month")
      ]);
      const sources = extractRevenueSources(
        {
          stripe: stripe.data as Record<string, unknown>,
          lemon: lemon.data as Record<string, unknown>,
          gumroad: gumroad.data as Record<string, unknown>,
          patreon: patreon.data as Record<string, unknown>,
          shopify: shopify.data as Record<string, unknown>
        },
        "1M"
      );
      setRevenueTotal(sources.reduce((sum, s) => sum + (s.connected ? s.amount : 0), 0));
    } catch {
      setRevenueTotal(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sources = useMemo(() => extractGrowthSources(growth), [growth]);
  const audience = sources.reduce((sum, s) => sum + (s.connected ? s.amount : 0), 0);
  const yt = growth.youtube;
  const x = growth.x;
  const ml = growth.mailerlite;

  function exportLeads() {
    downloadCsv("dimad-growth-leads.csv", [
      ["Platform", "Metric", "Value"],
      ["YouTube", "Subscribers", String(yt?.subscriberCount || 0)],
      ["YouTube", "Views", String(yt?.viewCount || 0)],
      ["X", "Followers", String(x?.followersCount || 0)],
      ["MailerLite", "Subscribers", String((ml?.metrics as { subscriberCount?: number } | undefined)?.subscriberCount || 0)],
      ["MailerLite", "Avg open rate", String((ml?.metrics as { avgOpenDisplay?: string } | undefined)?.avgOpenDisplay || "")],
      ["Funnel", "Audience total", String(audience)],
      ["Funnel", "Revenue (1M commerce)", String(revenueTotal)]
    ]);
  }

  return (
    <DashboardShell
      kicker="Acquisition"
      title="Growth workspace"
      subtitle="Audience analytics across YouTube, X, and MailerLite — correlated with commerce volume for funnel context."
      actions={
        <button type="button" onClick={exportLeads} style={btnStyle}>
          Export lead report
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Metric label="Total audience" value={loading ? "…" : compactNumber(audience)} />
        <Metric label="Commerce volume (1M)" value={loading ? "…" : money(revenueTotal)} hint="Excludes Plaid" />
        <Metric
          label="Mail open rate"
          value={String((ml?.metrics as { avgOpenDisplay?: string } | undefined)?.avgOpenDisplay || "—")}
        />
      </div>

      <section style={{ ...panelStyle, marginTop: 14 }}>
        <p style={labelStyle}>Platform analytics</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <PlatformCard
            title="YouTube"
            rows={[
              ["Subscribers", compactNumber(Number(yt?.subscriberCount || 0))],
              ["Views", compactNumber(Number(yt?.viewCount || 0))],
              ["Videos", compactNumber(Number(yt?.videoCount || 0))]
            ]}
            connected={Boolean(yt?.connected)}
          />
          <PlatformCard
            title="X"
            rows={[
              ["Followers", compactNumber(Number(x?.followersCount || 0))],
              ["Following", compactNumber(Number(x?.followingCount || 0))],
              [
                "Recent impressions",
                compactNumber(
                  ((x?.recentTweets as { impressionCount?: number }[] | undefined) || []).reduce(
                    (sum, t) => sum + Number(t.impressionCount || 0),
                    0
                  )
                )
              ]
            ]}
            connected={Boolean(x?.connected)}
          />
          <PlatformCard
            title="MailerLite"
            rows={[
              [
                "Subscribers",
                compactNumber(Number((ml?.metrics as { subscriberCount?: number } | undefined)?.subscriberCount || 0))
              ],
              ["Avg open", String((ml?.metrics as { avgOpenDisplay?: string } | undefined)?.avgOpenDisplay || "—")],
              ["Avg click", String((ml?.metrics as { avgClickDisplay?: string } | undefined)?.avgClickDisplay || "—")]
            ]}
            connected={Boolean(ml?.connected)}
          />
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: 14 }}>
        <p style={labelStyle}>Funnel correlation</p>
        <p style={{ margin: 0, color: SNAPSHOT_THEME.mute, fontSize: 12, lineHeight: 1.55 }}>
          Audience reach <b style={{ color: SNAPSHOT_THEME.ink }}>{compactNumber(audience)}</b> alongside period
          commerce volume <b style={{ color: SNAPSHOT_THEME.ink }}>{money(revenueTotal)}</b>. Use exports for lead-gen
          reporting; revenue detail lives in the Revenue workspace.
        </p>
      </section>
    </DashboardShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{label}</p>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      {hint ? <p style={{ margin: "6px 0 0", fontSize: 10, color: SNAPSHOT_THEME.mute }}>{hint}</p> : null}
    </div>
  );
}

function PlatformCard({
  title,
  rows,
  connected
}: {
  title: string;
  rows: [string, string][];
  connected: boolean;
}) {
  return (
    <div style={{ border: `1px solid ${SNAPSHOT_THEME.navyLine}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <strong>{title}</strong>
        <span style={{ color: connected ? SNAPSHOT_THEME.ok : SNAPSHOT_THEME.mute, fontSize: 10 }}>
          {connected ? "Connected" : "Offline"}
        </span>
      </div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
          <span style={{ color: SNAPSHOT_THEME.mute }}>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: "rgba(17, 34, 64, 0.72)",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 16,
  padding: 18
};

const labelStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold
};

const btnStyle: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.gold}`,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  background: "transparent",
  color: SNAPSHOT_THEME.gold
};
