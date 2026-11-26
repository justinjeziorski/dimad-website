"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import AIFinancialInsights from "@/components/finances/AIFinancialInsights";
import EmailDispatchModal from "@/components/finances/EmailDispatchModal";
import FinanceFilters from "@/components/finances/FinanceFilters";
import FinancialChartWorkspace from "@/components/finances/FinancialChartWorkspace";
import FinancesNav from "@/components/finances/FinancesNav";
import CategoryDetailModal, {
  type CategoryDetailSelection
} from "@/components/revenue/CategoryDetailModal";
import { SyncPill } from "@/components/revenue/RevenueSkeletons";
import { useRevenueData } from "@/hooks/useRevenueData";
import {
  buildExecutiveBriefing,
  channelBreakdown,
  comparisonWindow,
  computeKpis,
  detectRecurringExpenses,
  estimateRunwayMonths,
  filterLedger,
  formatDelta,
  groupByFinanceGranularity,
  money,
  partitionLedger,
  timeframeWindow
} from "@/lib/finances/ledgerEngine";
import {
  exportFinanceCsv,
  exportFinancePdf,
  exportFinanceXlsx
} from "@/lib/finances/exportUtils";
import { resolveConnectedChannels } from "@/lib/finances/connectedChannels";
import { openForecastGoalInAccountability } from "@/lib/finances/forecastGoalBridge";
import type {
  FinanceGrouping,
  FinancePrimaryMetric
} from "@/lib/finances/types";
import type { ComparisonMode, LedgerSource, ViewMode } from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";
import type { CustomDateRange, DimadTimeframe } from "@/lib/utils/timeframeFilter";

const ALL_SOURCES = new Set<LedgerSource>([
  "stripe",
  "shopify",
  "gumroad",
  "patreon",
  "lemon_squeezy",
  "plaid",
  "manual"
]);

export default function FinancesCommandCenter() {
  const { ledger, usingMock, syncing, refresh, fromCache } = useRevenueData();
  const [timeframe, setTimeframe] = useState<DimadTimeframe>("30D");
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    startDate: "1970-01-01",
    endDate: "1970-01-30"
  });
  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    setCustomRange({
      startDate: from.toISOString().slice(0, 10),
      endDate: to.toISOString().slice(0, 10)
    });
  }, []);

  const [sources, setSources] = useState<Set<LedgerSource>>(() => new Set(ALL_SOURCES));
  const [compare, setCompare] = useState<ComparisonMode>("prior_month");
  const [primaryMetric, setPrimaryMetric] = useState<FinancePrimaryMetric>("gross_revenue");
  const [grouping, setGrouping] = useState<FinanceGrouping>("weekly");
  const [viewMode, setViewMode] = useState<ViewMode>("consolidated");

  const connectedSources = useMemo(
    () => resolveConnectedChannels(ledger, usingMock),
    [ledger, usingMock]
  );
  const prevConnectedRef = useRef<Set<LedgerSource>>(new Set());

  useEffect(() => {
    setSources((prev) => {
      const next = new Set<LedgerSource>();
      for (const id of connectedSources) {
        const wasConnected = prevConnectedRef.current.has(id);
        if (prev.has(id) || !wasConnected) next.add(id);
      }
      if (next.size === 0) {
        for (const id of connectedSources) next.add(id);
      }
      prevConnectedRef.current = new Set(connectedSources);
      return next;
    });
  }, [connectedSources]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<"pdf" | "xlsx" | "csv" | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CategoryDetailSelection | null>(null);

  const windowRange = useMemo(
    () =>
      timeframeWindow(timeframe, {
        from: customRange.startDate,
        to: customRange.endDate
      }),
    [timeframe, customRange]
  );
  const prevRange = useMemo(
    () => comparisonWindow(windowRange.from, windowRange.to, compare),
    [windowRange, compare]
  );

  const filtered = useMemo(
    () => filterLedger(ledger, { from: windowRange.from, to: windowRange.to, sources }),
    [ledger, windowRange, sources]
  );
  const previous = useMemo(
    () => filterLedger(ledger, { from: prevRange.from, to: prevRange.to, sources }),
    [ledger, prevRange, sources]
  );

  const kpis = useMemo(() => computeKpis(filtered, previous), [filtered, previous]);
  const partition = useMemo(() => partitionLedger(filtered), [filtered]);
  const channels = useMemo(() => channelBreakdown(filtered, previous), [filtered, previous]);
  const recurring = useMemo(
    () => detectRecurringExpenses(filtered.filter((r) => r.type === "EXPENSE")),
    [filtered]
  );
  const briefing = useMemo(
    () => buildExecutiveBriefing(filtered, previous),
    [filtered, previous]
  );
  const buckets = useMemo(
    () => groupByFinanceGranularity(filtered, grouping),
    [filtered, grouping]
  );
  const compareBuckets = useMemo(
    () => groupByFinanceGranularity(previous, grouping),
    [previous, grouping]
  );
  const compareLabel = compare === "prior_year" ? "Prior Year" : "Prior Month";

  const runway = useMemo(() => {
    const cashProxy = Math.max(0, partition.netProfit) + kpis.mrr * 2;
    return estimateRunwayMonths(cashProxy, kpis.monthlyRecurringBurn || partition.opexTotal / 1);
  }, [partition, kpis]);

  const periodLabel = useMemo(() => {
    if (timeframe === "Custom") {
      return `${customRange.startDate} → ${customRange.endDate}`;
    }
    return timeframe;
  }, [timeframe, customRange]);

  const varianceBadge = useMemo(() => {
    const vs = compare === "prior_year" ? "vs prior year" : "vs prior month";
    const map: Record<FinancePrimaryMetric, { label: string; pct: number | null }> = {
      gross_revenue: { label: `${vs} · Gross`, pct: kpis.deltas.grossRevenue },
      net_profit: { label: `${vs} · Profit`, pct: kpis.deltas.netProfit },
      operating_expenses: { label: `${vs} · OpEx`, pct: kpis.deltas.totalExpenses },
      burn_rate: { label: `${vs} · Burn`, pct: kpis.deltas.totalExpenses },
      runway: { label: `${vs} · Profit`, pct: kpis.deltas.netProfit }
    };
    return map[primaryMetric];
  }, [primaryMetric, kpis.deltas, compare]);

  const primaryValue = useMemo(() => {
    switch (primaryMetric) {
      case "net_profit":
        return money(kpis.netProfit);
      case "operating_expenses":
        return money(kpis.totalExpenses);
      case "burn_rate":
        return `${money(kpis.monthlyRecurringBurn)}/mo`;
      case "runway":
        return runway == null ? "∞" : `${runway.toFixed(1)} mo`;
      default:
        return money(kpis.grossRevenue);
    }
  }, [primaryMetric, kpis, runway]);

  const toggleSource = (source: LedgerSource) => {
    if (!connectedSources.has(source)) return;
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      if (next.size === 0) return prev;
      return next;
    });
  };

  function openKpiDetail(label: string, categoryType: "REVENUE" | "EXPENSE" = "REVENUE") {
    setDetail({ categoryTitle: label, categoryType, match: "kpi" });
  }

  const primaryForecastTarget = useMemo(() => {
    const map: Record<FinancePrimaryMetric, { label: string; type: "REVENUE" | "EXPENSE" }> = {
      gross_revenue: { label: "Gross Revenue", type: "REVENUE" },
      net_profit: { label: "Net Profit", type: "REVENUE" },
      operating_expenses: { label: "OpEx", type: "EXPENSE" },
      burn_rate: { label: "Monthly Recurring Burn", type: "EXPENSE" },
      runway: { label: "Net Profit", type: "REVENUE" }
    };
    return map[primaryMetric];
  }, [primaryMetric]);

  function openPrimaryForecast() {
    openKpiDetail(primaryForecastTarget.label, primaryForecastTarget.type);
  }

  function openForecastGoalComposer(goalData: {
    title: string;
    targetValue: number;
    deadline: string;
    forecastGrowth: number;
    forecastMonths: number;
    categoryTitle: string;
    categoryType: "REVENUE" | "EXPENSE";
  }) {
    openForecastGoalInAccountability({
      text: goalData.title,
      targetValue: goalData.targetValue,
      deadline: goalData.deadline,
      forecastGrowth: goalData.forecastGrowth,
      forecastMonths: goalData.forecastMonths,
      categoryTitle: goalData.categoryTitle,
      categoryType: goalData.categoryType,
      horizon: "one_time",
      recurring: false
    });
    setDetail(null);
  }

  const chartSeries = useMemo(
    () =>
      buckets.map((b) => {
        const p = partitionLedger(b.items);
        return {
          Period: b.label,
          "Gross Revenue": p.grossRevenueTotal,
          "Net Profit": p.netProfit,
          OpEx: p.opexTotal,
          COGS: p.cogsTotal,
          Fees: p.fees
        };
      }),
    [buckets]
  );

  const runExport = async (kind: "pdf" | "xlsx" | "csv") => {
    if (typeof window === "undefined") return;
    setExportError(null);
    setExportBusy(kind);
    if (kind === "pdf") setIsExporting(true);
    try {
      if (kind === "csv") {
        exportFinanceCsv(filtered);
      } else if (kind === "pdf") {
        // Yield so the loading banner paints before html2canvas freezes the main thread.
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await exportFinancePdf({
          rootId: "finance-command-center",
          payload: {
            periodLabel,
            kpis: {
              grossRevenue: kpis.grossRevenue,
              netRevenue: kpis.netRevenue,
              totalExpenses: kpis.totalExpenses,
              netProfit: kpis.netProfit,
              marginPct: kpis.marginPct,
              mrr: kpis.mrr,
              oneTimeRevenue: kpis.oneTimeRevenue,
              monthlyRecurringBurn: kpis.monthlyRecurringBurn
            },
            partition,
            ledger: filtered,
            briefing,
            chartSeries
          }
        });
      } else {
        await exportFinanceXlsx({
          kpis,
          channels,
          recurring,
          ledger: filtered,
          chartSeries
        });
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportBusy(null);
      setIsExporting(false);
    }
  };

  return (
    <div
      id="finance-command-center"
      style={{ padding: "16px 16px 28px", fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
    >
      <FinancesNav active="finances" />

      <header style={header}>
        <div>
          <div style={eyebrow}>Finances Command Center</div>
          <h1 style={h1}>Institutional cash-flow intelligence</h1>
          <p style={sub}>
            Unified Stripe · Shopify · Plaid · Manual ledger — cache-first paint
            {fromCache ? " · restored from snapshot" : ""}
            {usingMock ? " · demo data until platforms sync" : ""}
          </p>
        </div>
        <div
          data-pdf-hide
          style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
        >
          <SyncPill syncing={syncing} />
          <button type="button" style={ghostBtn} onClick={() => void refresh({ forceSync: true })}>
            Sync
          </button>
          <button type="button" style={ghostBtn} onClick={() => { /* Receipts — context TBD */ }}>
            Receipts
          </button>
          <button
            type="button"
            style={ghostBtn}
            disabled={!!exportBusy || isExporting}
            onClick={() => void runExport("pdf")}
          >
            {isExporting || exportBusy === "pdf" ? "Generating…" : "PDF Report"}
          </button>
          <button
            type="button"
            style={ghostBtn}
            disabled={!!exportBusy || isExporting}
            onClick={() => void runExport("xlsx")}
          >
            {exportBusy === "xlsx" ? "Excel…" : "Excel"}
          </button>
          <button
            type="button"
            style={ghostBtn}
            disabled={!!exportBusy || isExporting}
            onClick={() => void runExport("csv")}
          >
            CSV
          </button>
          <button type="button" style={primaryBtn} onClick={() => setEmailOpen(true)}>
            Email
          </button>
        </div>
      </header>

      {isExporting ? (
        <div
          data-pdf-hide
          role="status"
          aria-live="polite"
          style={{
            marginBottom: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
            background: SNAPSHOT_THEME.goldSoft,
            color: SNAPSHOT_THEME.gold,
            fontSize: 12,
            fontWeight: 700
          }}
        >
          Generating executive PDF snapshot…
        </div>
      ) : null}

      {exportError ? (
        <div style={{ color: SNAPSHOT_THEME.danger, fontSize: 12, marginBottom: 10 }}>{exportError}</div>
      ) : null}

      <FinanceFilters
        timeframe={timeframe}
        customRange={customRange}
        onTimeframeChange={setTimeframe}
        onCustomRangeChange={setCustomRange}
        sources={sources}
        onToggleSource={toggleSource}
        connectedSources={connectedSources}
        compare={compare}
        onCompareChange={setCompare}
        primaryMetric={primaryMetric}
        onPrimaryMetricChange={setPrimaryMetric}
        grouping={grouping}
        onGroupingChange={setGrouping}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        varianceBadge={varianceBadge}
      />

      <div style={kpiGrid}>
        <Kpi
          label="Primary"
          value={primaryValue}
          hint={varianceBadge ? formatDelta(varianceBadge.pct) : undefined}
          onClick={openPrimaryForecast}
          active={detail?.categoryTitle === primaryForecastTarget.label}
        />
        <Kpi
          label="Gross Revenue"
          value={money(kpis.grossRevenue)}
          hint={formatDelta(kpis.deltas.grossRevenue)}
          onClick={() => openKpiDetail("Gross Revenue", "REVENUE")}
          active={detail?.categoryTitle === "Gross Revenue"}
        />
        <Kpi
          label="Net Profit"
          value={money(kpis.netProfit)}
          hint={formatDelta(kpis.deltas.netProfit)}
          onClick={() => openKpiDetail("Net Profit", "REVENUE")}
          active={detail?.categoryTitle === "Net Profit"}
        />
        <Kpi
          label="OpEx"
          value={money(partition.opexTotal)}
          hint={formatDelta(kpis.deltas.totalExpenses)}
          onClick={() => openKpiDetail("OpEx", "EXPENSE")}
          active={detail?.categoryTitle === "OpEx"}
        />
        <Kpi
          label="MRR"
          value={money(partition.mrrTotal)}
          onClick={() => openKpiDetail("MRR", "REVENUE")}
          active={detail?.categoryTitle === "MRR"}
        />
        <Kpi
          label="Margin"
          value={`${kpis.marginPct.toFixed(1)}%`}
          onClick={() => openKpiDetail("Margin", "REVENUE")}
          active={detail?.categoryTitle === "Margin"}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <AIFinancialInsights briefing={briefing} syncing={syncing} />
      </div>

      <div style={{ marginTop: 14 }}>
        <FinancialChartWorkspace
          rows={filtered}
          buckets={buckets}
          compareBuckets={compareBuckets}
          compareLabel={compareLabel}
          viewMode={viewMode}
          enabledSources={sources}
        />
      </div>

      <div style={split}>
        <section style={panel}>
          <h3 style={panelTitle}>P&amp;L partition</h3>
          <table style={table}>
            <tbody>
              <Row label="Gross Revenue" value={money(partition.grossRevenueTotal)} />
              <Row label="Platform Fees" value={`(${money(partition.fees)})`} />
              <Row label="COGS" value={`(${money(partition.cogsTotal)})`} />
              <Row label="Operating Expenses" value={`(${money(partition.opexTotal)})`} />
              <Row label="Net Operating Income" value={money(partition.netProfit)} strong />
              <Row label="Recurring MRR" value={money(partition.mrrTotal)} />
              <Row label="One-time sales" value={money(partition.oneTimeTotal)} />
            </tbody>
          </table>
        </section>
        <section style={panel}>
          <h3 style={panelTitle}>Channel mix</h3>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Channel</th>
                <th style={th}>Net</th>
                <th style={th}>Share</th>
                <th style={th}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.source}>
                  <td style={td}>{c.platformLabel}</td>
                  <td style={td}>{money(c.net)}</td>
                  <td style={td}>{c.sharePct.toFixed(1)}%</td>
                  <td style={td}>{formatDelta(c.growthPct)}</td>
                </tr>
              ))}
              {!channels.length ? (
                <tr>
                  <td style={td} colSpan={4}>
                    No channel activity in range
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>

      <EmailDispatchModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        periodLabel={periodLabel}
        kpis={{
          grossRevenue: kpis.grossRevenue,
          netProfit: kpis.netProfit,
          marginPct: kpis.marginPct,
          mrr: kpis.mrr,
          monthlyRecurringBurn: kpis.monthlyRecurringBurn
        }}
        briefing={briefing}
      />

      {detail ? (
        <CategoryDetailModal
          categoryTitle={detail.categoryTitle}
          categoryType={detail.categoryType}
          match={detail.match}
          sourceId={detail.sourceId}
          transactions={filtered}
          onClose={() => setDetail(null)}
          onConvertToGoal={openForecastGoalComposer}
        />
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  onClick,
  active
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...kpiCard,
        border: `1px solid ${active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
        background: active ? SNAPSHOT_THEME.goldSoft : "var(--bg-nested)",
        cursor: onClick ? "pointer" : "default",
        width: "100%",
        font: "inherit",
        color: "inherit",
        textAlign: "left",
        transition: "border-color 160ms ease, background 160ms ease"
      }}
    >
      <div style={kpiLabel}>{label}</div>
      <div style={kpiValue}>{value}</div>
      {hint ? <div style={kpiHint}>{hint}</div> : null}
    </button>
  );
}

function Row({
  label,
  value,
  strong
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <tr>
      <td style={{ ...td, fontWeight: strong ? 700 : 500 }}>{label}</td>
      <td style={{ ...td, textAlign: "right", fontWeight: strong ? 800 : 600 }}>{value}</td>
    </tr>
  );
}

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "flex-start",
  marginBottom: 14
};

const eyebrow: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold
};

const h1: CSSProperties = {
  margin: "4px 0 6px",
  fontSize: 22,
  fontWeight: 800,
  color: SNAPSHOT_THEME.ink
};

const sub: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: SNAPSHOT_THEME.mute,
  maxWidth: 520,
  lineHeight: 1.45
};

const ghostBtn: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "transparent",
  color: SNAPSHOT_THEME.mute,
  borderRadius: 10,
  padding: "7px 11px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer"
};

const primaryBtn: CSSProperties = {
  ...ghostBtn,
  border: `1px solid ${SNAPSHOT_THEME.gold}`,
  background: SNAPSHOT_THEME.goldSoft,
  color: SNAPSHOT_THEME.gold
};

const kpiGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
  marginTop: 14
};

const kpiCard: CSSProperties = {
  borderRadius: 12,
  padding: "12px 14px"
};

const kpiLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.mute,
  fontWeight: 700
};

const kpiValue: CSSProperties = {
  marginTop: 6,
  fontSize: 18,
  fontWeight: 800,
  color: SNAPSHOT_THEME.ink
};

const kpiHint: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: SNAPSHOT_THEME.mute
};

const split: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
  marginTop: 14
};

const panel: CSSProperties = {
  borderRadius: 14,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "var(--bg-nested)",
  padding: "12px 14px"
};

const panelTitle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12
};

const th: CSSProperties = {
  textAlign: "left",
  color: SNAPSHOT_THEME.mute,
  fontWeight: 700,
  padding: "4px 0",
  borderBottom: `1px solid ${SNAPSHOT_THEME.navyLine}`
};

const td: CSSProperties = {
  padding: "7px 0",
  borderBottom: `1px solid rgba(212,175,55,0.08)`,
  color: SNAPSHOT_THEME.ink
};
