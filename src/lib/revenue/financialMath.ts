import type { LedgerSource, UnifiedTransaction } from "@/lib/revenue/types";
import {
  filterDataByTimeframe,
  groupDataIntoBuckets,
  type CustomDateRange,
  type DimadTimeframe
} from "@/lib/utils/timeframeFilter";

/** Integer cents to avoid floating-point drift. */
export function toCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

function sumCents(
  transactions: UnifiedTransaction[],
  predicate: (tx: UnifiedTransaction) => boolean
): number {
  let total = 0;
  for (const tx of transactions) {
    if (!predicate(tx)) continue;
    total += toCents(tx.amount);
  }
  return total;
}

function sumFeeCents(transactions: UnifiedTransaction[]): number {
  let total = 0;
  for (const tx of transactions) {
    if (tx.type !== "REVENUE") continue;
    total += toCents(Number(tx.feeAmount || 0));
  }
  return total;
}

export function calculateGrossRevenue(transactions: UnifiedTransaction[]): number {
  return fromCents(sumCents(transactions, (tx) => tx.type === "REVENUE"));
}

export function calculateNetRevenue(transactions: UnifiedTransaction[]): number {
  const gross = sumCents(transactions, (tx) => tx.type === "REVENUE");
  const fees = sumFeeCents(transactions);
  return fromCents(gross - fees);
}

export function calculateTotalExpenses(transactions: UnifiedTransaction[]): number {
  return fromCents(
    sumCents(
      transactions,
      (tx) => tx.type === "EXPENSE" && !tx.excluded && tx.businessPersonal !== "personal"
    )
  );
}

export function calculateNetProfit(netRevenue: number, totalExpenses: number): number {
  return fromCents(toCents(netRevenue) - toCents(totalExpenses));
}

export function calculateProfitMargin(netProfit: number, netRevenue: number): number {
  const rev = toCents(netRevenue);
  if (rev === 0) return 0;
  return (toCents(netProfit) / rev) * 100;
}

export function calculatePeriodDelta(currentValue: number, previousValue: number): number | null {
  const cur = toCents(currentValue);
  const prev = toCents(previousValue);
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export function calculateMrr(transactions: UnifiedTransaction[]): number {
  let cents = 0;
  for (const tx of transactions) {
    if (tx.type !== "REVENUE" || !tx.isRecurring) continue;
    if (tx.recurringInterval === "annual") cents += Math.round(toCents(tx.amount) / 12);
    else if (tx.recurringInterval === "weekly") cents += Math.round(toCents(tx.amount) * (13 / 3));
    else cents += toCents(tx.amount);
  }
  return fromCents(cents);
}

export function calculateOneTimeRevenue(transactions: UnifiedTransaction[]): number {
  return fromCents(sumCents(transactions, (tx) => tx.type === "REVENUE" && !tx.isRecurring));
}

/** X-axis viewing scale — controls both window length and bucket size. */
export type ChartScale = "days" | "weeks" | "months" | "years" | "all";
/** @deprecated Use ChartScale */
export type ChartTimeframe = "7D" | "30D" | "90D" | "YTD" | "1Y" | "ALL";

export type ChartGranularity = "day" | "week" | "month" | "year";

export type ChartBucket = {
  key: string;
  label: string;
  from: string;
  to: string;
  gross: number;
  fees: number;
  net: number;
  expenses: number;
  profit: number;
  marginPct: number;
  mrr: number;
  oneTime: number;
  bySource: Partial<Record<LedgerSource, number>>;
  expenseBySource: Partial<Record<LedgerSource, number>>;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekStart(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function yearKey(d: Date) {
  return String(d.getFullYear());
}

export function chartScaleWindow(
  scale: ChartScale,
  transactions: UnifiedTransaction[],
  now = new Date()
): { from: Date; to: Date; gran: ChartGranularity } {
  const to = startOfDay(now);
  to.setHours(23, 59, 59, 999);
  const from = startOfDay(now);

  if (scale === "days") {
    from.setDate(from.getDate() - 29);
    return { from, to, gran: "day" };
  }
  if (scale === "weeks") {
    from.setDate(from.getDate() - 7 * 25);
    return { from, to, gran: "week" };
  }
  if (scale === "months") {
    from.setMonth(from.getMonth() - 23);
    from.setDate(1);
    return { from, to, gran: "month" };
  }
  if (scale === "years") {
    from.setFullYear(from.getFullYear() - 7, 0, 1);
    return { from, to, gran: "year" };
  }

  // All time — span available ledger (fallback 5y)
  let earliest = from.getTime();
  for (const tx of transactions) {
    const t = Date.parse(tx.date);
    if (Number.isFinite(t) && t < earliest) earliest = t;
  }
  const allFrom = startOfDay(new Date(earliest));
  const spanDays = Math.max(1, Math.round((to.getTime() - allFrom.getTime()) / 86_400_000));
  const gran: ChartGranularity = spanDays > 900 ? "year" : spanDays > 180 ? "month" : "week";
  return { from: allFrom, to, gran };
}

/** Legacy mapping for older callers. */
export function chartTimeframeWindow(tf: ChartTimeframe, now = new Date()): { from: Date; to: Date } {
  const scale: ChartScale =
    tf === "7D" || tf === "30D" ? "days" : tf === "90D" ? "weeks" : tf === "YTD" || tf === "1Y" ? "months" : "all";
  const { from, to } = chartScaleWindow(scale, [], now);
  if (tf === "7D") {
    const f = startOfDay(now);
    f.setDate(f.getDate() - 6);
    return { from: f, to };
  }
  return { from, to };
}

function labelForBucket(key: string, gran: ChartGranularity) {
  if (gran === "year") return key;
  if (gran === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y!, (m || 1) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  const d = new Date(`${key}T12:00:00`);
  if (gran === "week") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function bucketKey(d: Date, gran: ChartGranularity) {
  if (gran === "day") return isoDay(startOfDay(d));
  if (gran === "week") return isoDay(weekStart(d));
  if (gran === "month") return monthKey(d);
  return yearKey(d);
}

function advanceCursor(cursor: Date, gran: ChartGranularity) {
  if (gran === "day") cursor.setDate(cursor.getDate() + 1);
  else if (gran === "week") cursor.setDate(cursor.getDate() + 7);
  else if (gran === "month") cursor.setMonth(cursor.getMonth() + 1, 1);
  else cursor.setFullYear(cursor.getFullYear() + 1, 0, 1);
}

export function buildChartBuckets(
  transactions: UnifiedTransaction[],
  timeframe: DimadTimeframe,
  sources?: Set<string>,
  customRange?: CustomDateRange | null
): ChartBucket[] {
  const scoped = transactions.filter((tx) => {
    if (sources && sources.size && !sources.has(tx.source)) return false;
    if (tx.excluded || tx.businessPersonal === "personal") return false;
    return true;
  });
  const filtered = filterDataByTimeframe(scoped, timeframe, customRange);
  const groups = groupDataIntoBuckets(filtered, timeframe, customRange);

  return groups.map((group) => {
    const rows = group.items;
    const gross = calculateGrossRevenue(rows);
    const net = calculateNetRevenue(rows);
    const fees = fromCents(toCents(gross) - toCents(net));
    const expenses = calculateTotalExpenses(rows);
    const profit = calculateNetProfit(net, expenses);
    const marginPct = calculateProfitMargin(profit, net);
    const mrr = calculateMrr(rows);
    const oneTime = calculateOneTimeRevenue(rows);
    const bySource: Partial<Record<LedgerSource, number>> = {};
    const expenseBySource: Partial<Record<LedgerSource, number>> = {};
    for (const tx of rows) {
      if (tx.type === "REVENUE") {
        bySource[tx.source] = fromCents(toCents(bySource[tx.source] || 0) + toCents(tx.amount));
      } else {
        expenseBySource[tx.source] = fromCents(
          toCents(expenseBySource[tx.source] || 0) + toCents(tx.amount)
        );
      }
    }
    return {
      key: group.key,
      label: group.label,
      from: group.from,
      to: group.to,
      gross,
      fees,
      net,
      expenses,
      profit,
      marginPct,
      mrr,
      oneTime,
      bySource,
      expenseBySource
    };
  });
}

export function niceAxisMax(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 100;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const n = raw / base;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * base;
}

/** Dense Y ticks — every 10% for margins, ~10 steps for dollars. */
export function buildYTicks(maxValue: number, mode: "margin" | "money"): number[] {
  if (mode === "margin") {
    const top = Math.max(10, Math.ceil(Math.min(100, Math.max(maxValue, 10)) / 10) * 10);
    const ticks: number[] = [];
    for (let v = 0; v <= top; v += 10) ticks.push(v);
    return ticks;
  }
  const top = niceAxisMax(maxValue);
  const step = top / 10;
  const ticks: number[] = [];
  for (let i = 0; i <= 10; i += 1) ticks.push(Math.round(step * i * 100) / 100);
  return ticks;
}

export function formatAxisMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `$${Math.round(n / 1000)}K`;
  if (abs >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (abs >= 100) return `$${Math.round(n)}`;
  return `$${n.toFixed(0)}`;
}

export function formatPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
