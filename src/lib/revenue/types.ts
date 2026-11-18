export type LedgerSource =
  | "stripe"
  | "shopify"
  | "gumroad"
  | "patreon"
  | "lemon_squeezy"
  | "plaid"
  | "manual";

export type RecurringInterval = "monthly" | "annual" | "weekly";

export interface UnifiedTransaction {
  id: string;
  userId: string;
  type: "REVENUE" | "EXPENSE";
  source: LedgerSource;
  platformLabel: string;
  amount: number;
  feeAmount?: number;
  currency: string;
  category: string;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  merchantOrCustomer?: string;
  date: string;
  notes?: string;
  /** Soft flag for Plaid/manual expenses — excluded from Net Profit when true. */
  excluded?: boolean;
  businessPersonal?: "business" | "personal";
}

export type { DimadTimeframe as RevenueTimeframe } from "@/lib/utils/timeframeFilter";
export type RevenueTimeframeLegacy = "7D" | "30D" | "MTD" | "QTD" | "YTD" | "1Y" | "CUSTOM";
export type ComparisonMode = "previous_period" | "prior_year";
export type ViewMode = "consolidated" | "per_channel";

export type RecurringExpense = {
  merchant: string;
  interval: RecurringInterval;
  monthlyAmount: number;
  annualizedAmount: number;
  sampleIds: string[];
  confidence: number;
};

export type ChannelBreakdownRow = {
  source: LedgerSource;
  platformLabel: string;
  gross: number;
  fees: number;
  net: number;
  sharePct: number;
  aov: number;
  orderCount: number;
  growthPct: number | null;
};

export type RevenueKpis = {
  grossRevenue: number;
  netRevenue: number;
  totalExpenses: number;
  netProfit: number;
  marginPct: number;
  mrr: number;
  oneTimeRevenue: number;
  aov: number;
  transactionCount: number;
  monthlyRecurringBurn: number;
  sourceCounts: { revenue: number; expense: number };
  deltas: {
    grossRevenue: number | null;
    netRevenue: number | null;
    totalExpenses: number | null;
    netProfit: number | null;
  };
};

export type ManualLedgerInput = {
  type: "REVENUE" | "EXPENSE";
  merchantOrCustomer: string;
  amount: number;
  date: string;
  category: string;
  platformLabel?: string;
  currency?: string;
  isRecurring?: boolean;
  recurringInterval?: RecurringInterval;
  notes?: string;
  feeAmount?: number;
};
