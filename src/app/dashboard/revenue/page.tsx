"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { authFetch } from "@/lib/dimad-auth-client";
import {
  downloadCsv,
  extractRevenueSources,
  money,
  shopifyRangeParam,
  type RevenueSourceId
} from "@/lib/snapshot-aggregate";
import { SNAPSHOT_THEME, type SnapshotRange } from "@/lib/snapshot-theme";

const PLATFORMS: { id: RevenueSourceId; label: string }[] = [
  { id: "stripe", label: "Stripe" },
  { id: "lemon", label: "Lemon Squeezy" },
  { id: "gumroad", label: "Gumroad" },
  { id: "patreon", label: "Patreon" },
  { id: "shopify", label: "Shopify" }
];

export default function RevenueWorkspacePage() {
  const [range, setRange] = useState<SnapshotRange>("1M");
  const [selected, setSelected] = useState<RevenueSourceId[]>(PLATFORMS.map((p) => p.id));
  const [payloads, setPayloads] = useState<Partial<Record<RevenueSourceId, Record<string, unknown>>>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextRange: SnapshotRange) => {
    setLoading(true);
    const endpoints: Record<RevenueSourceId, string> = {
      stripe: "/api/integrations/stripe/metrics",
      lemon: "/api/lemonsqueezy/data",
      gumroad: "/api/gumroad/data",
      patreon: "/api/patreon/data",
      shopify: `/api/shopify/data?range=${encodeURIComponent(shopifyRangeParam(nextRange))}`
    };
    const next: Partial<Record<RevenueSourceId, Record<string, unknown>>> = {};
    await Promise.all(
      PLATFORMS.map(async ({ id }) => {
        try {
          const { data } = await authFetch(endpoints[id]);
          next[id] = data as Record<string, unknown>;
        } catch {
          next[id] = { connected: false };
        }
      })
    );
    setPayloads(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  const sources = useMemo(() => extractRevenueSources(payloads, range), [payloads, range]);
  const visible = sources.filter((s) => selected.includes(s.id as RevenueSourceId));
  const total = visible.reduce((sum, s) => sum + (s.connected ? s.amount : 0), 0);

  function toggle(id: RevenueSourceId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function exportCsv() {
    downloadCsv("dimad-revenue-report.csv", [
      ["Platform", "Connected", "Amount", "Detail", "Range"],
      ...visible.map((s) => [s.label, s.connected ? "yes" : "no", String(s.amount), s.detail || "", range]),
      ["TOTAL", "", String(total), "Gross commerce volume (excludes Plaid)", range]
    ]);
  }

  function exportSummary() {
    const lines = [
      "DIMAD Revenue Summary",
      `Generated: ${new Date().toISOString()}`,
      `Range: ${range}`,
      "",
      `Consolidated volume: ${money(total)}`,
      "Note: Plaid bank balances and expenses are excluded from gross revenue.",
      "",
      ...visible.map((s) => `${s.label}: ${s.display}${s.detail ? ` (${s.detail})` : ""}`)
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dimad-revenue-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell
      kicker="Finance"
      title="Revenue workspace"
      subtitle="Filter commerce platforms, inspect contribution, and export accounting-ready reports. Bank liquidity stays in Finance & Expenses."
      actions={
        <>
          <button type="button" onClick={exportCsv} style={btnStyle}>
            Export CSV
          </button>
          <button type="button" onClick={exportSummary} style={btnStyle}>
            Summary report
          </button>
        </>
      }
    >
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={labelStyle}>Consolidated volume</p>
            <div style={{ fontSize: 34, fontWeight: 700 }}>{loading ? "…" : money(total)}</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {(["1D", "1W", "1M", "1Q", "1Y"] as SnapshotRange[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                style={{
                  ...pillStyle,
                  background: range === item ? SNAPSHOT_THEME.goldSoft : "transparent",
                  color: range === item ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.mute
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: 14 }}>
        <p style={labelStyle}>Platform filters</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PLATFORMS.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                style={{
                  ...pillStyle,
                  borderColor: on ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine,
                  color: on ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.mute,
                  background: on ? SNAPSHOT_THEME.goldSoft : "transparent"
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: 14 }}>
        <p style={labelStyle}>Contribution table</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: SNAPSHOT_THEME.mute, textAlign: "left" }}>
                <th style={thStyle}>Platform</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} style={{ borderTop: `1px solid ${SNAPSHOT_THEME.navyLine}` }}>
                  <td style={tdStyle}>{s.label}</td>
                  <td style={tdStyle}>{s.connected ? "Connected" : "Not connected"}</td>
                  <td style={tdStyle}>{s.display}</td>
                  <td style={tdStyle}>{s.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
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

const pillStyle: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  background: "transparent",
  color: SNAPSHOT_THEME.mute
};

const btnStyle: CSSProperties = {
  ...pillStyle,
  color: SNAPSHOT_THEME.gold,
  borderColor: SNAPSHOT_THEME.gold
};

const thStyle: CSSProperties = { padding: "8px 6px", fontWeight: 600 };
const tdStyle: CSSProperties = { padding: "10px 6px", color: SNAPSHOT_THEME.ink };
