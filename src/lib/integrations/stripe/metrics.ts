const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"
]);

const THREE_DECIMAL = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

export function monthlyRecurringCents(
  unitAmount: number,
  quantity: number,
  interval: string | undefined,
  intervalCount: number | undefined
): number {
  if (!interval || !unitAmount) return 0;
  const count = intervalCount && intervalCount > 0 ? intervalCount : 1;
  const amount = unitAmount * (quantity > 0 ? quantity : 1);
  switch (interval) {
    case "day":
      return (amount * 365) / (12 * count);
    case "week":
      return (amount * 52) / (12 * count);
    case "month":
      return amount / count;
    case "year":
      return amount / (12 * count);
    default:
      return 0;
  }
}

export function formatMoney(amount: number, currency: string): string {
  const code = (currency || "usd").toLowerCase();
  const major = ZERO_DECIMAL.has(code) ? amount : THREE_DECIMAL.has(code) ? amount / 1000 : amount / 100;
  const digits = ZERO_DECIMAL.has(code) ? 0 : THREE_DECIMAL.has(code) ? 3 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(major);
  } catch {
    return `${major.toFixed(digits)} ${code.toUpperCase()}`;
  }
}

export function formatMoneyList(rows: { amount: number; currency: string }[]): string {
  if (!rows.length) return formatMoney(0, "usd");
  return rows.map((row) => formatMoney(row.amount, row.currency)).join(" · ");
}

export function currencyBuckets(
  totals: Map<string, number>,
  keepZero = false
): { amount: number; currency: string }[] {
  const rows = [...totals.entries()]
    .map(([currency, amount]) => ({ currency, amount: Math.round(amount) }))
    .filter((row) => keepZero || row.amount !== 0);
  rows.sort((a, b) => {
    if (a.currency === "usd") return -1;
    if (b.currency === "usd") return 1;
    return a.currency.localeCompare(b.currency);
  });
  return rows;
}

export function maskStripeAccount(accountId: string): string {
  if (accountId.length <= 10) return accountId;
  return `${accountId.slice(0, 5)}…${accountId.slice(-4)}`;
}

export function cleanStripeText(value: string, max = 80): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
