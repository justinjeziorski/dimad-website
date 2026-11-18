"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useIframeCenteredOverlay } from "@/hooks/useIframeCenteredOverlay";
import type { UnifiedTransaction } from "@/lib/revenue/types";
import { money } from "@/lib/revenue/ledgerEngine";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

export type CategoryDetailSelection = {
  categoryTitle: string;
  categoryType: "REVENUE" | "EXPENSE";
  match: "category" | "source" | "kpi";
  sourceId?: string;
};

type Props = {
  categoryTitle: string;
  categoryType: "REVENUE" | "EXPENSE";
  transactions: UnifiedTransaction[];
  match?: "category" | "source" | "kpi";
  sourceId?: string;
  onClose: () => void;
  onConvertToGoal: (goalData: {
    title: string;
    targetValue: number;
    deadline: string;
    forecastGrowth: number;
    forecastMonths: number;
    categoryTitle: string;
    categoryType: "REVENUE" | "EXPENSE";
  }) => Promise<void> | void;
};

export default function CategoryDetailModal({
  categoryTitle,
  categoryType,
  transactions,
  match = "category",
  sourceId,
  onClose,
  onConvertToGoal
}: Props) {
  const overlayStyle = useIframeCenteredOverlay(true);
  const [forecastGrowth, setForecastGrowth] = useState(10);
  const [forecastDays, setForecastDays] = useState(180);
  const [customHorizonOpen, setCustomHorizonOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const horizonLabel = formatHorizonLabel(forecastDays);
  const forecastMonths = daysToMonths(forecastDays);
  const isPresetHorizon = PRESET_HORIZONS.some((p) => p.days === forecastDays);

  const filteredTx = useMemo(() => {
    const title = categoryTitle.toLowerCase();
    return transactions.filter((tx) => {
      if (tx.type !== categoryType && match !== "kpi") return false;
      if (match === "source") {
        return (
          tx.source === sourceId ||
          tx.platformLabel.toLowerCase() === title ||
          tx.source.replace(/_/g, " ").toLowerCase() === title
        );
      }
      if (match === "kpi") {
        if (title.startsWith("period ")) return true;
        if (
          title.includes("expense") ||
          title.includes("burn") ||
          title.includes("opex") ||
          title.includes("operating")
        ) {
          return tx.type === "EXPENSE";
        }
        if (title.includes("mrr") || title.includes("recurring revenue")) {
          return tx.type === "REVENUE" && tx.isRecurring;
        }
        if (title.includes("one-time") || title.includes("order")) {
          return tx.type === "REVENUE" && !tx.isRecurring;
        }
        if (
          title.includes("profit") ||
          title.includes("gross") ||
          title.includes("net revenue") ||
          title.includes("margin") ||
          title.includes("primary") ||
          title.includes("runway")
        ) {
          return tx.type === "REVENUE";
        }
        return true;
      }
      return (
        tx.category.toLowerCase() === title ||
        tx.platformLabel.toLowerCase() === title ||
        tx.source.toLowerCase() === title
      );
    });
  }, [transactions, categoryTitle, categoryType, match, sourceId]);

  const totalCurrent = filteredTx.reduce((sum, tx) => sum + tx.amount, 0);
  const projectedTotal = Math.round(totalCurrent * Math.pow(1 + forecastGrowth / 100, forecastMonths));

  async function handleCreateForecastGoal() {
    setSaving(true);
    setToast("");
    try {
      const monthsRounded = Math.max(1, Math.round(forecastMonths * 10) / 10);
      await onConvertToGoal({
        title: `Reach $${projectedTotal.toLocaleString()} in ${categoryTitle} (${horizonLabel} Forecast · ${forecastGrowth >= 0 ? "+" : ""}${forecastGrowth}% MoM)`,
        targetValue: projectedTotal,
        deadline: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        forecastGrowth,
        forecastMonths: monthsRounded,
        categoryTitle,
        categoryType
      });
      setToast("Opening New Goal…");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not open goal composer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      style={{
        ...overlayStyle,
        zIndex: 90,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "min(92%, 720px)",
          overflow: "auto",
          borderRadius: 16,
          background: SNAPSHOT_THEME.navy,
          border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
          padding: 20,
          color: SNAPSHOT_THEME.ink,
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace'
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            borderBottom: `1px solid ${SNAPSHOT_THEME.navyLine}`,
            paddingBottom: 14
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: SNAPSHOT_THEME.gold }}>{categoryTitle} Analytics</h3>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: SNAPSHOT_THEME.mute }}>
              Historical performance & interactive growth projection
            </p>
          </div>
          <button type="button" onClick={onClose} style={ghostBtn}>
            ✕ Close
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, margin: "18px 0" }}>
          <Metric label="Current Volume" value={money(totalCurrent)} />
          <Metric label="Transactions Logged" value={String(filteredTx.length)} />
          <Metric label={`Projected (${horizonLabel})`} value={money(projectedTotal)} gold />
        </div>

        <div
          style={{
            borderRadius: 12,
            background: "rgba(0,0,0,0.28)",
            border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
            padding: 14,
            marginBottom: 16
          }}
        >
          <h4 style={{ margin: "0 0 12px", fontSize: 12, color: SNAPSHOT_THEME.gold }}>Forecast Scenario Simulator</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: SNAPSHOT_THEME.mute, marginBottom: 6 }}>
                Monthly Growth Rate: {forecastGrowth}%
              </label>
              <input
                type="range"
                min={-10}
                max={50}
                value={forecastGrowth}
                onChange={(e) => setForecastGrowth(Number(e.target.value))}
                style={{ width: "100%", accentColor: SNAPSHOT_THEME.gold }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: SNAPSHOT_THEME.mute, marginTop: 4 }}>
                <span>-10% Conserv.</span>
                <span>+15% Base</span>
                <span>+50% Aggr.</span>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: 11, color: SNAPSHOT_THEME.mute, marginBottom: 6 }}>
                Time Horizon: {horizonLabel}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {PRESET_HORIZONS.map((p) => {
                  const on = forecastDays === p.days;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setForecastDays(p.days);
                        setCustomHorizonOpen(false);
                      }}
                      style={horizonBtn(on)}
                    >
                      {p.key}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCustomHorizonOpen((v) => !v)}
                  style={horizonBtn(!isPresetHorizon)}
                  aria-expanded={customHorizonOpen}
                  aria-haspopup="dialog"
                >
                  Custom
                </button>
              </div>

              {customHorizonOpen ? (
                <div
                  role="dialog"
                  aria-label="Custom time horizon"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 8,
                    zIndex: 20,
                    width: "min(280px, 78vw)",
                    padding: 12,
                    borderRadius: 12,
                    border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                    background: "#07101f",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.45)"
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: SNAPSHOT_THEME.mute,
                      marginBottom: 8
                    }}
                  >
                    Select timeframe
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {CUSTOM_HORIZONS.map((opt) => {
                      const on = forecastDays === opt.days;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setForecastDays(opt.days);
                            setCustomHorizonOpen(false);
                          }}
                          style={{
                            ...horizonBtn(on),
                            flex: "unset",
                            padding: "8px 6px",
                            fontSize: 11
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          style={{
            maxHeight: 160,
            overflowY: "auto",
            border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
            borderRadius: 12,
            marginBottom: 14
          }}
        >
          {filteredTx.slice(0, 40).map((tx) => (
            <div
              key={tx.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 12px",
                borderBottom: `1px solid rgba(255,255,255,0.04)`,
                fontSize: 11
              }}
            >
              <span style={{ color: SNAPSHOT_THEME.mute }}>
                {tx.date.slice(0, 10)} · {tx.merchantOrCustomer || tx.platformLabel}
              </span>
              <strong>{money(tx.amount)}</strong>
            </div>
          ))}
          {!filteredTx.length ? (
            <p style={{ margin: 0, padding: 12, color: SNAPSHOT_THEME.mute, fontSize: 12 }}>No matching transactions.</p>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            paddingTop: 12,
            borderTop: `1px solid ${SNAPSHOT_THEME.navyLine}`
          }}
        >
          <span style={{ fontSize: 11, color: toast ? SNAPSHOT_THEME.ok : SNAPSHOT_THEME.mute }}>
            {toast || "Target matches projected compounding growth rate."}
          </span>
          <button type="button" disabled={saving} onClick={() => void handleCreateForecastGoal()} style={primaryBtn}>
            {saving ? "Opening…" : "Create Forecast Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PRESET_HORIZONS = [
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "12M", days: 365 }
] as const;

const CUSTOM_HORIZONS = [
  { key: "1d", days: 1, label: "1 day" },
  { key: "14d", days: 14, label: "14 days" },
  { key: "21d", days: 21, label: "21 days" },
  { key: "1m", days: 30, label: "1 month" },
  { key: "3m", days: 90, label: "3 months" },
  { key: "4m", days: 120, label: "4 months" },
  { key: "6m", days: 180, label: "6 months" },
  { key: "9m", days: 270, label: "9 months" },
  { key: "12m", days: 365, label: "12 months" }
] as const;

function daysToMonths(days: number) {
  return days / 30.437;
}

function formatHorizonLabel(days: number) {
  if (days < 30) return `${days} Day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30.437);
  if (Math.abs(days - months * 30.437) < 2 || [30, 90, 120, 180, 270, 365].includes(days)) {
    const m =
      days === 30
        ? 1
        : days === 90
          ? 3
          : days === 120
            ? 4
            : days === 180
              ? 6
              : days === 270
                ? 9
                : days === 365
                  ? 12
                  : months;
    return `${m} Month${m === 1 ? "" : "s"}`;
  }
  return `${days} Days`;
}

function horizonBtn(active: boolean): CSSProperties {
  return {
    flex: 1,
    borderRadius: 8,
    border: `1px solid ${active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
    background: active ? SNAPSHOT_THEME.gold : "rgba(255,255,255,0.06)",
    color: active ? "#0A192F" : SNAPSHOT_THEME.ink,
    fontWeight: 700,
    fontSize: 11,
    padding: "8px 0",
    cursor: "pointer"
  };
}

function Metric({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
        padding: 12
      }}
    >
      <span style={{ fontSize: 10, color: SNAPSHOT_THEME.mute }}>{label}</span>
      <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 700, color: gold ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.ink }}>
        {value}
      </p>
    </div>
  );
}

const ghostBtn: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "rgba(255,255,255,0.06)",
  color: SNAPSHOT_THEME.ink,
  borderRadius: 10,
  padding: "7px 10px",
  fontSize: 11,
  cursor: "pointer"
};

const primaryBtn: CSSProperties = {
  border: 0,
  background: SNAPSHOT_THEME.gold,
  color: "#0A192F",
  borderRadius: 10,
  padding: "9px 14px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer"
};
