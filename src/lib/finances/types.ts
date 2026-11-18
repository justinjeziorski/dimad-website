import type { LedgerSource, UnifiedTransaction } from "@/lib/revenue/types";

export type { UnifiedTransaction, LedgerSource };

export type FinanceChartMode = "hybrid" | "sankey" | "waterfall";

export type FinancePrimaryMetric =
  | "gross_revenue"
  | "net_profit"
  | "operating_expenses"
  | "burn_rate"
  | "runway";

export type FinanceGrouping = "daily" | "weekly" | "monthly" | "quarterly";

export type LedgerPartition = {
  grossRevenue: UnifiedTransaction[];
  cogs: UnifiedTransaction[];
  opex: UnifiedTransaction[];
  recurringMrr: UnifiedTransaction[];
  oneTimeSales: UnifiedTransaction[];
  fees: number;
  grossRevenueTotal: number;
  cogsTotal: number;
  opexTotal: number;
  netProfit: number;
  mrrTotal: number;
  oneTimeTotal: number;
};

export type ExecutiveBriefing = {
  title: string;
  bullets: [string, string, string];
  generatedAt: string;
};

export type SankeyNode = {
  id: string;
  label: string;
  value: number;
  column: number;
  color: string;
};

export type SankeyLink = {
  source: string;
  target: string;
  value: number;
  color: string;
};

export type WaterfallStep = {
  id: string;
  label: string;
  value: number;
  /** Absolute bar start (for floating bridge steps). */
  base: number;
  kind: "total" | "increase" | "decrease" | "result";
};

export type HybridSeriesPoint = {
  key: string;
  label: string;
  grossRevenue: number;
  netProfit: number;
  opex: number;
  marginPct: number;
  bySource: Record<string, number>;
};

export type FinanceExportPayload = {
  periodLabel: string;
  kpis: {
    grossRevenue: number;
    netRevenue: number;
    totalExpenses: number;
    netProfit: number;
    marginPct: number;
    mrr: number;
    oneTimeRevenue: number;
    monthlyRecurringBurn: number;
  };
  partition: LedgerPartition;
  ledger: UnifiedTransaction[];
  briefing: ExecutiveBriefing;
  chartSeries?: Array<Record<string, string | number>>;
};
