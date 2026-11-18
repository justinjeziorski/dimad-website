"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  buildChartBuckets,
  buildYTicks,
  calculatePeriodDelta,
  type ChartBucket,
  formatAxisMoney,
  formatPct
} from "@/lib/revenue/financialMath";
import { exportRevenueWorkbook } from "@/lib/revenue/exportExcel";
import { channelBreakdown, computeKpis, formatDelta, money } from "@/lib/revenue/ledgerEngine";
import type { LedgerSource, UnifiedTransaction } from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";
import type { CustomDateRange, DimadTimeframe } from "@/lib/utils/timeframeFilter";
import TimeRangeSelector from "@/components/shared/TimeRangeSelector";

const CHART = {
  navy: "#0A192F",
  panel: "#0B1E3B",
  gold: "#D4AF37",
  expense: "#E06D73",
  ink: "#FFFFFF",
  mute: "#8BA0B8",
  line: "rgba(255,255,255,0.10)",
  lineStrong: "rgba(255,255,255,0.18)"
} as const;

const SOURCE_ORDER: LedgerSource[] = [
  "stripe",
  "shopify",
  "gumroad",
  "patreon",
  "lemon_squeezy",
  "manual",
  "plaid"
];
const SOURCE_COLORS: Partial<Record<LedgerSource, string>> = {
  stripe: "#635BFF",
  shopify: "#96BF48",
  gumroad: "#FF90E8",
  patreon: "#FF424D",
  lemon_squeezy: "#FFC233",
  manual: "#D4AF37",
  plaid: "#E06D73"
};

export type ChartMetricMode = "absolute" | "margin" | "mrr_split";
export type ChartLayoutMode = "consolidated" | "stacked";

type Props = {
  transactions: UnifiedTransaction[];
  sources: Set<LedgerSource>;
  timeframe: DimadTimeframe;
  customRange: CustomDateRange;
  onTimeframeChange: (timeframe: DimadTimeframe) => void;
  onCustomRangeChange: (range: CustomDateRange) => void;
  /** When true, hide the shared timeframe bar (parent already shows it). */
  hideTimeframe?: boolean;
  onDrillPeriod: (opts: { title: string; from: string; to: string; transactions: UnifiedTransaction[] }) => void;
  onSimulateForecast: () => void;
};

export default function RevenueExpenseChart({
  transactions,
  sources,
  timeframe,
  customRange,
  onTimeframeChange,
  onCustomRangeChange,
  hideTimeframe = false,
  onDrillPeriod,
  onSimulateForecast
}: Props) {
  const [layout, setLayout] = useState<ChartLayoutMode>("consolidated");
  const [metric, setMetric] = useState<ChartMetricMode>("absolute");
  const [hover, setHover] = useState<ChartBucket | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [exporting, setExporting] = useState(false);

  const buckets = useMemo(
    () => buildChartBuckets(transactions, timeframe, sources, customRange),
    [transactions, timeframe, sources, customRange]
  );

  const periodRows = useMemo(() => {
    if (!buckets.length) return [] as UnifiedTransaction[];
    const from = buckets[0]!.from;
    const to = buckets[buckets.length - 1]!.to;
    return transactions.filter((tx) => {
      const d = tx.date.slice(0, 10);
      if (d < from || d > to) return false;
      if (sources.size && !sources.has(tx.source)) return false;
      if (tx.excluded || tx.businessPersonal === "personal") return false;
      return true;
    });
  }, [buckets, transactions, sources]);

  const maxAbs = useMemo(() => {
    if (metric === "margin") {
      const peak = Math.max(0, ...buckets.map((b) => Math.abs(b.marginPct)));
      return Math.max(10, Math.ceil(Math.min(100, peak || 10) / 10) * 10);
    }
    if (metric === "mrr_split") {
      return Math.max(1, ...buckets.map((b) => b.mrr + b.oneTime + b.expenses));
    }
    return Math.max(1, ...buckets.map((b) => Math.max(b.gross, b.expenses, Math.abs(b.profit))));
  }, [buckets, metric]);

  const yTicks = useMemo(
    () => buildYTicks(maxAbs, metric === "margin" ? "margin" : "money"),
    [maxAbs, metric]
  );
  const axisMax = yTicks[yTicks.length - 1] || maxAbs;

  const totals = useMemo(() => {
    const gross = buckets.reduce((a, b) => a + b.gross, 0);
    const expenses = buckets.reduce((a, b) => a + b.expenses, 0);
    const profit = buckets.reduce((a, b) => a + b.profit, 0);
    const fees = buckets.reduce((a, b) => a + b.fees, 0);
    const net = buckets.reduce((a, b) => a + b.net, 0);
    const margin = net > 0 ? (profit / net) * 100 : 0;
    const mid = Math.floor(buckets.length / 2) || 1;
    const first = buckets.slice(0, mid);
    const second = buckets.slice(mid);
    const firstProfit = first.reduce((a, b) => a + b.profit, 0);
    const secondProfit = second.reduce((a, b) => a + b.profit, 0);
    return {
      gross,
      expenses,
      profit,
      fees,
      net,
      margin,
      pop: calculatePeriodDelta(secondProfit, firstProfit)
    };
  }, [buckets]);

  async function onExport() {
    setExporting(true);
    try {
      const kpis = computeKpis(periodRows, []);
      const channels = channelBreakdown(periodRows, []);
      await exportRevenueWorkbook({
        kpis,
        channels,
        recurring: [],
        ledger: periodRows,
        filename: `dimad-chart-${timeframe.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`
      });
    } finally {
      setExporting(false);
    }
  }

  function drillBucket(bucket: ChartBucket) {
    const slice = transactions.filter((tx) => {
      const d = tx.date.slice(0, 10);
      return d >= bucket.from && d <= bucket.to && (!sources.size || sources.has(tx.source));
    });
    onDrillPeriod({
      title: `Period ${bucket.label}`,
      from: bucket.from,
      to: bucket.to,
      transactions: slice
    });
  }

  const barGap = buckets.length <= 10 ? 10 : buckets.length <= 20 ? 6 : buckets.length <= 36 ? 4 : 2;
  const chartH = 248;
  const labelStep =
    buckets.length <= 10 ? 1 : buckets.length <= 18 ? 2 : buckets.length <= 36 ? 3 : Math.ceil(buckets.length / 10);
  const rangeLabel =
    buckets.length > 0
      ? `${formatAxisDate(buckets[0]!.from)} – ${formatAxisDate(buckets[buckets.length - 1]!.to)}`
      : "";
  const hoverIndex = hover ? buckets.findIndex((b) => b.key === hover.key) : -1;
  const hoverValueY =
    hoverIndex >= 0 && hover
      ? chartH -
        ((metric === "margin" ? Math.max(0, hover.marginPct) : Math.max(0, hover.gross)) / axisMax) *
          (chartH - 16)
      : 0;
  const hoverPinLabel =
    hover == null
      ? ""
      : metric === "margin"
        ? `${hover.marginPct.toFixed(1)}%`
        : money(hover.gross);

  return (
    <section
      style={{
        background: CHART.panel,
        border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
        borderRadius: 16,
        padding: 16,
        marginTop: 14,
        position: "relative"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        <p style={labelStyle}>Revenue vs Expenses</p>
        {!hideTimeframe ? (
          <div style={{ flex: 1, minWidth: 260, display: "flex", justifyContent: "flex-end" }}>
            <TimeRangeSelector
              compact
              value={timeframe}
              customRange={customRange}
              onChange={onTimeframeChange}
              onCustomRangeChange={onCustomRangeChange}
            />
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        <button type="button" style={pill(layout === "consolidated")} onClick={() => setLayout("consolidated")}>
          Consolidated
        </button>
        <button type="button" style={pill(layout === "stacked")} onClick={() => setLayout("stacked")}>
          Stacked channels
        </button>
        <span style={sep} />
        <button type="button" style={pill(metric === "absolute")} onClick={() => setMetric("absolute")}>
          Absolute ($)
        </button>
        <button type="button" style={pill(metric === "margin")} onClick={() => setMetric("margin")}>
          Margin (%)
        </button>
        <button type="button" style={pill(metric === "mrr_split")} onClick={() => setMetric("mrr_split")}>
          MRR vs One-Time
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr",
          gridTemplateRows: `${chartH}px auto`,
          columnGap: 8,
          rowGap: 0,
          marginTop: 14
        }}
      >
        <div style={{ position: "relative", height: chartH }}>
          {yTicks
            .slice()
            .reverse()
            .map((tick, idx) => (
              <div
                key={`${tick}-${idx}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: `${(tick / axisMax) * 100}%`,
                  transform: "translateY(50%)",
                  fontSize: 9,
                  color: CHART.mute,
                  textAlign: "right",
                  paddingRight: 4,
                  fontWeight: tick === 0 || tick === axisMax ? 700 : 500,
                  opacity: metric === "margin" && tick % 20 !== 0 && tick !== axisMax ? 0.75 : 1
                }}
              >
                {metric === "margin" ? `${Math.round(tick)}%` : formatAxisMoney(tick)}
              </div>
            ))}
        </div>

        <div
          style={{
            position: "relative",
            height: chartH,
            borderLeft: `1px solid ${CHART.lineStrong}`,
            borderBottom: `1px solid ${CHART.lineStrong}`,
            background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 40%)"
          }}
          onMouseLeave={() => {
            setHover(null);
            setHoverPos(null);
          }}
        >
          {yTicks.map((tick, idx) => {
            const major =
              metric === "margin" ? tick % 20 === 0 : idx % 2 === 0 || tick === 0 || tick === axisMax;
            return (
              <div
                key={`g-${tick}-${idx}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: `${(tick / axisMax) * 100}%`,
                  borderTop: `1px solid ${major ? CHART.lineStrong : CHART.line}`,
                  pointerEvents: "none"
                }}
              />
            );
          })}

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-end",
              gap: barGap,
              padding: "0 4px 0 8px"
            }}
          >
            {buckets.map((b) => {
              const hGross = (b.gross / axisMax) * (chartH - 16);
              const hExp = (b.expenses / axisMax) * (chartH - 16);
              const hMrr = (b.mrr / axisMax) * (chartH - 16);
              const hOne = (b.oneTime / axisMax) * (chartH - 16);
              const hMargin = (Math.abs(b.marginPct) / axisMax) * (chartH - 16);

              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => drillBucket(b)}
                  onMouseEnter={(e) => {
                    setHover(b);
                    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseMove={(e) => {
                    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: "100%",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    gap: 2,
                    background: "transparent",
                    border: 0,
                    padding: 0,
                    cursor: "pointer"
                  }}
                >
                  {metric === "margin" ? (
                    <div
                      style={{
                        width: "70%",
                        maxWidth: 28,
                        height: Math.max(3, hMargin),
                        background: b.marginPct >= 0 ? CHART.gold : CHART.expense,
                        borderRadius: "3px 3px 0 0"
                      }}
                    />
                  ) : metric === "mrr_split" ? (
                    <div style={{ width: "78%", maxWidth: 36, display: "flex", alignItems: "flex-end", gap: 2 }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        <div style={{ height: Math.max(2, hOne), background: "rgba(212,175,55,0.45)", borderRadius: "2px 2px 0 0" }} />
                        <div style={{ height: Math.max(2, hMrr), background: CHART.gold, borderRadius: hOne > 2 ? 0 : "2px 2px 0 0" }} />
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: Math.max(2, hExp),
                          background: CHART.expense,
                          borderRadius: "3px 3px 0 0"
                        }}
                      />
                    </div>
                  ) : layout === "stacked" ? (
                    <div style={{ width: "78%", maxWidth: 36, display: "flex", alignItems: "flex-end", gap: 2 }}>
                      <div style={{ flex: 1.2, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        {SOURCE_ORDER.filter((s) => (b.bySource[s] || 0) > 0).map((s, i, arr) => {
                          const h = ((b.bySource[s] || 0) / axisMax) * (chartH - 16);
                          return (
                            <div
                              key={s}
                              style={{
                                height: Math.max(2, h),
                                background: SOURCE_COLORS[s] || CHART.gold,
                                borderRadius: i === arr.length - 1 ? "3px 3px 0 0" : 0,
                                opacity: 0.92
                              }}
                            />
                          );
                        })}
                        {!Object.keys(b.bySource).length ? (
                          <div style={{ height: 2, background: "rgba(212,175,55,0.25)", borderRadius: "3px 3px 0 0" }} />
                        ) : null}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: Math.max(2, hExp),
                          background: CHART.expense,
                          borderRadius: "3px 3px 0 0"
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ width: "78%", maxWidth: 36, display: "flex", alignItems: "flex-end", gap: 3 }}>
                      <div
                        style={{
                          flex: 1,
                          height: Math.max(3, hGross),
                          background: CHART.gold,
                          borderRadius: "3px 3px 0 0"
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          height: Math.max(3, hExp),
                          background: CHART.expense,
                          borderRadius: "3px 3px 0 0"
                        }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Net profit overlay polyline (absolute / mrr modes) */}
          {metric !== "margin" && buckets.length > 1 ? (
            <svg
              width="100%"
              height={chartH}
              viewBox={`0 0 ${Math.max(1, buckets.length)} ${chartH}`}
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <defs>
                <linearGradient id="profitStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                  <stop offset="100%" stopColor={CHART.gold} stopOpacity="0.95" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="url(#profitStroke)"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
                points={buckets
                  .map((b, i) => {
                    const clamped = chartH - (Math.max(0, b.profit) / axisMax) * (chartH - 16);
                    return `${i + 0.5},${clamped}`;
                  })
                  .join(" ")}
              />
            </svg>
          ) : null}

          {metric === "margin" && buckets.length > 1 ? (
            <svg
              width="100%"
              height={chartH}
              viewBox={`0 0 ${Math.max(1, buckets.length)} ${chartH}`}
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <polyline
                fill="none"
                stroke={CHART.ink}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                points={buckets
                  .map((b, i) => {
                    const y = chartH - (Math.max(0, b.marginPct) / axisMax) * (chartH - 16);
                    return `${i + 0.5},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
          ) : null}

          {hover && hoverIndex >= 0 ? (
            <div
              style={{
                position: "absolute",
                left: `calc(${((hoverIndex + 0.5) / Math.max(1, buckets.length)) * 100}% - 28px)`,
                top: Math.max(4, hoverValueY - 28),
                zIndex: 6,
                minWidth: 56,
                textAlign: "center",
                pointerEvents: "none"
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  background: CHART.navy,
                  border: `1px solid ${CHART.gold}`,
                  color: CHART.gold,
                  borderRadius: 8,
                  padding: "3px 7px",
                  fontSize: 11,
                  fontWeight: 800,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
                  whiteSpace: "nowrap"
                }}
              >
                {hoverPinLabel}
              </div>
            </div>
          ) : null}

          {hover && hoverPos ? (
            <div
              style={{
                position: "absolute",
                left: Math.min(Math.max(8, hoverPos.x + 14), 220),
                top: Math.min(Math.max(8, hoverPos.y + 14), chartH - 120),
                zIndex: 5,
                minWidth: 200,
                maxWidth: 260,
                background: CHART.navy,
                border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                borderRadius: 12,
                padding: "10px 12px",
                boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                pointerEvents: "none"
              }}
            >
              <div style={{ fontSize: 10, color: CHART.gold, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {hover.label}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: CHART.ink, lineHeight: 1.45 }}>
                <div>Gross {money(hover.gross)}</div>
                <div>Fees {money(hover.fees)} · Net {money(hover.net)}</div>
                <div>Expenses {money(hover.expenses)}</div>
                <div style={{ color: hover.profit >= 0 ? CHART.gold : CHART.expense }}>
                  Net Profit {money(hover.profit)} · Margin {hover.marginPct.toFixed(1)}%
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 10, color: CHART.mute, lineHeight: 1.4 }}>
                {SOURCE_ORDER.filter((s) => (hover.bySource[s] || 0) > 0 || (hover.expenseBySource[s] || 0) > 0)
                  .slice(0, 4)
                  .map((s) => {
                    const rev = hover.bySource[s] || 0;
                    const exp = hover.expenseBySource[s] || 0;
                    if (rev > 0) return `${labelSource(s)}: ${money(rev)}`;
                    return `${labelSource(s)} OpEx: ${money(exp)}`;
                  })
                  .join(" · ") || "No source mix"}
              </div>
              <div style={{ marginTop: 4, fontSize: 9, color: CHART.mute }}>Click to drill into this period</div>
            </div>
          ) : null}
        </div>

        <div aria-hidden />
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: barGap,
            padding: "8px 4px 0 8px",
            minHeight: buckets.length > 20 ? 40 : 26
          }}
        >
          {buckets.map((b, i) => {
            const show =
              i === 0 ||
              i === buckets.length - 1 ||
              i % labelStep === 0 ||
              (hover && hover.key === b.key);
            return (
              <div
                key={`x-${b.key}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "center",
                  fontSize: 9,
                  lineHeight: 1.15,
                  color: hover?.key === b.key ? CHART.gold : CHART.mute,
                  fontWeight: hover?.key === b.key || i === 0 || i === buckets.length - 1 ? 700 : 500,
                  whiteSpace: "nowrap",
                  overflow: "visible",
                  opacity: show ? 1 : 0.15,
                  transform: buckets.length > 18 ? "rotate(-32deg)" : undefined,
                  transformOrigin: "top center",
                  letterSpacing: "0.01em"
                }}
                title={`${formatAxisDate(b.from)}${b.from !== b.to ? ` – ${formatAxisDate(b.to)}` : ""}`}
              >
                {show ? shortAxisLabel(b.label, buckets.length) : "·"}
              </div>
            );
          })}
        </div>
      </div>

      {rangeLabel ? (
        <p
          style={{
            margin: "2px 0 0 56px",
            fontSize: 10,
            color: CHART.mute,
            letterSpacing: "0.02em"
          }}
        >
          Range{" "}
          <span style={{ color: CHART.gold, fontWeight: 700 }}>{timeframe}</span>
          {" · "}
          <span style={{ color: CHART.ink, fontWeight: 600 }}>{rangeLabel}</span>
          <span style={{ color: "rgba(139,160,184,0.7)" }}> · {buckets.length} points</span>
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 10,
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 10, color: CHART.mute }}>
          {metric === "absolute" || metric === "mrr_split" ? (
            <>
              <Legend swatch={CHART.gold} label={metric === "mrr_split" ? "MRR" : "Gross revenue"} />
              {metric === "mrr_split" ? <Legend swatch="rgba(212,175,55,0.45)" label="One-time" /> : null}
              <Legend swatch={CHART.expense} label="Expenses" />
              <Legend swatch={CHART.ink} label="Net profit trend" />
            </>
          ) : (
            <Legend swatch={CHART.ink} label="Net profit margin %" />
          )}
          <span>
            Window · Gross {money(totals.gross)} · Fees {money(totals.fees)} · Net {money(totals.net)} · Exp{" "}
            {money(totals.expenses)} · Margin {totals.margin.toFixed(1)}% · PoP {formatPct(totals.pop)}
          </span>
        </div>
      </div>

      {layout === "stacked" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {SOURCE_ORDER.map((s) => (
            <Legend key={s} swatch={SOURCE_COLORS[s] || CHART.gold} label={labelSource(s)} />
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${CHART.line}`
        }}
      >
        <button type="button" style={actionBtn} disabled={exporting} onClick={() => void onExport()}>
          {exporting ? "Exporting…" : "Export Chart Data (.xlsx)"}
        </button>
        <button type="button" style={actionBtn} onClick={onSimulateForecast}>
          Simulate Forecast
        </button>
        <span style={{ fontSize: 10, color: CHART.mute, alignSelf: "center" }}>
          Δ PoP profit {formatDelta(totals.pop)}
        </span>
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: CHART.mute }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: swatch }} />
      {label}
    </span>
  );
}

function labelSource(s: LedgerSource) {
  return (
    {
      stripe: "Stripe",
      shopify: "Shopify",
      gumroad: "Gumroad",
      patreon: "Patreon",
      lemon_squeezy: "Lemon",
      plaid: "Plaid",
      manual: "Manual"
    } as const
  )[s];
}

function formatAxisDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function shortAxisLabel(label: string, count: number) {
  if (count > 20 && label.length > 8) {
    return label.replace(/^[A-Za-z]{3}\s/, (m) => m.slice(0, 1) + " ");
  }
  return label;
}

const labelStyle: CSSProperties = {
  margin: 0,
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: CHART.gold,
  fontWeight: 700
};

const sep: CSSProperties = { width: 1, height: 18, background: CHART.line };

const actionBtn: CSSProperties = {
  border: `1px solid ${CHART.gold}`,
  background: "rgba(212,175,55,0.12)",
  color: CHART.gold,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer"
};

function pill(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? CHART.gold : "rgba(212,175,55,0.22)"}`,
    background: active ? "rgba(212,175,55,0.14)" : "transparent",
    color: active ? CHART.gold : CHART.mute,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };
}
