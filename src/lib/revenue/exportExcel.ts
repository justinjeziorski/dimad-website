import type { ChannelBreakdownRow, RecurringExpense, RevenueKpis, UnifiedTransaction } from "@/lib/revenue/types";
import { money } from "@/lib/revenue/ledgerEngine";

type SheetJSModule = {
  utils: {
    aoa_to_sheet: (data: (string | number)[][]) => unknown;
    book_new: () => unknown;
    book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
  };
  writeFile: (wb: unknown, filename: string) => void;
};

async function loadXlsx(): Promise<SheetJSModule> {
  const mod = await import("xlsx");
  return mod as unknown as SheetJSModule;
}

export async function exportRevenueWorkbook(opts: {
  kpis: RevenueKpis;
  channels: ChannelBreakdownRow[];
  recurring: RecurringExpense[];
  ledger: UnifiedTransaction[];
  /** Period-level chart series rows (keys become columns). */
  chartSeries?: Array<Record<string, string | number>>;
  filename?: string;
}) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  if (opts.chartSeries?.length) {
    const keys = Array.from(
      opts.chartSeries.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );
    const chartRows: (string | number)[][] = [keys];
    opts.chartSeries.forEach((row) => {
      chartRows.push(keys.map((k) => (row[k] == null ? "" : row[k]!)));
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chartRows), "Chart Series");
  }

  // Executive P&L with live Excel formulas in column C
  const pnl: (string | number)[][] = [
    ["Metric", "Value", "Formula / Note"],
    ["Gross Revenue", opts.kpis.grossRevenue, "Sum of revenue rows"],
    ["Platform Fees", opts.kpis.grossRevenue - opts.kpis.netRevenue, "B2-B4"],
    ["Net Revenue", opts.kpis.netRevenue, "=B2-B3"],
    ["Total Expenses", opts.kpis.totalExpenses, "Plaid + Manual (business)"],
    ["Net Profit", opts.kpis.netProfit, "=B4-B5"],
    ["Margin %", opts.kpis.marginPct / 100, "=IFERROR(B6/B4,0)"],
    ["MRR", opts.kpis.mrr, "Recurring revenue normalized monthly"],
    ["Monthly Recurring Burn", opts.kpis.monthlyRecurringBurn, "Detected subscriptions"],
    ["Annualized Burn", opts.kpis.monthlyRecurringBurn * 12, "=B9*12"]
  ];
  const pnlSheet = XLSX.utils.aoa_to_sheet(pnl) as { [key: string]: { t?: string; f?: string; v?: number } };
  // Program real formulas for editable recalculation
  pnlSheet.C4 = { t: "n", f: "B2-B3", v: opts.kpis.netRevenue };
  pnlSheet.C6 = { t: "n", f: "B4-B5", v: opts.kpis.netProfit };
  pnlSheet.C7 = { t: "n", f: "IFERROR(B6/B4,0)", v: opts.kpis.marginPct / 100 };
  pnlSheet.C10 = { t: "n", f: "B9*12", v: opts.kpis.monthlyRecurringBurn * 12 };
  XLSX.utils.book_append_sheet(wb, pnlSheet, "Executive P&L");

  const channelRows: (string | number)[][] = [
    ["Channel", "Gross", "Fees", "Net", "Share %", "AOV", "Orders", "Growth %"]
  ];
  opts.channels.forEach((c) => {
    channelRows.push([
      c.platformLabel,
      c.gross,
      c.fees,
      c.net,
      c.sharePct / 100,
      c.aov,
      c.orderCount,
      c.growthPct == null ? "" : c.growthPct / 100
    ]);
  });
  channelRows.push([
    "TOTAL",
    opts.kpis.grossRevenue,
    opts.kpis.grossRevenue - opts.kpis.netRevenue,
    opts.kpis.netRevenue,
    1,
    opts.kpis.aov,
    opts.channels.reduce((a, c) => a + c.orderCount, 0),
    ""
  ]);
  const channelSheet = XLSX.utils.aoa_to_sheet(channelRows) as {
    [key: string]: { t?: string; f?: string; v?: number };
  };
  // Net = Gross - Fees for first data row as template
  if (opts.channels.length) {
    channelSheet.D2 = { t: "n", f: "B2-C2", v: opts.channels[0]!.net };
  }
  XLSX.utils.book_append_sheet(wb, channelSheet, "Channel Breakdown");

  const recurringRows: (string | number)[][] = [
    ["Merchant", "Interval", "Monthly", "Annualized", "Confidence", "Annual Formula"]
  ];
  opts.recurring.forEach((r, i) => {
    recurringRows.push([
      r.merchant,
      r.interval,
      r.monthlyAmount,
      r.annualizedAmount,
      r.confidence,
      `=C${i + 2}*12`
    ]);
  });
  const recurringSheet = XLSX.utils.aoa_to_sheet(recurringRows) as {
    [key: string]: { t?: string; f?: string; v?: number };
  };
  opts.recurring.forEach((r, i) => {
    const row = i + 2;
    recurringSheet[`F${row}`] = { t: "n", f: `C${row}*12`, v: r.annualizedAmount };
  });
  XLSX.utils.book_append_sheet(wb, recurringSheet, "Recurring Expenses");

  const ledgerRows: (string | number)[][] = [
    ["Date", "Type", "Source", "Platform", "Merchant", "Category", "Amount", "Fees", "Recurring", "Notes"]
  ];
  opts.ledger.forEach((row) => {
    ledgerRows.push([
      row.date.slice(0, 10),
      row.type,
      row.source,
      row.platformLabel,
      row.merchantOrCustomer || "",
      row.category,
      row.amount,
      row.feeAmount || 0,
      row.isRecurring ? "yes" : "no",
      row.notes || ""
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ledgerRows), "Raw Ledger");

  XLSX.writeFile(wb, opts.filename || `dimad-revenue-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportSummaryFallback(kpis: RevenueKpis) {
  return [
    "DIMAD Executive P&L",
    `Gross Revenue: ${money(kpis.grossRevenue)}`,
    `Net Revenue: ${money(kpis.netRevenue)}`,
    `Expenses: ${money(kpis.totalExpenses)}`,
    `Net Profit: ${money(kpis.netProfit)} (${kpis.marginPct.toFixed(1)}%)`
  ].join("\n");
}
