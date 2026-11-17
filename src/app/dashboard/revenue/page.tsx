"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CategoryDetailModal, {
  type CategoryDetailSelection
} from "@/components/revenue/CategoryDetailModal";
import ManualEntryModal from "@/components/revenue/ManualEntryModal";
import RevenueNav from "@/components/revenue/RevenueNav";
import { authFetch } from "@/lib/dimad-auth-client";
import { adaptLivePayloads } from "@/lib/revenue/adapters";
import {
  channelBreakdown,
  comparisonWindow,
  computeKpis,
  detectRecurringExpenses,
  filterLedger,
  formatDelta,
  generateMockLedger,
  money,
  runLocalAnalyst,
  seriesByDay,
  timeframeWindow
} from "@/lib/revenue/ledgerEngine";
import { goRevenue } from "@/lib/revenue/nav";
import type {
  ComparisonMode,
  LedgerSource,
  ManualLedgerInput,
  RevenueTimeframe,
  UnifiedTransaction,
  ViewMode
} from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";

const TIMEFRAMES: RevenueTimeframe[] = ["7D", "30D", "MTD", "QTD", "YTD", "1Y", "CUSTOM"];
const SOURCE_PILLS: { id: LedgerSource; label: string }[] = [
  { id: "stripe", label: "Stripe" },
  { id: "shopify", label: "Shopify" },
  { id: "gumroad", label: "Gumroad" },
  { id: "patreon", label: "Patreon" },
  { id: "lemon_squeezy", label: "Lemon Squeezy" },
  { id: "plaid", label: "Plaid Expenses" },
  { id: "manual", label: "Manual" }
];

export default function RevenueWorkspacePage() {
  const manualMenuRef = useRef<HTMLDivElement>(null);
  const [ledger, setLedger] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [timeframe, setTimeframe] = useState<RevenueTimeframe>("30D");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [compare, setCompare] = useState<ComparisonMode>("previous_period");
  const [viewMode, setViewMode] = useState<ViewMode>("consolidated");
  const [sources, setSources] = useState<Set<LedgerSource>>(new Set(SOURCE_PILLS.map((s) => s.id)));
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMenuOpen, setManualMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string; bullets: string[] } | null>(null);
  const [expenseTab, setExpenseTab] = useState<"all" | "recurring">("all");
  const [chartMode, setChartMode] = useState<"line" | "stacked">("line");
  const [detail, setDetail] = useState<CategoryDetailSelection | null>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!manualMenuRef.current?.contains(event.target as Node)) setManualMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stripe, shopify, gumroad, patreon, lemon, plaid, manual] = await Promise.all([
        authFetch("/api/integrations/stripe/metrics"),
        authFetch("/api/shopify/data?range=month"),
        authFetch("/api/gumroad/data"),
        authFetch("/api/patreon/data"),
        authFetch("/api/lemonsqueezy/data"),
        authFetch("/api/plaid/data"),
        authFetch("/api/revenue/manual")
      ]);
      const uid = "user";
      const live = adaptLivePayloads(uid, {
        stripe: stripe.data as Record<string, unknown>,
        shopify: shopify.data as Record<string, unknown>,
        gumroad: gumroad.data as Record<string, unknown>,
        patreon: patreon.data as Record<string, unknown>,
        lemon: lemon.data as Record<string, unknown>,
        plaid: plaid.data as Record<string, unknown>
      });
      const manualEntries = Array.isArray((manual.data as { entries?: UnifiedTransaction[] }).entries)
        ? ((manual.data as { entries: UnifiedTransaction[] }).entries || [])
        : [];
      const combined = [...live, ...manualEntries];
      if (combined.length) {
        setLedger(combined);
        setUsingMock(false);
      } else {
        setLedger(generateMockLedger(uid));
        setUsingMock(true);
      }
    } catch {
      setLedger(generateMockLedger("demo"));
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const windowRange = useMemo(
    () => timeframeWindow(timeframe, { from: customFrom, to: customTo }),
    [timeframe, customFrom, customTo]
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
  const channels = useMemo(() => channelBreakdown(filtered, previous), [filtered, previous]);
  const recurring = useMemo(
    () => detectRecurringExpenses(filtered.filter((r) => r.type === "EXPENSE")),
    [filtered]
  );
  const series = useMemo(
    () => seriesByDay(filtered, windowRange.from, windowRange.to),
    [filtered, windowRange]
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
    setDetail({ categoryTitle: label, categoryType, match: "kpi" });
  }

  function openChannelDetail(platformLabel: string, source: LedgerSource) {
    const isExpense = source === "plaid";
    setDetail({
      categoryTitle: platformLabel,
      categoryType: isExpense ? "EXPENSE" : "REVENUE",
      match: "source",
      sourceId: source
    });
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
    const payload = {
      type: "dimad-open-forecast-goal",
      goal: {
        text: goalData.title,
        targetValue: goalData.targetValue,
        deadline: goalData.deadline,
        forecastGrowth: goalData.forecastGrowth,
        forecastMonths: goalData.forecastMonths,
        categoryTitle: goalData.categoryTitle,
        categoryType: goalData.categoryType,
        horizon: "one_time",
        recurring: false
      }
    };
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, window.location.origin);
    } else {
      const host = window as unknown as {
        DIMAD_GOALS?: { openComposerFromForecast?: (g: unknown) => void };
      };
      if (typeof host.DIMAD_GOALS?.openComposerFromForecast === "function") {
        host.DIMAD_GOALS.openComposerFromForecast(payload.goal);
      } else {
        throw new Error("Open Revenue from the Command Center to create goals.");
      }
    }
    setDetail(null);
  }

  const maxSeries = Math.max(1, ...series.map((d) => Math.max(d.revenue, d.expenses, Math.abs(d.profit))));

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
      <RevenueNav active="overview" />
      {usingMock ? (
        <p style={{ margin: "0 0 12px", color: SNAPSHOT_THEME.mute, fontSize: 11 }}>
          Demo ledger active — connect integrations or add manual entries to replace mock data.
        </p>
      ) : null}

      {/* Sticky filters */}
      <section style={{ ...panelStyle, position: "sticky", top: 0, zIndex: 5, backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              style={pill(timeframe === tf)}
            >
              {tf === "CUSTOM" ? "Custom" : tf}
            </button>
          ))}
          <span style={sep} />
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
        {timeframe === "CUSTOM" ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: SNAPSHOT_THEME.mute }}>
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={dateInput}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: SNAPSHOT_THEME.mute }}>
              To
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={dateInput} />
            </label>
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SOURCE_PILLS.map((s) => (
            <button key={s.id} type="button" onClick={() => toggleSource(s.id)} style={pill(sources.has(s.id))}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Executive KPIs */}
      <div style={grid4}>
        <Kpi
          label="Gross Revenue"
          value={loading ? "…" : money(kpis.grossRevenue)}
          delta={kpis.deltas.grossRevenue}
          hint={`${kpis.sourceCounts.revenue} revenue sources`}
          onClick={() => openKpiDetail("Gross Revenue", "REVENUE")}
          active={detail?.categoryTitle === "Gross Revenue"}
        />
        <Kpi
          label="Net Revenue"
          value={loading ? "…" : money(kpis.netRevenue)}
          delta={kpis.deltas.netRevenue}
          hint="After platform fees"
          onClick={() => openKpiDetail("Net Revenue", "REVENUE")}
          active={detail?.categoryTitle === "Net Revenue"}
        />
        <Kpi
          label="Total Expenses"
          value={loading ? "…" : money(kpis.totalExpenses)}
          delta={kpis.deltas.totalExpenses}
          hint={`${kpis.sourceCounts.expense} expense sources`}
          onClick={() => openKpiDetail("Total Expenses", "EXPENSE")}
          active={detail?.categoryTitle === "Total Expenses"}
        />
        <Kpi
          label="Net Profit"
          value={loading ? "…" : money(kpis.netProfit)}
          delta={kpis.deltas.netProfit}
          hint={`${kpis.marginPct.toFixed(1)}% margin`}
          onClick={() => openKpiDetail("Net Profit", "REVENUE")}
          active={detail?.categoryTitle === "Net Profit"}
        />
      </div>

      {/* Velocity row */}
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

      {/* Chart */}
      <section style={{ ...panelStyle, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <p style={labelStyle}>Revenue vs Expenses</p>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={pill(chartMode === "line")} onClick={() => setChartMode("line")}>
              Consolidated
            </button>
            <button type="button" style={pill(chartMode === "stacked")} onClick={() => setChartMode("stacked")}>
              Stacked channels
            </button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160, marginTop: 10 }}>
          {series.map((day) => {
            const revH = (day.revenue / maxSeries) * 140;
            const expH = (day.expenses / maxSeries) * 140;
            return (
              <div key={day.date} title={`${day.date}\nRev ${money(day.revenue)}\nExp ${money(day.expenses)}`} style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 1, minWidth: 0 }}>
                <div style={{ flex: 1, height: Math.max(2, revH), background: SNAPSHOT_THEME.gold, borderRadius: "3px 3px 0 0", opacity: 0.9 }} />
                {chartMode === "stacked" || true ? (
                  <div style={{ flex: 1, height: Math.max(2, expH), background: "rgba(229,115,115,0.75)", borderRadius: "3px 3px 0 0" }} />
                ) : null}
              </div>
            );
          })}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 10, color: SNAPSHOT_THEME.mute }}>
          Gold = revenue · Red = expenses · {viewMode === "per_channel" ? "Per-channel table below" : "Consolidated trend"}
        </p>
      </section>

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
          transactions={filtered}
          onClose={() => setDetail(null)}
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

const dateInput: CSSProperties = {
  background: "#070A0F",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 8,
  color: SNAPSHOT_THEME.ink,
  padding: "5px 8px",
  font: "inherit",
  fontSize: 11
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
