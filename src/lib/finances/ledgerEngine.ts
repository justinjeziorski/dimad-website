/**
 * Finances Command Center ledger engine.
 * Reuses the revenue UnifiedTransaction schema + adapters; adds institutional
 * partitions, flow models, and executive briefing generation.
 */
export {
  channelBreakdown,
  comparisonWindow,
  computeKpis,
  detectRecurringExpenses,
  filterLedger,
  formatDelta,
  money,
  mergeLiveAndMock,
  generateMockLedger,
  runLocalAnalyst,
  timeframeWindow
} from "@/lib/revenue/ledgerEngine";

export type { UnifiedTransaction } from "@/lib/revenue/types";

import {
  computeKpis,
  detectRecurringExpenses,
  formatDelta,
  money
} from "@/lib/revenue/ledgerEngine";
import type { UnifiedTransaction } from "@/lib/revenue/types";
import type {
  ExecutiveBriefing,
  FinanceGrouping,
  HybridSeriesPoint,
  LedgerPartition,
  SankeyLink,
  SankeyNode,
  WaterfallStep
} from "@/lib/finances/types";

const COGS_HINTS = [
  "cogs",
  "cost of goods",
  "cost of sales",
  "inventory",
  "fulfillment",
  "shipping",
  "product cost",
  "wholesale",
  "manufacturer"
];

function isCogsCategory(category: string): boolean {
  const c = category.toLowerCase();
  return COGS_HINTS.some((h) => c.includes(h));
}

/** Partition a filtered ledger into institutional P&L buckets. */
export function partitionLedger(rows: UnifiedTransaction[]): LedgerPartition {
  const grossRevenue = rows.filter((r) => r.type === "REVENUE");
  const expenses = rows.filter((r) => r.type === "EXPENSE" && !r.excluded);
  const cogs = expenses.filter((r) => isCogsCategory(r.category));
  const opex = expenses.filter((r) => !isCogsCategory(r.category));
  const recurringMrr = grossRevenue.filter((r) => r.isRecurring);
  const oneTimeSales = grossRevenue.filter((r) => !r.isRecurring);

  const fees = grossRevenue.reduce((s, r) => s + (r.feeAmount || 0), 0);
  const grossRevenueTotal = grossRevenue.reduce((s, r) => s + r.amount, 0);
  const cogsTotal = cogs.reduce((s, r) => s + r.amount, 0);
  const opexTotal = opex.reduce((s, r) => s + r.amount, 0);
  const mrrTotal = recurringMrr.reduce((s, r) => {
    if (r.recurringInterval === "annual") return s + r.amount / 12;
    if (r.recurringInterval === "weekly") return s + r.amount * 4.345;
    return s + r.amount;
  }, 0);
  const oneTimeTotal = oneTimeSales.reduce((s, r) => s + r.amount, 0);
  const netProfit = grossRevenueTotal - fees - cogsTotal - opexTotal;

  return {
    grossRevenue,
    cogs,
    opex,
    recurringMrr,
    oneTimeSales,
    fees,
    grossRevenueTotal,
    cogsTotal,
    opexTotal,
    netProfit,
    mrrTotal,
    oneTimeTotal
  };
}

/** Build hybrid multi-axis series from pre-bucketed ledger slices. */
export function buildHybridSeries(
  buckets: Array<{ key: string; label: string; items: UnifiedTransaction[] }>
): HybridSeriesPoint[] {
  return buckets.map((b) => {
    const p = partitionLedger(b.items);
    const netRev = p.grossRevenueTotal - p.fees;
    const marginPct = netRev > 0 ? (p.netProfit / netRev) * 100 : 0;
    const bySource: Record<string, number> = {};
    for (const row of p.grossRevenue) {
      bySource[row.source] = (bySource[row.source] || 0) + row.amount;
    }
    return {
      key: b.key,
      label: b.label,
      grossRevenue: p.grossRevenueTotal,
      netProfit: p.netProfit,
      opex: p.opexTotal + p.cogsTotal,
      marginPct,
      bySource
    };
  });
}

const SOURCE_COLORS: Record<string, string> = {
  stripe: "#635BFF",
  shopify: "#96BF48",
  gumroad: "#FF90E8",
  patreon: "#FF424D",
  lemon_squeezy: "#FFC233",
  manual: "#D4AF37",
  plaid: "#0A85FF"
};

/** Cash-flow Sankey model: money-in → deductions → retention. */
export function buildSankeyModel(rows: UnifiedTransaction[]): {
  nodes: SankeyNode[];
  links: SankeyLink[];
} {
  const p = partitionLedger(rows);
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  const sourceTotals = new Map<string, { label: string; value: number }>();
  for (const r of p.grossRevenue) {
    const cur = sourceTotals.get(r.source) || { label: r.platformLabel, value: 0 };
    cur.value += r.amount;
    sourceTotals.set(r.source, cur);
  }

  let col0 = 0;
  for (const [source, meta] of sourceTotals) {
    if (meta.value <= 0) continue;
    const id = `src_${source}`;
    nodes.push({
      id,
      label: meta.label,
      value: meta.value,
      column: 0,
      color: SOURCE_COLORS[source] || "#8BA0B8"
    });
    links.push({
      source: id,
      target: "gross",
      value: meta.value,
      color: SOURCE_COLORS[source] || "#8BA0B8"
    });
    col0 += meta.value;
  }

  nodes.push({
    id: "gross",
    label: "Gross Revenue",
    value: Math.max(p.grossRevenueTotal, col0),
    column: 1,
    color: "#D4AF37"
  });

  if (p.fees > 0) {
    nodes.push({ id: "fees", label: "Platform Fees", value: p.fees, column: 2, color: "#E57373" });
    links.push({ source: "gross", target: "fees", value: p.fees, color: "rgba(229,115,115,0.55)" });
  }
  if (p.cogsTotal > 0) {
    nodes.push({ id: "cogs", label: "COGS", value: p.cogsTotal, column: 2, color: "#F0A060" });
    links.push({ source: "gross", target: "cogs", value: p.cogsTotal, color: "rgba(240,160,96,0.55)" });
  }

  // OpEx by top categories
  const opexByCat = new Map<string, number>();
  for (const r of p.opex) {
    const key = r.category || "Other OpEx";
    opexByCat.set(key, (opexByCat.get(key) || 0) + r.amount);
  }
  const topOpex = [...opexByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const otherOpex =
    p.opexTotal - topOpex.reduce((s, [, v]) => s + v, 0);
  for (const [cat, value] of topOpex) {
    if (value <= 0) continue;
    const id = `opex_${cat.replace(/\W+/g, "_").slice(0, 24)}`;
    nodes.push({ id, label: cat, value, column: 2, color: "#8BA0B8" });
    links.push({ source: "gross", target: id, value, color: "rgba(139,160,184,0.45)" });
  }
  if (otherOpex > 1) {
    nodes.push({ id: "opex_other", label: "Other OpEx", value: otherOpex, column: 2, color: "#6B7C93" });
    links.push({
      source: "gross",
      target: "opex_other",
      value: otherOpex,
      color: "rgba(107,124,147,0.45)"
    });
  }

  const retained = Math.max(0, p.netProfit);
  const buffer = retained * 0.35;
  const profitKeep = retained - buffer;
  if (retained > 0) {
    nodes.push({
      id: "retained",
      label: "Net Profit",
      value: retained,
      column: 2,
      color: "#7DCEA0"
    });
    links.push({
      source: "gross",
      target: "retained",
      value: retained,
      color: "rgba(125,206,160,0.55)"
    });
    if (buffer > 0) {
      nodes.push({
        id: "savings",
        label: "Savings Buffer",
        value: buffer,
        column: 3,
        color: "#5DADE2"
      });
      links.push({
        source: "retained",
        target: "savings",
        value: buffer,
        color: "rgba(93,173,226,0.5)"
      });
    }
    if (profitKeep > 0) {
      nodes.push({
        id: "keep",
        label: "Operating Surplus",
        value: profitKeep,
        column: 3,
        color: "#7DCEA0"
      });
      links.push({
        source: "retained",
        target: "keep",
        value: profitKeep,
        color: "rgba(125,206,160,0.5)"
      });
    }
  } else if (p.netProfit < 0) {
    nodes.push({
      id: "deficit",
      label: "Operating Deficit",
      value: Math.abs(p.netProfit),
      column: 2,
      color: "#E57373"
    });
  }

  return { nodes, links };
}

/** Waterfall P&L bridge from Gross → Net Operating Income. */
export function buildWaterfallSteps(rows: UnifiedTransaction[]): WaterfallStep[] {
  const p = partitionLedger(rows);
  const steps: WaterfallStep[] = [];
  let running = 0;

  steps.push({
    id: "gross",
    label: "Gross Revenue",
    value: p.grossRevenueTotal,
    base: 0,
    kind: "total"
  });
  running = p.grossRevenueTotal;

  if (p.fees > 0) {
    steps.push({
      id: "fees",
      label: "Platform Fees",
      value: -p.fees,
      base: running - p.fees,
      kind: "decrease"
    });
    running -= p.fees;
  }
  if (p.cogsTotal > 0) {
    steps.push({
      id: "cogs",
      label: "COGS",
      value: -p.cogsTotal,
      base: running - p.cogsTotal,
      kind: "decrease"
    });
    running -= p.cogsTotal;
  }
  if (p.opexTotal > 0) {
    steps.push({
      id: "opex",
      label: "Operating Expenses",
      value: -p.opexTotal,
      base: running - p.opexTotal,
      kind: "decrease"
    });
    running -= p.opexTotal;
  }

  steps.push({
    id: "noi",
    label: "Net Operating Income",
    value: running,
    base: 0,
    kind: "result"
  });

  return steps;
}

/**
 * Deterministic 3-bullet executive briefing for solo operators.
 * Uses ledger anomalies + coverage ratios — no external LLM required.
 */
export function buildExecutiveBriefing(
  current: UnifiedTransaction[],
  previous: UnifiedTransaction[] = []
): ExecutiveBriefing {
  const kpis = computeKpis(current, previous);
  const part = partitionLedger(current);
  const recurring = detectRecurringExpenses(current.filter((r) => r.type === "EXPENSE"));
  const bullets: string[] = [];

  // Bullet 1 — recurring coverage / profitability posture
  const fixedBurn = kpis.monthlyRecurringBurn || part.opexTotal;
  if (part.mrrTotal > 0 && fixedBurn > 0) {
    const coverage = (part.mrrTotal / fixedBurn) * 100;
    if (coverage >= 100) {
      bullets.push(
        `Your baseline SaaS MRR (${money(part.mrrTotal)}/mo) now covers ${coverage.toFixed(0)}% of fixed monthly OpEx — you are profitable on recurring cash flow alone.`
      );
    } else {
      bullets.push(
        `MRR (${money(part.mrrTotal)}/mo) covers ${coverage.toFixed(0)}% of recurring OpEx (${money(fixedBurn)}/mo). Closing the gap needs ~${money(fixedBurn - part.mrrTotal)} more monthly recurring revenue.`
      );
    }
  } else if (kpis.netProfit >= 0) {
    bullets.push(
      `Period net profit is ${money(kpis.netProfit)} at a ${kpis.marginPct.toFixed(1)}% margin on ${money(kpis.grossRevenue)} gross.`
    );
  } else {
    bullets.push(
      `Operating at a ${money(Math.abs(kpis.netProfit))} deficit this period (${kpis.marginPct.toFixed(1)}% margin). Prioritize fee drag and top OpEx lines.`
    );
  }

  // Bullet 2 — MoM / period variance
  const grossDelta = kpis.deltas.grossRevenue;
  const profitDelta = kpis.deltas.netProfit;
  if (grossDelta != null || profitDelta != null) {
    const g = grossDelta == null ? "n/a" : formatDelta(grossDelta);
    const pr = profitDelta == null ? "n/a" : formatDelta(profitDelta);
    bullets.push(
      `Period-over-period: Gross ${g}, Net Profit ${pr}. ${
        (grossDelta ?? 0) < -10
          ? "Revenue contraction is material — isolate channel mix before cutting burn."
          : (profitDelta ?? 0) < -15
            ? "Profit compressed faster than revenue — check SaaS tool inflation and fee spikes."
            : "Trajectory is stable enough to hold runway assumptions."
      }`
    );
  } else {
    bullets.push(
      `${part.oneTimeTotal > part.mrrTotal ? "One-time sales dominate this window — convert wins into recurring offers." : "Recurring revenue is the primary engine this period."} One-time ${money(part.oneTimeTotal)} vs MRR-normalized ${money(part.mrrTotal)}.`
    );
  }

  // Bullet 3 — anomaly / action
  const topSub = recurring[0];
  const feeDrag = part.grossRevenueTotal > 0 ? (part.fees / part.grossRevenueTotal) * 100 : 0;
  if (topSub && topSub.monthlyAmount >= Math.max(50, fixedBurn * 0.08)) {
    bullets.push(
      `Largest recurring burn: ${topSub.merchant} at ${money(topSub.monthlyAmount)}/mo (${topSub.interval}). Review before the next renewal — ${(topSub.confidence * 100).toFixed(0)}% match confidence.`
    );
  } else if (feeDrag >= 8) {
    bullets.push(
      `Platform fees are ${feeDrag.toFixed(1)}% of gross (${money(part.fees)}). Negotiate rates or shift volume to lower-fee channels.`
    );
  } else if (part.cogsTotal > 0 && part.grossRevenueTotal > 0) {
    const cogsPct = (part.cogsTotal / part.grossRevenueTotal) * 100;
    bullets.push(
      `COGS is ${cogsPct.toFixed(1)}% of gross (${money(part.cogsTotal)}). ${
        cogsPct > 35
          ? "Contribution margin is tight — revisit unit economics."
          : "Contribution margin leaves room for growth spend."
      }`
    );
  } else {
    bullets.push(
      `${recurring.length} recurring merchants detected · monthly burn ≈ ${money(kpis.monthlyRecurringBurn)}. Keep a 3-month cash buffer against that burn floor.`
    );
  }

  while (bullets.length < 3) {
    bullets.push(`${current.length} ledger rows in view · ${money(kpis.grossRevenue)} gross.`);
  }

  return {
    title: "Executive briefing",
    bullets: [bullets[0]!, bullets[1]!, bullets[2]!],
    generatedAt: new Date().toISOString()
  };
}

/** Approximate runway in months from cash proxy (net profit buffer) vs burn. */
export function estimateRunwayMonths(
  cashBalanceProxy: number,
  monthlyBurn: number
): number | null {
  if (monthlyBurn <= 0) return null;
  if (cashBalanceProxy <= 0) return 0;
  return cashBalanceProxy / monthlyBurn;
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

function quarterKey(d: Date) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

function bucketMeta(d: Date, grouping: FinanceGrouping): { key: string; label: string } {
  if (grouping === "daily") {
    return {
      key: isoDay(d),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    };
  }
  if (grouping === "weekly") {
    const ws = weekStart(d);
    return {
      key: isoDay(ws),
      label: `W/o ${ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    };
  }
  if (grouping === "quarterly") {
    const key = quarterKey(d);
    return { key, label: key };
  }
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
  };
}

/** Group filtered rows into chart buckets by explicit finance grouping. */
export function groupByFinanceGranularity(
  rows: UnifiedTransaction[],
  grouping: FinanceGrouping
): Array<{ key: string; label: string; items: UnifiedTransaction[] }> {
  const map = new Map<string, UnifiedTransaction[]>();
  const labels = new Map<string, string>();
  for (const row of rows) {
    const d = new Date(row.date);
    if (!Number.isFinite(d.getTime())) continue;
    const { key, label } = bucketMeta(d, grouping);
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
    if (!labels.has(key)) labels.set(key, label);
  }
  return Array.from(map.keys())
    .sort()
    .map((key) => ({
      key,
      label: labels.get(key) || key,
      items: map.get(key) || []
    }));
}
