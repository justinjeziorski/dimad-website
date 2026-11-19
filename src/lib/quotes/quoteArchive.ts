export type ListedDailyQuote = {
  quote: string;
  author: string;
  context: string;
  date: string;
  isToday: boolean;
};

export type QuoteMonthGroup = {
  month: number;
  monthLabel: string;
  quotes: ListedDailyQuote[];
};

export type QuoteYearGroup = {
  year: number;
  months: QuoteMonthGroup[];
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

/** Group quotes by year → month for archive display (input should be date-desc). */
export function groupQuotesByYearMonth(quotes: ListedDailyQuote[]): QuoteYearGroup[] {
  const years = new Map<number, Map<number, ListedDailyQuote[]>>();

  for (const item of quotes) {
    const [yStr, mStr] = item.date.split("-");
    const year = Number(yStr);
    const month = Number(mStr);
    if (!year || !month) continue;
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year)!;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(item);
  }

  return [...years.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, monthQuotes]) => ({
          month,
          monthLabel: MONTH_NAMES[month - 1] || `Month ${month}`,
          quotes: monthQuotes
        }))
    }));
}

export function formatQuoteDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}
