import type {
  ChannelBreakdownRow,
  ComparisonMode,
  RecurringExpense,
  RecurringInterval,
  RevenueKpis,
  RevenueTimeframe,
  UnifiedTransaction
} from "@/lib/revenue/types";
import { getTimeframeWindow } from "@/lib/utils/timeframeFilter";

const DAY_MS = 86_400_000;

export function money(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatDelta(pct: number | null) {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function timeframeWindow(
  timeframe: RevenueTimeframe,
  custom?: { from: string; to: string },
  now = new Date()
): { from: Date; to: Date } {
  return getTimeframeWindow(
    timeframe,
    custom?.from && custom?.to ? { startDate: custom.from, endDate: custom.to } : null,
    now
  );
}

export function comparisonWindow(
  from: Date,
  to: Date,
  mode: ComparisonMode
): { from: Date; to: Date } {
  const span = to.getTime() - from.getTime();
  if (mode === "prior_year") {
    const prevFrom = new Date(from);
    const prevTo = new Date(to);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    return { from: prevFrom, to: prevTo };
  }
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  return { from: prevFrom, to: prevTo };
}

export function inWindow(iso: string, from: Date, to: Date) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return t >= from.getTime() && t <= to.getTime();
}

export function filterLedger(
  rows: UnifiedTransaction[],
  opts: {
    from: Date;
    to: Date;
    sources?: Set<string>;
    includeExcluded?: boolean;
  }
) {
  return rows.filter((row) => {
    if (!inWindow(row.date, opts.from, opts.to)) return false;
    if (opts.sources && opts.sources.size && !opts.sources.has(row.source)) return false;
    if (!opts.includeExcluded && row.excluded) return false;
    if (!opts.includeExcluded && row.businessPersonal === "personal") return false;
    return true;
  });
}

export function computeKpis(current: UnifiedTransaction[], previous: UnifiedTransaction[]): RevenueKpis {
  const sum = (rows: UnifiedTransaction[], type: UnifiedTransaction["type"]) =>
    rows.filter((r) => r.type === type).reduce((a, r) => a + r.amount, 0);
  const fees = (rows: UnifiedTransaction[]) =>
    rows.filter((r) => r.type === "REVENUE").reduce((a, r) => a + Number(r.feeAmount || 0), 0);

  const gross = sum(current, "REVENUE");
  const feeTotal = fees(current);
  const netRevenue = gross - feeTotal;
  const expenses = sum(current, "EXPENSE");
  const profit = netRevenue - expenses;
  const marginPct = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  const prevGross = sum(previous, "REVENUE");
  const prevNet = prevGross - fees(previous);
  const prevExp = sum(previous, "EXPENSE");
  const prevProfit = prevNet - prevExp;

  const mrr = current
    .filter((r) => r.type === "REVENUE" && r.isRecurring)
    .reduce((a, r) => {
      if (r.recurringInterval === "annual") return a + r.amount / 12;
      if (r.recurringInterval === "weekly") return a + r.amount * 4.333;
      return a + r.amount;
    }, 0);
  const oneTime = current
    .filter((r) => r.type === "REVENUE" && !r.isRecurring)
    .reduce((a, r) => a + r.amount, 0);
  const revenueRows = current.filter((r) => r.type === "REVENUE");
  const aov = revenueRows.length ? gross / revenueRows.length : 0;
  const burn = detectRecurringExpenses(current.filter((r) => r.type === "EXPENSE")).reduce(
    (a, r) => a + r.monthlyAmount,
    0
  );

  const revenueSources = new Set(current.filter((r) => r.type === "REVENUE").map((r) => r.source));
  const expenseSources = new Set(current.filter((r) => r.type === "EXPENSE").map((r) => r.source));

  return {
    grossRevenue: gross,
    netRevenue,
    totalExpenses: expenses,
    netProfit: profit,
    marginPct,
    mrr,
    oneTimeRevenue: oneTime,
    aov,
    transactionCount: current.length,
    monthlyRecurringBurn: burn,
    sourceCounts: { revenue: revenueSources.size, expense: expenseSources.size },
    deltas: {
      grossRevenue: pctDelta(gross, prevGross),
      netRevenue: pctDelta(netRevenue, prevNet),
      totalExpenses: pctDelta(expenses, prevExp),
      netProfit: pctDelta(profit, prevProfit)
    }
  };
}

export function channelBreakdown(
  current: UnifiedTransaction[],
  previous: UnifiedTransaction[]
): ChannelBreakdownRow[] {
  const sources = Array.from(new Set(current.filter((r) => r.type === "REVENUE").map((r) => r.source)));
  const grossTotal = current.filter((r) => r.type === "REVENUE").reduce((a, r) => a + r.amount, 0) || 1;
  return sources.map((source) => {
    const rows = current.filter((r) => r.type === "REVENUE" && r.source === source);
    const prev = previous.filter((r) => r.type === "REVENUE" && r.source === source);
    const gross = rows.reduce((a, r) => a + r.amount, 0);
    const fees = rows.reduce((a, r) => a + Number(r.feeAmount || 0), 0);
    const prevGross = prev.reduce((a, r) => a + r.amount, 0);
    return {
      source,
      platformLabel: rows[0]?.platformLabel || source,
      gross,
      fees,
      net: gross - fees,
      sharePct: (gross / grossTotal) * 100,
      aov: rows.length ? gross / rows.length : 0,
      orderCount: rows.length,
      growthPct: pctDelta(gross, prevGross)
    };
  });
}

/** Scan expenses for repeating merchants on ~30d or ~365d cadence. */
export function detectRecurringExpenses(transactions: UnifiedTransaction[]): RecurringExpense[] {
  const expenses = transactions.filter((t) => t.type === "EXPENSE" && !t.excluded);
  const byMerchant = new Map<string, UnifiedTransaction[]>();
  for (const row of expenses) {
    const key = String(row.merchantOrCustomer || row.platformLabel || "Unknown")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const list = byMerchant.get(key) || [];
    list.push(row);
    byMerchant.set(key, list);
  }

  const out: RecurringExpense[] = [];
  for (const [merchant, rows] of byMerchant) {
    if (rows.length < 2 && !rows.some((r) => r.isRecurring)) continue;
    const sorted = [...rows].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      gaps.push((Date.parse(sorted[i]!.date) - Date.parse(sorted[i - 1]!.date)) / DAY_MS);
    }
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 30;
    let interval: RecurringInterval = "monthly";
    let confidence = 0.55;
    if (sorted.some((r) => r.recurringInterval === "annual") || (avgGap > 300 && avgGap < 400)) {
      interval = "annual";
      confidence = 0.8;
    } else if (sorted.some((r) => r.recurringInterval === "weekly") || (avgGap > 5 && avgGap < 10)) {
      interval = "weekly";
      confidence = 0.75;
    } else if (avgGap > 25 && avgGap < 40) {
      interval = "monthly";
      confidence = 0.85;
    } else if (sorted.some((r) => r.isRecurring)) {
      interval = sorted.find((r) => r.recurringInterval)?.recurringInterval || "monthly";
      confidence = 0.7;
    } else if (rows.length < 2) {
      continue;
    }

    const latest = sorted[sorted.length - 1]!.amount;
    const monthlyAmount =
      interval === "annual" ? latest / 12 : interval === "weekly" ? latest * 4.333 : latest;
    out.push({
      merchant: sorted[0]!.merchantOrCustomer || sorted[0]!.platformLabel,
      interval,
      monthlyAmount,
      annualizedAmount: monthlyAmount * 12,
      sampleIds: sorted.map((r) => r.id),
      confidence
    });
  }
  return out.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

export function seriesByDay(rows: UnifiedTransaction[], from: Date, to: Date) {
  const days: { date: string; revenue: number; expenses: number; profit: number }[] = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor.getTime() <= end.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    const dayRows = rows.filter((r) => r.date.slice(0, 10) === key);
    const revenue = dayRows.filter((r) => r.type === "REVENUE").reduce((a, r) => a + r.amount, 0);
    const expenses = dayRows.filter((r) => r.type === "EXPENSE").reduce((a, r) => a + r.amount, 0);
    days.push({ date: key, revenue, expenses, profit: revenue - expenses });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Deterministic demo ledger so the workspace is fully interactive without live links. */
export function generateMockLedger(userId = "demo", nowInput?: Date): UnifiedTransaction[] {
  const rows: UnifiedTransaction[] = [];
  const now = nowInput ? new Date(nowInput) : new Date();
  const push = (partial: Omit<UnifiedTransaction, "userId" | "currency"> & { currency?: string }) => {
    rows.push({ userId, currency: "USD", ...partial });
  };

  const merchants = [
    { name: "AWS", amount: 186.4, cat: "SaaS Tools" },
    { name: "Cursor AI", amount: 40, cat: "SaaS Tools" },
    { name: "Vercel", amount: 20, cat: "SaaS Tools" },
    { name: "Notion", amount: 16, cat: "SaaS Tools" },
    { name: "Google Workspace", amount: 28.8, cat: "SaaS Tools" }
  ];

  for (let m = 0; m < 8; m += 1) {
    const base = new Date(now);
    base.setMonth(base.getMonth() - m);
    base.setDate(3);
    // Stripe subscriptions
    push({
      id: `mock_stripe_mrr_${m}`,
      type: "REVENUE",
      source: "stripe",
      platformLabel: "Stripe",
      amount: 4200 + m * 120,
      feeAmount: 126 + m * 3.5,
      category: "Subscription",
      isRecurring: true,
      recurringInterval: "monthly",
      merchantOrCustomer: "Explore Plan cohort",
      date: base.toISOString()
    });
    // One-time Stripe
    const oneOff = new Date(base);
    oneOff.setDate(12 + (m % 5));
    push({
      id: `mock_stripe_once_${m}`,
      type: "REVENUE",
      source: "stripe",
      platformLabel: "Stripe",
      amount: 890 + m * 40,
      feeAmount: 28,
      category: "One-Time Sale",
      isRecurring: false,
      merchantOrCustomer: `Client Invoice #${100 + m}`,
      date: oneOff.toISOString()
    });
    // Shopify
    push({
      id: `mock_shopify_${m}`,
      type: "REVENUE",
      source: "shopify",
      platformLabel: "Shopify",
      amount: 1540 + m * 55,
      feeAmount: 62,
      category: "One-Time Sale",
      isRecurring: false,
      merchantOrCustomer: "Storefront orders",
      date: new Date(base.getFullYear(), base.getMonth(), 18).toISOString()
    });
    // Gumroad / Lemon / Patreon
    push({
      id: `mock_gumroad_${m}`,
      type: "REVENUE",
      source: "gumroad",
      platformLabel: "Gumroad",
      amount: 310 + m * 18,
      feeAmount: 28,
      category: "One-Time Sale",
      isRecurring: false,
      merchantOrCustomer: "Digital product pack",
      date: new Date(base.getFullYear(), base.getMonth(), 9).toISOString()
    });
    push({
      id: `mock_lemon_${m}`,
      type: "REVENUE",
      source: "lemon_squeezy",
      platformLabel: "Lemon Squeezy",
      amount: 480 + m * 22,
      feeAmount: 35,
      category: "One-Time Sale",
      isRecurring: false,
      merchantOrCustomer: "Course checkout",
      date: new Date(base.getFullYear(), base.getMonth(), 21).toISOString()
    });
    push({
      id: `mock_patreon_${m}`,
      type: "REVENUE",
      source: "patreon",
      platformLabel: "Patreon",
      amount: 640 + m * 15,
      feeAmount: 40,
      category: "Subscription",
      isRecurring: true,
      recurringInterval: "monthly",
      merchantOrCustomer: "Patron memberships",
      date: new Date(base.getFullYear(), base.getMonth(), 1).toISOString()
    });
    // Recurring SaaS burn via Plaid
    for (const merchant of merchants) {
      push({
        id: `mock_plaid_${merchant.name.replace(/\s/g, "_")}_${m}`,
        type: "EXPENSE",
        source: "plaid",
        platformLabel: "Chase Business Checking",
        amount: merchant.amount,
        category: merchant.cat,
        isRecurring: true,
        recurringInterval: "monthly",
        merchantOrCustomer: merchant.name,
        date: new Date(base.getFullYear(), base.getMonth(), 5 + merchants.indexOf(merchant)).toISOString(),
        businessPersonal: "business"
      });
    }
    // Travel / ops expense
    push({
      id: `mock_plaid_travel_${m}`,
      type: "EXPENSE",
      source: "plaid",
      platformLabel: "Chase Business Checking",
      amount: 220 + m * 35,
      category: "Travel",
      isRecurring: false,
      merchantOrCustomer: m % 2 ? "United Airlines" : "Airbnb",
      date: new Date(base.getFullYear(), base.getMonth(), 22).toISOString(),
      businessPersonal: "business"
    });
  }

  // Manual entries
  push({
    id: "mock_manual_wire",
    type: "REVENUE",
    source: "manual",
    platformLabel: "Cash / Wire",
    amount: 2500,
    category: "One-Time Sale",
    isRecurring: false,
    merchantOrCustomer: "Retainer wire — Q4",
    date: new Date(now.getFullYear(), now.getMonth(), 4).toISOString(),
    notes: "Direct bank transfer"
  });
  push({
    id: "mock_manual_contractor",
    type: "EXPENSE",
    source: "manual",
    platformLabel: "Manual Entry",
    amount: 1200,
    category: "Contractors",
    isRecurring: true,
    recurringInterval: "monthly",
    merchantOrCustomer: "Design contractor",
    date: new Date(now.getFullYear(), now.getMonth(), 8).toISOString()
  });

  return rows.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function mergeLiveAndMock(
  live: UnifiedTransaction[],
  mock: UnifiedTransaction[],
  preferMockWhenEmpty = true
) {
  if (live.length) return live;
  return preferMockWhenEmpty ? mock : [];
}

/** Lightweight deterministic analyst answers over the filtered ledger. */
export function runLocalAnalyst(prompt: string, rows: UnifiedTransaction[]) {
  const expenses = rows.filter((r) => r.type === "EXPENSE");
  const recurring = detectRecurringExpenses(expenses);
  const kpis = computeKpis(rows, []);
  const channels = channelBreakdown(rows, []);
  const lower = prompt.toLowerCase();

  if (lower.includes("recurring") || lower.includes("subscription")) {
    const top = recurring.slice(0, 5);
    return {
      title: "Recurring subscription scan",
      bullets: [
        `${recurring.length} recurring merchants detected`,
        `Monthly burn ≈ ${money(kpis.monthlyRecurringBurn)}`,
        ...top.map(
          (r) =>
            `${r.merchant}: ${money(r.monthlyAmount)}/mo (${r.interval}, confidence ${(r.confidence * 100).toFixed(0)}%)`
        )
      ]
    };
  }
  if (lower.includes("margin") || lower.includes("profit")) {
    return {
      title: "Profit margin analysis",
      bullets: [
        `Gross ${money(kpis.grossRevenue)} → Net revenue ${money(kpis.netRevenue)}`,
        `Expenses ${money(kpis.totalExpenses)}`,
        `Net profit ${money(kpis.netProfit)} (${kpis.marginPct.toFixed(1)}% margin)`,
        kpis.marginPct < 20
          ? "Margin is below a 20% target — review SaaS burn and fee-heavy channels."
          : "Margin is healthy relative to a 20% operating target."
      ]
    };
  }
  if (lower.includes("channel") || lower.includes("compare")) {
    const ranked = [...channels].sort((a, b) => b.net - a.net);
    return {
      title: "Channel performance",
      bullets: ranked.slice(0, 6).map(
        (c) =>
          `${c.platformLabel}: net ${money(c.net)} · ${c.sharePct.toFixed(1)}% share · AOV ${money(c.aov)}${
            c.growthPct == null ? "" : ` · ${formatDelta(c.growthPct)}`
          }`
      )
    };
  }
  return {
    title: "Ledger snapshot",
    bullets: [
      `${rows.length} transactions in view`,
      `Gross ${money(kpis.grossRevenue)} / Expenses ${money(kpis.totalExpenses)}`,
      `MRR ${money(kpis.mrr)} · One-time ${money(kpis.oneTimeRevenue)}`,
      `Recurring burn ${money(kpis.monthlyRecurringBurn)}/mo`
    ]
  };
}
