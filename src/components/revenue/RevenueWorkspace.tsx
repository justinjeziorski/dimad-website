"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CategoryDetailModal, {
  type CategoryDetailSelection
} from "@/components/revenue/CategoryDetailModal";
import ManualEntryModal from "@/components/revenue/ManualEntryModal";
import RevenueExpenseChart from "@/components/revenue/RevenueExpenseChart";
import RevenueNav from "@/components/revenue/RevenueNav";
import {
  ChartSkeleton,
  KpiGridSkeleton,
  RevenueSkeletonStyles,
  SyncPill
} from "@/components/revenue/RevenueSkeletons";
import TimeRangeSelector from "@/components/shared/TimeRangeSelector";
import { authFetch } from "@/lib/auth/client";
import { useRevenueData } from "@/hooks/useRevenueData";
import {
  channelBreakdown,
  comparisonWindow,
  computeKpis,
  detectRecurringExpenses,
  filterLedger,
  formatDelta,
  money,
  runLocalAnalyst,
  timeframeWindow
} from "@/lib/revenue/ledgerEngine";
import {
  calculateGrossRevenue,
  calculateNetProfit,
  calculateNetRevenue,
  calculateProfitMargin,
  calculateTotalExpenses,
  calculatePeriodDelta
} from "@/lib/revenue/financialMath";
import { openForecastGoalInAccountability } from "@/lib/finances/forecastGoalBridge";
import { goRevenue } from "@/lib/revenue/nav";
import type {
  ComparisonMode,
  LedgerSource,
  ManualLedgerInput,
  UnifiedTransaction,
  ViewMode
} from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";
import type { CustomDateRange, DimadTimeframe } from "@/lib/utils/timeframeFilter";

const SOURCE_PILLS: { id: LedgerSource; label: string }[] = [
  { id: "stripe", label: "Stripe" },
  { id: "shopify", label: "Shopify" },
  { id: "gumroad", label: "Gumroad" },
  { id: "patreon", label: "Patreon" },
  { id: "lemon_squeezy", label: "Lemon Squeezy" },
  { id: "plaid", label: "Plaid Expenses" },
  { id: "manual", label: "Manual" }
];

export default function RevenueWorkspace() {
  const manualMenuRef = useRef<HTMLDivElement>(null);
  const { ledger, setLedger, usingMock, setUsingMock, syncing, refresh } = useRevenueData();
  const [timeframe, setTimeframe] = useState<DimadTimeframe>("30D");
  // Fixed placeholder for SSR; real window dates applied after mount to avoid hydration drift.
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
  const [compare, setCompare] = useState<ComparisonMode>("previous_period");
  const [viewMode, setViewMode] = useState<ViewMode>("consolidated");
  const [sources, setSources] = useState<Set<LedgerSource>>(new Set(SOURCE_PILLS.map((s) => s.id)));
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMenuOpen, setManualMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string; bullets: string[] } | null>(null);
  const [expenseTab, setExpenseTab] = useState<"all" | "recurring">("all");
  const [detail, setDetail] = useState<CategoryDetailSelection | null>(null);
  const [detailLedger, setDetailLedger] = useState<UnifiedTransaction[] | null>(null);
  // Instant cache/fallback always paints KPIs — never block on skeletons after welcome.
  const showSkeletons = false;

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!manualMenuRef.current?.contains(event.target as Node)) setManualMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
  const kpis = useMemo(() => {
    const base = computeKpis(filtered, previous);
    const grossRevenue = calculateGrossRevenue(filtered);
    const netRevenue = calculateNetRevenue(filtered);
    const totalExpenses = calculateTotalExpenses(filtered);
    const netProfit = calculateNetProfit(netRevenue, totalExpenses);
    const marginPct = calculateProfitMargin(netProfit, netRevenue);
    const prevGross = calculateGrossRevenue(previous);
    const prevNet = calculateNetRevenue(previous);
    const prevExp = calculateTotalExpenses(previous);
    const prevProfit = calculateNetProfit(prevNet, prevExp);
    return {
      ...base,
      grossRevenue,
      netRevenue,
      totalExpenses,
      netProfit,
      marginPct,
      deltas: {
        grossRevenue: calculatePeriodDelta(grossRevenue, prevGross),
        netRevenue: calculatePeriodDelta(netRevenue, prevNet),
        totalExpenses: calculatePeriodDelta(totalExpenses, prevExp),
        netProfit: calculatePeriodDelta(netProfit, prevProfit)
      }
    };
  }, [filtered, previous]);
  const channels = useMemo(() => channelBreakdown(filtered, previous), [filtered, previous]);
  const recurring = useMemo(
    () => detectRecurringExpenses(filtered.filter((r) => r.type === "EXPENSE")),
    [filtered]
  );
  const expenses = useMemo(() => filtered.filter((r) => r.type === "EXPENSE"), [filtered]);

  function toggleSource(id: LedgerSource) {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpenseExcluded(id: string) {
    setLedger((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const excluded = !row.excluded && row.businessPersonal !== "personal";
        return {
          ...row,
          excluded,
          businessPersonal: excluded ? "personal" : "business"
        };
      })
    );
  }

  async function saveManual(input: ManualLedgerInput & { id?: string }) {
    const method = input.id ? "PATCH" : "POST";
    const { res, data } = await authFetch("/api/revenue/manual", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!res.ok || data.ok === false) {
      const local: UnifiedTransaction = {
        id: input.id || `local_${Date.now()}`,
        userId: "user",
        type: input.type,
        source: "manual",
        platformLabel: input.platformLabel || "Manual Entry",
        amount: input.amount,
        currency: input.currency || "USD",
        category: input.category,
        isRecurring: Boolean(input.isRecurring),
        recurringInterval: input.recurringInterval,
        merchantOrCustomer: input.merchantOrCustomer,
        date: input.date,
        notes: input.notes,
        businessPersonal: "business"
      };
      setLedger((prev) => {
        if (input.id) return prev.map((row) => (row.id === input.id ? local : row));
        return [local, ...prev];
      });
      setUsingMock(false);
      return;
    }
    const entry = data.entry as UnifiedTransaction;
    setLedger((prev) => {
      if (input.id) return prev.map((row) => (row.id === input.id ? entry : row));
      return [entry, ...prev];
    });
    setUsingMock(false);
  }

  function runAi(chip: string) {
    setAiResult(runLocalAnalyst(chip, filtered));
    setAiOpen(true);
  }

  function openKpiDetail(label: string, categoryType: "REVENUE" | "EXPENSE" = "REVENUE") {
    setDetailLedger(null);
    setDetail({ categoryTitle: label, categoryType, match: "kpi" });
  }

  function openChannelDetail(platformLabel: string, source: LedgerSource) {
    const isExpense = source === "plaid";
    setDetailLedger(null);
    setDetail({
      categoryTitle: platformLabel,
      categoryType: isExpense ? "EXPENSE" : "REVENUE",
      match: "source",
      sourceId: source
    });
  }

  function openPeriodDetail(opts: {
    title: string;
    from: string;
    to: string;
    transactions: UnifiedTransaction[];
  }) {
    setDetailLedger(opts.transactions);
    setDetail({ categoryTitle: opts.title, categoryType: "REVENUE", match: "kpi" });
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

  return (
    <DashboardShell
      kicker="Finance"
      title="Revenue Command Center"
      subtitle="Institutional ledger across Stripe, Shopify, Lemon, Gumroad, Patreon, Plaid expenses, and manual entries."
      actions={
        <>
          <div ref={manualMenuRef} style={{ position: "relative" }}>
            <button type="button" style={btnStyle} onClick={() => setManualMenuOpen((v) => !v)}>
              Manual Entries ▾
            </button>
            {manualMenuOpen ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  minWidth: 180,
                  background: "#07101f",
                  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                  borderRadius: 12,
                  padding: 6,
                  zIndex: 20,
                  boxShadow: "0 18px 40px rgba(0,0,0,0.35)"
                }}
              >
                <button
                  type="button"
                  style={menuItem}
                  onClick={() => {
                    setManualMenuOpen(false);
                    setManualOpen(true);
                  }}
                >
                  + New Entry
                </button>
                <button
                  type="button"
                  style={menuItem}
                  onClick={() => {
                    setManualMenuOpen(false);
                    goRevenue("/dashboard/revenue/manual");
                  }}
                >
                  View
                </button>
              </div>
            ) : null}
          </div>
          <SyncPill syncing={syncing} />
          <button type="button" style={btnStyle} onClick={() => void refresh({ forceSync: true })}>
            Refresh
          </button>
          <button type="button" style={btnStyle} onClick={() => setAiOpen(true)}>
            AI Financial Analyst
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              /* Reports workspace lands next */
            }}
            title="Coming soon"
          >
            Reports
          </button>
        </>
      }
    >
      <RevenueSkeletonStyles />
      <RevenueNav active="overview" />
      {usingMock ? (
        <p style={{ margin: "0 0 12px", color: SNAPSHOT_THEME.mute, fontSize: 11 }}>
          Demo ledger active — connect integrations or add manual entries to replace mock data.
        </p>
      ) : null}

      {/* Sticky filters */}
      <section style={{ ...panelStyle, position: "sticky", top: 0, zIndex: 5, backdropFilter: "blur(8px)" }}>
        <div style={{ marginBottom: 10 }}>
          <TimeRangeSelector
            value={timeframe}
            customRange={customRange}
            onChange={setTimeframe}
            onCustomRangeChange={setCustomRange}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <button type="button" style={pill(compare === "previous_period")} onClick={() => setCompare("previous_period")}>
            vs Previous Period
          </button>
          <button type="button" style={pill(compare === "prior_year")} onClick={() => setCompare("prior_year")}>
            vs Prior Year
          </button>
          <span style={sep} />
          <button type="button" style={pill(viewMode === "consolidated")} onClick={() => setViewMode("consolidated")}>
            Consolidated
          </button>
          <button type="button" style={pill(viewMode === "per_channel")} onClick={() => setViewMode("per_channel")}>
            Per-Channel
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SOURCE_PILLS.map((s) => (
            <button key={s.id} type="button" onClick={() => toggleSource(s.id)} style={pill(sources.has(s.id))}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Executive KPIs */}
      {showSkeletons ? (
        <>
          <KpiGridSkeleton count={4} />
          <div style={{ marginTop: 12 }}>
            <KpiGridSkeleton count={4} />
          </div>
          <ChartSkeleton />
        </>
      ) : (
        <>
          <div style={grid4}>
            <Kpi
              label="Gross Revenue"
              value={money(kpis.grossRevenue)}
              delta={kpis.deltas.grossRevenue}
              hint={`${kpis.sourceCounts.revenue} revenue sources`}
              onClick={() => openKpiDetail("Gross Revenue", "REVENUE")}
              active={detail?.categoryTitle === "Gross Revenue"}
            />
            <Kpi
              label="Net Revenue"
              value={money(kpis.netRevenue)}
              delta={kpis.deltas.netRevenue}
              hint="After platform fees"
              onClick={() => openKpiDetail("Net Revenue", "REVENUE")}
              active={detail?.categoryTitle === "Net Revenue"}
            />
            <Kpi
              label="Total Expenses"
              value={money(kpis.totalExpenses)}
              delta={kpis.deltas.totalExpenses}
              hint={`${kpis.sourceCounts.expense} expense sources`}
              onClick={() => openKpiDetail("Total Expenses", "EXPENSE")}
              active={detail?.categoryTitle === "Total Expenses"}
            />
            <Kpi
              label="Net Profit"
              value={money(kpis.netProfit)}
              delta={kpis.deltas.netProfit}
              hint={`${kpis.marginPct.toFixed(1)}% margin`}
              onClick={() => openKpiDetail("Net Profit", "REVENUE")}
              active={detail?.categoryTitle === "Net Profit"}
            />
          </div>

          <div style={{ ...grid4, marginTop: 12 }}>
            <Kpi
              label="MRR"
              value={money(kpis.mrr)}
              hint={`One-time ${money(kpis.oneTimeRevenue)}`}
              onClick={() => openKpiDetail("MRR", "REVENUE")}
              active={detail?.categoryTitle === "MRR"}
            />
            <Kpi
              label="Average Order Value"
              value={money(kpis.aov)}
              hint="Across revenue rows"
              onClick={() => openKpiDetail("Average Order Value", "REVENUE")}
              active={detail?.categoryTitle === "Average Order Value"}
            />
            <Kpi
              label="Transaction Count"
              value={String(kpis.transactionCount)}
              hint="In selected window"
              onClick={() => openKpiDetail("Transaction Count", "REVENUE")}
              active={detail?.categoryTitle === "Transaction Count"}
            />
            <Kpi
              label="Monthly Recurring Burn"
              value={money(kpis.monthlyRecurringBurn)}
              hint="Detected subscriptions"
              onClick={() => openKpiDetail("Monthly Recurring Burn", "EXPENSE")}
              active={detail?.categoryTitle === "Monthly Recurring Burn"}
            />
          </div>

          <RevenueExpenseChart
            transactions={ledger}
            sources={sources}
            timeframe={timeframe}
            customRange={customRange}
            onTimeframeChange={setTimeframe}
            onCustomRangeChange={setCustomRange}
            hideTimeframe
            onDrillPeriod={openPeriodDetail}
            onSimulateForecast={() => openKpiDetail("Net Profit", "REVENUE")}
          />
        </>
      )}

      {/* Channel table */}
      <section style={{ ...panelStyle, marginTop: 14 }}>
        <p style={labelStyle}>Channel performance</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: SNAPSHOT_THEME.mute, textAlign: "left" }}>
                {["Channel", "Gross", "Fees", "Net", "Share", "AOV", "Growth"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => {
                const selected = detail?.sourceId === c.source;
                return (
                  <tr
                    key={c.source}
                    onClick={() => openChannelDetail(c.platformLabel, c.source)}
                    style={{
                      borderTop: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                      cursor: "pointer",
                      background: selected ? SNAPSHOT_THEME.goldSoft : "transparent"
                    }}
                  >
                    <td style={{ ...tdStyle, color: selected ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.ink, fontWeight: 700 }}>
                      {c.platformLabel}
                    </td>
                    <td style={tdStyle}>{money(c.gross)}</td>
                    <td style={tdStyle}>{money(c.fees)}</td>
                    <td style={tdStyle}>{money(c.net)}</td>
                    <td style={tdStyle}>{c.sharePct.toFixed(1)}%</td>
                    <td style={tdStyle}>{money(c.aov)}</td>
                    <td style={tdStyle}>{formatDelta(c.growthPct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expenses & subscriptions */}
      <section style={{ ...panelStyle, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <p style={labelStyle}>Expenses & Subscriptions</p>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={pill(expenseTab === "all")} onClick={() => setExpenseTab("all")}>
              All expenses
            </button>
            <button type="button" style={pill(expenseTab === "recurring")} onClick={() => setExpenseTab("recurring")}>
              Recurring
            </button>
          </div>
        </div>
        {expenseTab === "recurring" ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {recurring.length ? (
              recurring.map((r) => (
                <button
                  key={r.merchant}
                  type="button"
                  onClick={() =>
                    setDetail({
                      categoryTitle: r.merchant,
                      categoryType: "EXPENSE",
                      match: "category"
                    })
                  }
                  style={{
                    ...rowCard,
                    width: "100%",
                    font: "inherit",
                    color: "inherit",
                    cursor: "pointer",
                    border:
                      detail?.categoryTitle === r.merchant
                        ? `1px solid ${SNAPSHOT_THEME.gold}`
                        : `1px solid ${SNAPSHOT_THEME.navyLine}`,
                    background:
                      detail?.categoryTitle === r.merchant ? SNAPSHOT_THEME.goldSoft : rowCard.background
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <strong style={{ fontSize: 13 }}>{r.merchant}</strong>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: SNAPSHOT_THEME.mute }}>
                      {r.interval} · confidence {(r.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{money(r.monthlyAmount)}/mo</div>
                    <div style={{ fontSize: 11, color: SNAPSHOT_THEME.mute }}>{money(r.annualizedAmount)}/yr</div>
                  </div>
                </button>
              ))
            ) : (
              <p style={{ color: SNAPSHOT_THEME.mute, fontSize: 12 }}>No recurring merchants detected in this window.</p>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {expenses.slice(0, 40).map((row) => {
              const personal = row.excluded || row.businessPersonal === "personal";
              return (
                <div key={row.id} style={rowCard}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{row.merchantOrCustomer || row.platformLabel}</strong>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: SNAPSHOT_THEME.mute }}>
                      {row.date.slice(0, 10)} · {row.category} · {row.platformLabel}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <strong>{money(row.amount)}</strong>
                    <button type="button" style={pill(!personal)} onClick={() => toggleExpenseExcluded(row.id)}>
                      {personal ? "Excluded / Personal" : "Business"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ManualEntryModal open={manualOpen} onClose={() => setManualOpen(false)} onSave={saveManual} />

      {detail ? (
        <CategoryDetailModal
          categoryTitle={detail.categoryTitle}
          categoryType={detail.categoryType}
          match={detail.match}
          sourceId={detail.sourceId}
          transactions={detailLedger || filtered}
          onClose={() => {
            setDetail(null);
            setDetailLedger(null);
          }}
          onConvertToGoal={openForecastGoalComposer}
        />
      ) : null}

      {aiOpen ? (
        <div
          role="dialog"
          aria-modal
          onClick={() => setAiOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(4,8,16,0.55)",
            display: "flex",
            justifyContent: "flex-end"
          }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(400px, 100%)",
              height: "100%",
              background: SNAPSHOT_THEME.navy,
              borderLeft: `1px solid ${SNAPSHOT_THEME.navyLine}`,
              padding: 18,
              overflowY: "auto"
            }}
          >
            <p style={labelStyle}>AI Financial Analyst</p>
            <h3 style={{ margin: "4px 0 12px", fontSize: 16 }}>Quick audits</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {["Scan recurring subscriptions", "Analyze profit margins", "Compare channel performance"].map((chip) => (
                <button key={chip} type="button" style={pill(false)} onClick={() => runAi(chip)}>
                  {chip}
                </button>
              ))}
            </div>
            {aiResult ? (
              <div style={{ ...panelStyle, padding: 14 }}>
                <h4 style={{ margin: "0 0 8px", color: SNAPSHOT_THEME.gold, fontSize: 12 }}>{aiResult.title}</h4>
                <ul style={{ margin: 0, paddingLeft: 16, color: SNAPSHOT_THEME.ink, fontSize: 12, lineHeight: 1.5 }}>
                  {aiResult.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p style={{ color: SNAPSHOT_THEME.mute, fontSize: 12 }}>
                Deterministic local analysis on the filtered ledger — ready to swap for live LLM calls later.
              </p>
            )}
          </aside>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function Kpi({
  label,
  value,
  delta,
  hint,
  onClick,
  active
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...panelStyle,
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        border: `1px solid ${active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
        background: active ? SNAPSHOT_THEME.goldSoft : panelStyle.background,
        width: "100%",
        font: "inherit",
        color: "inherit",
        transition: "border-color 160ms ease, background 160ms ease"
      }}
    >
      <p style={labelStyle}>{label}</p>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</div>
      {delta != null ? (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: delta >= 0 ? SNAPSHOT_THEME.ok : SNAPSHOT_THEME.danger }}>
          {formatDelta(delta)}
        </p>
      ) : null}
      {hint ? <p style={{ margin: "4px 0 0", fontSize: 10, color: SNAPSHOT_THEME.mute }}>{hint}</p> : null}
    </button>
  );
}

const panelStyle: CSSProperties = {
  background: "rgba(17, 34, 64, 0.72)",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 16,
  padding: 16
};

const labelStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold,
  fontWeight: 700
};

const grid4: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 14
};

const thStyle: CSSProperties = { padding: "8px 6px", fontWeight: 600 };
const tdStyle: CSSProperties = { padding: "10px 6px", color: SNAPSHOT_THEME.ink };

const rowCard: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 12,
  padding: "10px 12px",
  background: "rgba(7,16,31,0.35)"
};

const btnStyle: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.gold}`,
  background: SNAPSHOT_THEME.goldSoft,
  color: SNAPSHOT_THEME.gold,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer"
};

const sep: CSSProperties = { width: 1, height: 18, background: SNAPSHOT_THEME.navyLine };

const menuItem: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: 0,
  background: "transparent",
  color: SNAPSHOT_THEME.gold,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer"
};

function pill(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
    background: active ? SNAPSHOT_THEME.goldSoft : "transparent",
    color: active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.mute,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };
}
