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
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";
import type { CustomDateRange, DimadTimeframe } from "@/lib/utils/timeframeFilter";
import TimeRangeSelector from "@/components/shared/TimeRangeSelector";

const CHART = {
  navy: "#0A192F",
  panel: "#0B1E3B",
  gold: "#D4AF37",
  expense: "#E06D73",
  profit: "#7DCEA0",
  mrr: "#D4AF37",
  oneTime: "#8BA0B8",
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

type SeriesKey = "revenue" | "expenses" | "profit" | "mrr" | "oneTime";

type Props = {
  transactions: UnifiedTransaction[];
  sources: Set<LedgerSource>;
  timeframe: DimadTimeframe;
  customRange: CustomDateRange;
  onTimeframeChange: (timeframe: DimadTimeframe) => void;
  onCustomRangeChange: (range: CustomDateRange) => void;
  hideTimeframe?: boolean;
  onDrillPeriod: (opts: { title: string; from: string; to: string; transactions: UnifiedTransaction[] }) => void;
  onSimulateForecast: () => void;
};

const CHART_W = 1000;
const CHART_H = 280;
const PAD = { top: 18, right: 18, bottom: 44, left: 54 };

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
  const [series, setSeries] = useState<Record<SeriesKey, boolean>>({
    revenue: true,
    expenses: true,
    profit: true,
    mrr: true,
    oneTime: true
  });
  const [hover, setHover] = useState<ChartBucket | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

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

  const activeSeries = useMemo(() => {
    if (metric === "margin") return ["profit"] as SeriesKey[];
    if (metric === "mrr_split") {
      const keys: SeriesKey[] = [];
      if (series.mrr) keys.push("mrr");
      if (series.oneTime) keys.push("oneTime");
      if (series.expenses) keys.push("expenses");
      if (series.profit) keys.push("profit");
      return keys.length ? keys : (["mrr"] as SeriesKey[]);
    }
    const keys: SeriesKey[] = [];
    if (series.revenue) keys.push("revenue");
    if (series.expenses) keys.push("expenses");
    if (series.profit) keys.push("profit");
    return keys.length ? keys : (["revenue"] as SeriesKey[]);
  }, [metric, series]);

  const maxAbs = useMemo(() => {
    if (metric === "margin") {
      const peak = Math.max(0, ...buckets.map((b) => Math.abs(b.marginPct)));
      return Math.max(10, Math.ceil(Math.min(100, peak || 10) / 10) * 10);
    }
    let peak = 1;
    for (const b of buckets) {
      for (const key of activeSeries) {
        peak = Math.max(peak, Math.abs(valueForSeries(b, key, metric)));
      }
      if (layout === "stacked" && metric === "absolute") {
        for (const s of SOURCE_ORDER) peak = Math.max(peak, b.bySource[s] || 0);
      }
    }
    return peak;
  }, [buckets, metric, activeSeries, layout]);

  const yTicks = useMemo(
    () => buildYTicks(maxAbs, metric === "margin" ? "margin" : "money"),
    [maxAbs, metric]
  );
  const axisMax = yTicks[yTicks.length - 1] || maxAbs;

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;

  const points = useMemo(() => {
    const n = Math.max(1, buckets.length);
    return buckets.map((b, i) => {
      const x = PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
      const ys: Partial<Record<SeriesKey, number>> = {};
      for (const key of activeSeries) {
        const raw = valueForSeries(b, key, metric);
        const y = PAD.top + plotH - (Math.max(0, raw) / axisMax) * plotH;
        ys[key] = y;
      }
      return { bucket: b, x, ys, i };
    });
  }, [buckets, activeSeries, metric, axisMax, plotW, plotH]);

  const xLabelIndexes = useMemo(() => pickXLabelIndexes(buckets.length), [buckets.length]);

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

  function toggleSeries(key: SeriesKey) {
    setSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onExport(scope: "visible" | "full") {
    setExporting(true);
    setExportOpen(false);
    try {
      const kpis = computeKpis(periodRows, []);
      const channels = channelBreakdown(periodRows, []);
      const chartRows = buckets.map((b) => {
        const row: Record<string, string | number> = {
          Period: b.label,
          From: b.from,
          To: b.to
        };
        const include = (key: SeriesKey) => scope === "full" || activeSeries.includes(key);
        if (include("revenue")) row["Gross Revenue"] = round2(b.gross);
        if (include("expenses")) row.Expenses = round2(b.expenses);
        if (include("profit")) {
          row["Net Profit"] = round2(b.profit);
          row["Margin %"] = round2(b.marginPct);
        }
        if (include("mrr")) row.MRR = round2(b.mrr);
        if (include("oneTime")) row["One-Time Revenue"] = round2(b.oneTime);
        row.Fees = round2(b.fees);
        row["Net Revenue"] = round2(b.net);
        return row;
      });

      await exportRevenueWorkbook({
        kpis,
        channels,
        recurring: [],
        ledger: periodRows,
        chartSeries: chartRows,
        filename: `dimad-chart-${timeframe.toLowerCase()}-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`
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

  const rangeLabel =
    buckets.length > 0
      ? `${formatAxisDate(buckets[0]!.from)} – ${formatAxisDate(buckets[buckets.length - 1]!.to)}`
      : "";

  const hoverIndex = hover ? buckets.findIndex((b) => b.key === hover.key) : -1;

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
          By channel
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {metric === "absolute" || metric === "margin" ? (
          <>
            {metric === "absolute" ? (
              <button type="button" style={pill(series.revenue)} onClick={() => toggleSeries("revenue")}>
                Revenue
              </button>
            ) : null}
            <button type="button" style={pill(series.expenses && metric === "absolute")} onClick={() => metric === "absolute" && toggleSeries("expenses")} disabled={metric === "margin"}>
              Expenses
            </button>
            <button type="button" style={pill(series.profit)} onClick={() => toggleSeries("profit")}>
              {metric === "margin" ? "Profit margin" : "Profit"}
            </button>
          </>
        ) : (
          <>
            <button type="button" style={pill(series.mrr)} onClick={() => toggleSeries("mrr")}>
              MRR
            </button>
            <button type="button" style={pill(series.oneTime)} onClick={() => toggleSeries("oneTime")}>
              One-time
            </button>
            <button type="button" style={pill(series.expenses)} onClick={() => toggleSeries("expenses")}>
              Expenses
            </button>
            <button type="button" style={pill(series.profit)} onClick={() => toggleSeries("profit")}>
              Profit
            </button>
          </>
        )}
      </div>

      <div
        style={{ marginTop: 14, width: "100%", overflow: "hidden", position: "relative" }}
        onMouseLeave={() => {
          setHover(null);
          setHoverPos(null);
        }}
      >
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          width="100%"
          height={CHART_H}
          role="img"
          aria-label="Revenue expenses and profit line chart"
          style={{ display: "block" }}
        >
          {/* Grid + Y labels */}
          {yTicks.map((tick, idx) => {
            const y = PAD.top + plotH - (tick / axisMax) * plotH;
            const major = idx === 0 || idx === yTicks.length - 1 || idx % 2 === 0;
            return (
              <g key={`yt-${tick}-${idx}`}>
                <line
                  x1={PAD.left}
                  x2={CHART_W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke={major ? CHART.lineStrong : CHART.line}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill={CHART.mute}
                  fontSize={11}
                  fontWeight={major ? 700 : 500}
                >
                  {metric === "margin" ? `${Math.round(tick)}%` : formatAxisMoney(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={PAD.left}
            x2={PAD.left}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke={CHART.lineStrong}
            strokeWidth={1}
          />
          <line
            x1={PAD.left}
            x2={CHART_W - PAD.right}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            stroke={CHART.lineStrong}
            strokeWidth={1}
          />

          {/* Channel lines when "By channel" */}
          {layout === "stacked" && metric === "absolute"
            ? SOURCE_ORDER.filter((s) => s !== "plaid").map((s) => {
                const path = buildPath(
                  points.map((p) => ({
                    x: p.x,
                    y: PAD.top + plotH - ((p.bucket.bySource[s] || 0) / axisMax) * plotH
                  }))
                );
                if (!path) return null;
                return (
                  <g key={`ch-${s}`}>
                    <path d={path} fill="none" stroke={SOURCE_COLORS[s] || CHART.gold} strokeWidth={2} />
                    <text
                      x={points[points.length - 1]?.x ?? 0}
                      y={(points[points.length - 1]
                        ? PAD.top + plotH - ((points[points.length - 1]!.bucket.bySource[s] || 0) / axisMax) * plotH
                        : 0) - 6}
                      fill={SOURCE_COLORS[s] || CHART.gold}
                      fontSize={10}
                      fontWeight={700}
                      textAnchor="end"
                    >
                      {labelSource(s)}
                    </text>
                  </g>
                );
              })
            : null}

          {/* Main series lines */}
          {layout === "consolidated" || metric !== "absolute"
            ? activeSeries.map((key) => {
                const color = colorForSeries(key);
                const path = buildPath(
                  points.map((p) => ({ x: p.x, y: p.ys[key] ?? PAD.top + plotH }))
                );
                if (!path) return null;
                const end = points[points.length - 1];
                const endY = end?.ys[key] ?? PAD.top + plotH;
                return (
                  <g key={key}>
                    <path d={path} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
                    {points.map((p) => (
                      <circle
                        key={`${key}-${p.bucket.key}`}
                        cx={p.x}
                        cy={p.ys[key]}
                        r={hover?.key === p.bucket.key ? 4.5 : 3}
                        fill={CHART.navy}
                        stroke={color}
                        strokeWidth={2}
                      />
                    ))}
                    {end ? (
                      <text
                        x={Math.min(end.x, CHART_W - PAD.right - 4)}
                        y={Math.max(PAD.top + 10, endY - 8)}
                        fill={color}
                        fontSize={11}
                        fontWeight={800}
                        textAnchor="end"
                      >
                        {labelForSeries(key, metric)}
                      </text>
                    ) : null}
                  </g>
                );
              })
            : null}

          {/* X labels — spaced indexes only, never overlapping plot */}
          {xLabelIndexes.map((i) => {
            const p = points[i];
            if (!p) return null;
            return (
              <g key={`xl-${p.bucket.key}`}>
                <line
                  x1={p.x}
                  x2={p.x}
                  y1={PAD.top + plotH}
                  y2={PAD.top + plotH + 5}
                  stroke={CHART.lineStrong}
                />
                <text
                  x={p.x}
                  y={CHART_H - 14}
                  textAnchor="middle"
                  fill={hover?.key === p.bucket.key ? CHART.gold : CHART.mute}
                  fontSize={10}
                  fontWeight={i === 0 || i === points.length - 1 ? 700 : 500}
                >
                  {axisTickLabel(p.bucket.label)}
                </text>
              </g>
            );
          })}

          {/* Invisible hit targets */}
          {points.map((p) => (
            <rect
              key={`hit-${p.bucket.key}`}
              x={p.x - plotW / Math.max(2, points.length) / 2}
              y={PAD.top}
              width={Math.max(12, plotW / Math.max(1, points.length))}
              height={plotH}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => {
                setHover(p.bucket);
                const svg = e.currentTarget.ownerSVGElement;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                setHoverPos({
                  x: ((e.clientX - rect.left) / rect.width) * CHART_W,
                  y: ((e.clientY - rect.top) / rect.height) * CHART_H
                });
              }}
              onMouseMove={(e) => {
                const svg = e.currentTarget.ownerSVGElement;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                setHoverPos({
                  x: ((e.clientX - rect.left) / rect.width) * CHART_W,
                  y: ((e.clientY - rect.top) / rect.height) * CHART_H
                });
              }}
              onClick={() => drillBucket(p.bucket)}
            />
          ))}
        </svg>

        {hover && hoverPos ? (
          <div
            style={{
              position: "absolute",
              left: Math.min(Math.max(16, (hoverPos.x / CHART_W) * 100 + 2), 62) + "%",
              top: Math.min(Math.max(56, (hoverPos.y / CHART_H) * CHART_H + 40), CHART_H - 20),
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
              <div>Revenue {money(hover.gross)}</div>
              <div>Expenses {money(hover.expenses)}</div>
              <div style={{ color: hover.profit >= 0 ? CHART.profit : CHART.expense }}>
                Profit {money(hover.profit)} · Margin {hover.marginPct.toFixed(1)}%
              </div>
              {metric === "mrr_split" ? (
                <div>
                  MRR {money(hover.mrr)} · One-time {money(hover.oneTime)}
                </div>
              ) : null}
            </div>
            <div style={{ marginTop: 4, fontSize: 9, color: CHART.mute }}>Click to drill into this period</div>
          </div>
        ) : null}
      </div>

      {rangeLabel ? (
        <p style={{ margin: "2px 0 0", fontSize: 10, color: CHART.mute, letterSpacing: "0.02em" }}>
          Range <span style={{ color: CHART.gold, fontWeight: 700 }}>{timeframe}</span>
          {" · "}
          <span style={{ color: CHART.ink, fontWeight: 600 }}>{rangeLabel}</span>
          <span style={{ color: "rgba(139,160,184,0.7)" }}> · {buckets.length} points</span>
          {hoverIndex >= 0 ? (
            <span style={{ color: CHART.gold }}> · Viewing {hover?.label}</span>
          ) : null}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 10,
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 10, color: CHART.mute }}>
          {layout === "stacked" && metric === "absolute"
            ? SOURCE_ORDER.filter((s) => s !== "plaid").map((s) => (
                <Legend key={s} swatch={SOURCE_COLORS[s] || CHART.gold} label={labelSource(s)} line />
              ))
            : activeSeries.map((key) => (
                <Legend key={key} swatch={colorForSeries(key)} label={labelForSeries(key, metric)} line />
              ))}
          <span>
            Window · Revenue {money(totals.gross)} · Exp {money(totals.expenses)} · Profit {money(totals.profit)} ·
            Margin {totals.margin.toFixed(1)}% · PoP {formatPct(totals.pop)}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${CHART.line}`,
          position: "relative"
        }}
      >
        <div style={{ position: "relative" }}>
          <button type="button" style={actionBtn} disabled={exporting} onClick={() => setExportOpen((v) => !v)}>
            {exporting ? "Exporting…" : "Export chart data ▾"}
          </button>
          {exportOpen ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: "calc(100% + 6px)",
                minWidth: 220,
                background: CHART.navy,
                border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                borderRadius: 12,
                padding: 6,
                zIndex: 8,
                boxShadow: "0 16px 40px rgba(0,0,0,0.4)"
              }}
            >
              <button type="button" style={menuItem} onClick={() => void onExport("visible")}>
                Visible series only (.xlsx)
              </button>
              <button type="button" style={menuItem} onClick={() => void onExport("full")}>
                Full chart series (.xlsx)
              </button>
            </div>
          ) : null}
        </div>
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

function valueForSeries(b: ChartBucket, key: SeriesKey, metric: ChartMetricMode) {
  if (metric === "margin") return b.marginPct;
  if (key === "revenue") return b.gross;
  if (key === "expenses") return b.expenses;
  if (key === "profit") return b.profit;
  if (key === "mrr") return b.mrr;
  return b.oneTime;
}

function colorForSeries(key: SeriesKey) {
  if (key === "revenue" || key === "mrr") return CHART.gold;
  if (key === "expenses") return CHART.expense;
  if (key === "profit") return CHART.profit;
  return CHART.oneTime;
}

function labelForSeries(key: SeriesKey, metric: ChartMetricMode) {
  if (metric === "margin") return "Profit margin %";
  if (key === "revenue") return "Revenue";
  if (key === "expenses") return "Expenses";
  if (key === "profit") return "Profit";
  if (key === "mrr") return "MRR";
  return "One-time";
}

function buildPath(pts: { x: number; y: number }[]) {
  if (!pts.length) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function pickXLabelIndexes(count: number) {
  if (count <= 1) return [0];
  if (count <= 8) return Array.from({ length: count }, (_, i) => i);
  const maxLabels = count <= 14 ? 7 : count <= 24 ? 6 : 5;
  const indexes = new Set<number>([0, count - 1]);
  const step = (count - 1) / (maxLabels - 1);
  for (let i = 1; i < maxLabels - 1; i += 1) {
    indexes.add(Math.round(i * step));
  }
  return Array.from(indexes).sort((a, b) => a - b);
}

function axisTickLabel(label: string) {
  // Keep labels short and collision-free under the plot.
  return label.replace(/,\s*/g, " ").trim();
}

function formatAxisDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function Legend({ swatch, label, line }: { swatch: string; label: string; line?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: CHART.mute }}>
      <span
        style={{
          width: line ? 14 : 8,
          height: line ? 3 : 8,
          borderRadius: line ? 999 : 2,
          background: swatch
        }}
      />
      {label}
    </span>
  );
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

const menuItem: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: 0,
  background: "transparent",
  color: CHART.ink,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 11,
  fontWeight: 600,
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
