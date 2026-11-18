"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import TimeRangeSelector from "@/components/shared/TimeRangeSelector";
import type {
  FinanceGrouping,
  FinancePrimaryMetric
} from "@/lib/finances/types";
import type { ComparisonMode, LedgerSource, ViewMode } from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";
import type { CustomDateRange, DimadTimeframe } from "@/lib/utils/timeframeFilter";

const SOURCE_OPTIONS: { id: LedgerSource; label: string }[] = [
  { id: "stripe", label: "Stripe" },
  { id: "shopify", label: "Shopify" },
  { id: "gumroad", label: "Gumroad" },
  { id: "patreon", label: "Patreon" },
  { id: "lemon_squeezy", label: "Lemon Squeezy" },
  { id: "plaid", label: "Plaid" },
  { id: "manual", label: "Manual" }
];

const METRIC_OPTIONS: { id: FinancePrimaryMetric; label: string }[] = [
  { id: "gross_revenue", label: "Gross Revenue" },
  { id: "net_profit", label: "Net Profit" },
  { id: "operating_expenses", label: "Operating Expenses" },
  { id: "burn_rate", label: "Burn Rate" },
  { id: "runway", label: "Runway" }
];

const GROUP_OPTIONS: { id: FinanceGrouping; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" }
];

type Props = {
  timeframe: DimadTimeframe;
  customRange: CustomDateRange;
  onTimeframeChange: (tf: DimadTimeframe) => void;
  onCustomRangeChange: (range: CustomDateRange) => void;
  sources: Set<LedgerSource>;
  onToggleSource: (source: LedgerSource) => void;
  connectedSources: Set<LedgerSource>;
  compare: ComparisonMode;
  onCompareChange: (mode: ComparisonMode) => void;
  primaryMetric: FinancePrimaryMetric;
  onPrimaryMetricChange: (m: FinancePrimaryMetric) => void;
  grouping: FinanceGrouping;
  onGroupingChange: (g: FinanceGrouping) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  varianceBadge?: { label: string; pct: number | null } | null;
};

export default function FinanceFilters(props: Props) {
  const {
    timeframe,
    customRange,
    onTimeframeChange,
    onCustomRangeChange,
    sources,
    onToggleSource,
    connectedSources,
    compare,
    onCompareChange,
    primaryMetric,
    onPrimaryMetricChange,
    grouping,
    onGroupingChange,
    viewMode,
    onViewModeChange,
    varianceBadge
  } = props;

  const [channelsOpen, setChannelsOpen] = useState(false);
  const channelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!channelsRef.current?.contains(event.target as Node)) setChannelsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const connectedCount = SOURCE_OPTIONS.filter((s) => connectedSources.has(s.id)).length;
  const activeCount = SOURCE_OPTIONS.filter(
    (s) => connectedSources.has(s.id) && sources.has(s.id)
  ).length;

  return (
    <div style={wrap}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div style={sectionLabel}>Time range</div>
          <TimeRangeSelector
            value={timeframe}
            customRange={customRange}
            onChange={onTimeframeChange}
            onCustomRangeChange={onCustomRangeChange}
            compact
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={sectionLabel}>Compare</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              type="button"
              onClick={() => onCompareChange("prior_month")}
              style={pill(compare === "prior_month")}
            >
              vs Prior Month
            </button>
            <button
              type="button"
              onClick={() => onCompareChange("prior_year")}
              style={pill(compare === "prior_year")}
            >
              vs Prior Year
            </button>
          </div>
        </div>

        <div ref={channelsRef} style={{ position: "relative", minWidth: 160 }}>
          <div style={sectionLabel}>Channels</div>
          <button
            type="button"
            onClick={() => setChannelsOpen((v) => !v)}
            style={{
              ...select,
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8
            }}
            aria-expanded={channelsOpen}
            aria-haspopup="listbox"
          >
            <span>
              {activeCount}/{connectedCount} active
            </span>
            <span style={{ color: SNAPSHOT_THEME.mute }}>{channelsOpen ? "▴" : "▾"}</span>
          </button>
          {channelsOpen ? (
            <div role="listbox" style={dropdown}>
              {SOURCE_OPTIONS.map((s) => {
                const connected = connectedSources.has(s.id);
                const on = connected && sources.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={!connected}
                    onClick={() => {
                      if (!connected) return;
                      onToggleSource(s.id);
                    }}
                    style={{
                      ...dropdownItem,
                      opacity: connected ? 1 : 0.38,
                      cursor: connected ? "pointer" : "not-allowed",
                      color: !connected
                        ? SNAPSHOT_THEME.mute
                        : on
                          ? SNAPSHOT_THEME.gold
                          : SNAPSHOT_THEME.ink,
                      background: on ? SNAPSHOT_THEME.goldSoft : "transparent"
                    }}
                    title={connected ? s.label : `${s.label} — not connected`}
                  >
                    <span
                      aria-hidden
                      style={{
                        ...checkBox,
                        border: `1px solid ${
                          !connected
                            ? SNAPSHOT_THEME.mute
                            : on
                              ? SNAPSHOT_THEME.gold
                              : SNAPSHOT_THEME.navyLine
                        }`,
                        background: on ? SNAPSHOT_THEME.gold : "transparent",
                        color: on ? "#0A192F" : "transparent"
                      }}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span style={{ flex: 1 }}>{s.label}</span>
                    {!connected ? (
                      <span style={{ fontSize: 10, color: SNAPSHOT_THEME.mute }}>Not connected</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {varianceBadge ? (
          <div style={badgeWrap}>
            <span style={badgeLabel}>{varianceBadge.label}</span>
            <span
              style={{
                ...badgePct,
                color:
                  varianceBadge.pct == null
                    ? SNAPSHOT_THEME.mute
                    : varianceBadge.pct >= 0
                      ? SNAPSHOT_THEME.ok
                      : SNAPSHOT_THEME.danger
              }}
            >
              {varianceBadge.pct == null
                ? "—"
                : `${varianceBadge.pct >= 0 ? "+" : ""}${varianceBadge.pct.toFixed(1)}%`}
            </span>
          </div>
        ) : null}
      </div>

      <div style={row}>
        <label style={field}>
          <span style={sectionLabel}>Primary metric</span>
          <select
            value={primaryMetric}
            onChange={(e) => onPrimaryMetricChange(e.target.value as FinancePrimaryMetric)}
            style={select}
          >
            {METRIC_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={field}>
          <span style={sectionLabel}>Grouping</span>
          <select
            value={grouping}
            onChange={(e) => onGroupingChange(e.target.value as FinanceGrouping)}
            style={select}
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={field}>
          <span style={sectionLabel}>View</span>
          <select
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value as ViewMode)}
            style={select}
          >
            <option value="consolidated">Consolidated</option>
            <option value="per_channel">Channel-by-channel</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function pill(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
    background: active ? SNAPSHOT_THEME.goldSoft : "transparent",
    color: active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.mute,
    borderRadius: 999,
    padding: "6px 11px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };
}

const wrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: "14px 16px",
  borderRadius: 14,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "linear-gradient(165deg, rgba(17,34,64,0.9) 0%, rgba(10,25,47,0.95) 100%)"
};

const row: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12
};

const field: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 140
};

const sectionLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.mute,
  marginBottom: 2
};

const select: CSSProperties = {
  background: "#07101f",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  color: SNAPSHOT_THEME.ink,
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontFamily: "inherit"
};

const dropdown: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 6,
  zIndex: 30,
  borderRadius: 12,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "#07101f",
  boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2
};

const dropdownItem: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: 10,
  width: "100%",
  textAlign: "left",
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  fontFamily: "inherit",
  fontWeight: 600
};

const checkBox: CSSProperties = {
  flex: "0 0 auto",
  width: 16,
  height: 16,
  borderRadius: 4,
  display: "grid",
  placeItems: "center",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1
};

const badgeWrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 2,
  padding: "8px 12px",
  borderRadius: 12,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "rgba(7,16,31,0.55)",
  minWidth: 140
};

const badgeLabel: CSSProperties = {
  fontSize: 10,
  color: SNAPSHOT_THEME.mute,
  letterSpacing: "0.06em",
  textTransform: "uppercase"
};

const badgePct: CSSProperties = {
  fontSize: 18,
  fontWeight: 800
};
