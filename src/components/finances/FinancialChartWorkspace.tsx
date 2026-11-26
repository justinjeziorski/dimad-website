"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  buildHybridSeries,
  buildSankeyModel,
  buildWaterfallSteps,
  formatDelta,
  money
} from "@/lib/finances/ledgerEngine";
import type {
  FinanceChartMode,
  HybridSeriesPoint,
  SankeyLink,
  SankeyNode,
  WaterfallStep
} from "@/lib/finances/types";
import type { UnifiedTransaction, ViewMode } from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

type Props = {
  rows: UnifiedTransaction[];
  buckets: Array<{ key: string; label: string; items: UnifiedTransaction[] }>;
  /** Prior-period buckets aligned for overlay (vs prior month / year). */
  compareBuckets?: Array<{ key: string; label: string; items: UnifiedTransaction[] }>;
  compareLabel?: string;
  viewMode: ViewMode;
  enabledSources: Set<string>;
};

const MODES: { id: FinanceChartMode; label: string }[] = [
  { id: "hybrid", label: "Hybrid" },
  { id: "sankey", label: "Sankey Flow" },
  { id: "waterfall", label: "P&L Waterfall" }
];

const SERIES_TOGGLES = [
  { id: "grossRevenue", label: "Gross Revenue", color: "#D4AF37" },
  { id: "netProfit", label: "Net Profit", color: "#7DCEA0" },
  { id: "opex", label: "OpEx", color: "#E57373" },
  { id: "marginPct", label: "Margin %", color: "#5DADE2" }
] as const;

export default function FinancialChartWorkspace({
  rows,
  buckets,
  compareBuckets = [],
  compareLabel = "Prior period",
  viewMode,
  enabledSources
}: Props) {
  const [mode, setMode] = useState<FinanceChartMode>("hybrid");
  const [seriesOn, setSeriesOn] = useState<Set<string>>(
    () => new Set(SERIES_TOGGLES.map((s) => s.id))
  );
  const [overlayCompare, setOverlayCompare] = useState(true);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    title: string;
    lines: string[];
  } | null>(null);

  const series = useMemo(() => buildHybridSeries(buckets), [buckets]);
  const compareSeries = useMemo(
    () => (compareBuckets.length ? buildHybridSeries(compareBuckets) : []),
    [compareBuckets]
  );
  const sankey = useMemo(() => buildSankeyModel(rows), [rows]);
  const waterfall = useMemo(() => buildWaterfallSteps(rows), [rows]);

  const toggleSeries = (id: string) => {
    setSeriesOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section style={wrap}>
      <div style={toolbar}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              style={modeBtn(mode === m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode === "hybrid" ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {SERIES_TOGGLES.map((s) => {
              const on = seriesOn.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSeries(s.id)}
                  style={{
                    ...legendBtn,
                    opacity: on ? 1 : 0.4,
                    border: `1px solid ${s.color}`
                  }}
                >
                  <span style={{ ...dot, background: s.color }} />
                  {s.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setOverlayCompare((v) => !v)}
              style={{
                ...legendBtn,
                opacity: overlayCompare ? 1 : 0.45,
                border: `1px dashed ${SNAPSHOT_THEME.mute}`
              }}
              title="Overlay comparison period metrics on the same axis"
            >
              Overlay {compareLabel}
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ position: "relative", minHeight: 320 }}>
        {mode === "hybrid" ? (
          <HybridChart
            series={series}
            compareSeries={overlayCompare ? compareSeries : []}
            compareLabel={compareLabel}
            seriesOn={seriesOn}
            viewMode={viewMode}
            enabledSources={enabledSources}
            onHover={setHover}
          />
        ) : null}
        {mode === "sankey" ? <SankeyChart nodes={sankey.nodes} links={sankey.links} /> : null}
        {mode === "waterfall" ? <WaterfallChart steps={waterfall} /> : null}

        {hover ? (
          <div
            style={{
              ...tooltip,
              left: Math.min(hover.x + 12, 520),
              top: Math.max(8, hover.y - 8)
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 4 }}>{hover.title}</div>
            {hover.lines.map((line, i) => (
              <div key={i} style={{ color: SNAPSHOT_THEME.mute, fontSize: 11 }}>
                {line}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HybridChart({
  series,
  compareSeries,
  compareLabel,
  seriesOn,
  viewMode,
  enabledSources,
  onHover
}: {
  series: HybridSeriesPoint[];
  compareSeries: HybridSeriesPoint[];
  compareLabel: string;
  seriesOn: Set<string>;
  viewMode: ViewMode;
  enabledSources: Set<string>;
  onHover: (v: { x: number; y: number; title: string; lines: string[] } | null) => void;
}) {
  const W = 720;
  const H = 300;
  const pad = { t: 20, r: 48, b: 36, l: 48 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const maxBar = Math.max(
    1,
    ...series.map((p) => Math.max(p.grossRevenue, Math.abs(p.netProfit), p.opex)),
    ...compareSeries.map((p) => Math.max(p.grossRevenue, Math.abs(p.netProfit), p.opex))
  );
  const n = Math.max(1, series.length);
  const groupW = innerW / n;
  const barW = Math.max(4, Math.min(18, groupW * 0.28));

  const yMoney = (v: number) => pad.t + innerH - (Math.max(0, v) / maxBar) * innerH;
  const yMargin = (pct: number) => pad.t + innerH - (Math.min(100, Math.max(0, pct)) / 100) * innerH;

  const linePath = (
    points: HybridSeriesPoint[],
    getter: (p: HybridSeriesPoint) => number,
    useMargin: boolean
  ) => {
    if (!points.length) return "";
    const count = Math.max(points.length, series.length);
    const step = innerW / Math.max(1, count);
    return points
      .map((p, i) => {
        const x = pad.l + step * i + step / 2;
        const y = useMargin ? yMargin(getter(p)) : yMoney(getter(p));
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  };

  const mom = (i: number, key: keyof HybridSeriesPoint) => {
    if (i === 0) return null;
    const cur = Number(series[i]![key]);
    const prev = Number(series[i - 1]![key]);
    if (!prev) return null;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };

  const compareAt = (i: number) => compareSeries[i] || null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={320}
      style={{ display: "block" }}
      onMouseLeave={() => onHover(null)}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        return (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y}
              y2={y}
              stroke="rgba(212,175,55,0.12)"
              strokeWidth={1}
            />
            <text x={4} y={y + 3} fill={SNAPSHOT_THEME.mute} fontSize={9}>
              {money(maxBar * t).replace(/\.00$/, "")}
            </text>
          </g>
        );
      })}

      {series.map((p, i) => {
        const cx = pad.l + groupW * i + groupW / 2;
        const grossH = (p.grossRevenue / maxBar) * innerH;
        const profitH = (Math.max(0, p.netProfit) / maxBar) * innerH;
        const prior = compareAt(i);
        return (
          <g key={p.key}>
            {seriesOn.has("grossRevenue") ? (
              <rect
                x={cx - barW - 2}
                y={pad.t + innerH - grossH}
                width={barW}
                height={grossH}
                fill="#D4AF37"
                opacity={0.85}
                rx={2}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  onHover({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    title: p.label,
                    lines: [
                      `Gross ${money(p.grossRevenue)}`,
                      prior ? `${compareLabel} gross ${money(prior.grossRevenue)}` : "",
                      `MoM ${formatDelta(mom(i, "grossRevenue"))}`,
                      viewMode === "per_channel"
                        ? Object.entries(p.bySource)
                            .filter(([s]) => enabledSources.has(s))
                            .map(([s, v]) => `${s}: ${money(v)}`)
                            .join(" · ") || "No channel split"
                        : `OpEx ${money(p.opex)} · Margin ${p.marginPct.toFixed(1)}%`
                    ].filter(Boolean)
                  });
                }}
              />
            ) : null}
            {seriesOn.has("netProfit") ? (
              <rect
                x={cx + 2}
                y={pad.t + innerH - profitH}
                width={barW}
                height={profitH}
                fill="#7DCEA0"
                opacity={0.85}
                rx={2}
              />
            ) : null}
            <text
              x={cx}
              y={H - 10}
              textAnchor="middle"
              fill={SNAPSHOT_THEME.mute}
              fontSize={9}
            >
              {p.label}
            </text>
          </g>
        );
      })}

      {/* Current overlapping metric lines */}
      {seriesOn.has("grossRevenue") ? (
        <path
          d={linePath(series, (p) => p.grossRevenue, false)}
          fill="none"
          stroke="#D4AF37"
          strokeWidth={2}
          opacity={0.95}
        />
      ) : null}
      {seriesOn.has("netProfit") ? (
        <path
          d={linePath(series, (p) => Math.max(0, p.netProfit), false)}
          fill="none"
          stroke="#7DCEA0"
          strokeWidth={2}
          opacity={0.95}
        />
      ) : null}
      {seriesOn.has("opex") ? (
        <path d={linePath(series, (p) => p.opex, false)} fill="none" stroke="#E57373" strokeWidth={2} />
      ) : null}
      {seriesOn.has("marginPct") ? (
        <path d={linePath(series, (p) => p.marginPct, true)} fill="none" stroke="#5DADE2" strokeWidth={2} />
      ) : null}

      {/* Prior-period overlay (dashed) — same x slots for visual comparison */}
      {compareSeries.length ? (
        <>
          {seriesOn.has("grossRevenue") ? (
            <path
              d={linePath(compareSeries, (p) => p.grossRevenue, false)}
              fill="none"
              stroke="#D4AF37"
              strokeWidth={2}
              strokeDasharray="5 4"
              opacity={0.55}
            />
          ) : null}
          {seriesOn.has("netProfit") ? (
            <path
              d={linePath(compareSeries, (p) => Math.max(0, p.netProfit), false)}
              fill="none"
              stroke="#7DCEA0"
              strokeWidth={2}
              strokeDasharray="5 4"
              opacity={0.55}
            />
          ) : null}
          {seriesOn.has("opex") ? (
            <path
              d={linePath(compareSeries, (p) => p.opex, false)}
              fill="none"
              stroke="#E57373"
              strokeWidth={2}
              strokeDasharray="5 4"
              opacity={0.55}
            />
          ) : null}
          {seriesOn.has("marginPct") ? (
            <path
              d={linePath(compareSeries, (p) => p.marginPct, true)}
              fill="none"
              stroke="#5DADE2"
              strokeWidth={2}
              strokeDasharray="5 4"
              opacity={0.55}
            />
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

function SankeyChart({ nodes, links }: { nodes: SankeyNode[]; links: SankeyLink[] }) {
  const W = 720;
  const H = 340;
  const cols = [0, 1, 2, 3];
  const colX = (c: number) => 40 + c * ((W - 80) / 3);
  const byCol = cols.map((c) => nodes.filter((n) => n.column === c));
  const positions = new Map<string, { x: number; y: number; h: number }>();

  for (const c of cols) {
    const list = byCol[c] || [];
    const total = list.reduce((s, n) => s + n.value, 0) || 1;
    const usable = H - 40;
    let y = 20;
    for (const n of list) {
      const h = Math.max(14, (n.value / total) * usable * 0.92);
      positions.set(n.id, { x: colX(c), y, h });
      y += h + 8;
    }
  }

  const pathFor = (link: SankeyLink) => {
    const s = positions.get(link.source);
    const t = positions.get(link.target);
    if (!s || !t) return "";
    const x1 = s.x + 110;
    const y1 = s.y + s.h / 2;
    const x2 = t.x;
    const y2 = t.y + t.h / 2;
    const mid = (x1 + x2) / 2;
    return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
  };

  if (!nodes.length) {
    return <EmptyChart label="No cash-flow data in this range" />;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={340} style={{ display: "block" }}>
      {links.map((l, i) => (
        <path
          key={i}
          d={pathFor(l)}
          fill="none"
          stroke={l.color}
          strokeWidth={Math.max(2, Math.min(28, l.value / 80))}
          opacity={0.55}
        />
      ))}
      {nodes.map((n) => {
        const p = positions.get(n.id);
        if (!p) return null;
        return (
          <g key={n.id}>
            <rect
              x={p.x}
              y={p.y}
              width={110}
              height={p.h}
              rx={6}
              fill={n.color}
              opacity={0.9}
            />
            <text x={p.x + 8} y={p.y + 14} fill="#0A192F" fontSize={10} fontWeight={700}>
              {n.label.slice(0, 16)}
            </text>
            <text x={p.x + 8} y={p.y + 28} fill="#0A192F" fontSize={10}>
              {money(n.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function WaterfallChart({ steps }: { steps: WaterfallStep[] }) {
  const W = 720;
  const H = 300;
  const pad = { t: 24, r: 20, b: 40, l: 48 };
  const maxAbs = Math.max(1, ...steps.map((s) => Math.abs(s.value), ...steps.map((s) => s.base + Math.abs(s.value))));
  const n = Math.max(1, steps.length);
  const slot = (W - pad.l - pad.r) / n;
  const barW = Math.min(48, slot * 0.55);
  const yScale = (v: number) => pad.t + ((maxAbs - v) / maxAbs) * (H - pad.t - pad.b);

  if (!steps.length) return <EmptyChart label="No P&L bridge for this range" />;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={300} style={{ display: "block" }}>
      {steps.map((s, i) => {
        const cx = pad.l + slot * i + slot / 2;
        const top = s.kind === "decrease" ? s.base + Math.abs(s.value) : s.base + (s.value > 0 ? s.value : 0);
        const bottom = s.kind === "decrease" ? s.base : s.kind === "result" || s.kind === "total" ? 0 : s.base;
        const y1 = yScale(Math.max(top, bottom));
        const y2 = yScale(Math.min(top, bottom));
        const h = Math.max(2, y2 - y1);
        const fill =
          s.kind === "decrease"
            ? SNAPSHOT_THEME.danger
            : s.kind === "result"
              ? SNAPSHOT_THEME.ok
              : SNAPSHOT_THEME.gold;
        return (
          <g key={s.id}>
            {i > 0 && s.kind === "decrease" ? (
              <line
                x1={pad.l + slot * (i - 1) + slot / 2 + barW / 2}
                x2={cx - barW / 2}
                y1={yScale(s.base + Math.abs(s.value))}
                y2={yScale(s.base + Math.abs(s.value))}
                stroke="rgba(212,175,55,0.35)"
                strokeDasharray="3 3"
              />
            ) : null}
            <rect x={cx - barW / 2} y={y1} width={barW} height={h} rx={3} fill={fill} opacity={0.9} />
            <text x={cx} y={H - 18} textAnchor="middle" fill={SNAPSHOT_THEME.mute} fontSize={9}>
              {s.label}
            </text>
            <text x={cx} y={y1 - 6} textAnchor="middle" fill={SNAPSHOT_THEME.ink} fontSize={10}>
              {money(s.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div
      style={{
        height: 280,
        display: "grid",
        placeItems: "center",
        color: SNAPSHOT_THEME.mute,
        fontSize: 13
      }}
    >
      {label}
    </div>
  );
}

const wrap: CSSProperties = {
  padding: "14px 16px 10px",
  borderRadius: 14,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "var(--card-surface)"
};

const toolbar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 8
};

function modeBtn(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
    background: active ? SNAPSHOT_THEME.goldSoft : "transparent",
    color: active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.mute,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };
}

const legendBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "var(--bg-nested)",
  color: SNAPSHOT_THEME.ink,
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 11,
  cursor: "pointer"
};

const dot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 99
};

const tooltip: CSSProperties = {
  position: "absolute",
  zIndex: 5,
  pointerEvents: "none",
  minWidth: 160,
  maxWidth: 260,
  padding: "8px 10px",
  borderRadius: 10,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "var(--card-surface)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  fontSize: 12
};
