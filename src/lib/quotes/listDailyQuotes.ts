import { getAdminDb } from "@/lib/firebase/admin";
import { DAILY_QUOTES_COLLECTION } from "./getDailyQuote";
import { utcTodayKey } from "./date";
import type { ListedDailyQuote } from "./quoteArchive";

export type { ListedDailyQuote } from "./quoteArchive";
export {
  groupQuotesByYearMonth,
  formatQuoteDayLabel,
  type QuoteMonthGroup,
  type QuoteYearGroup
} from "./quoteArchive";

type ListCache = {
  fetchedAt: number;
  quotes: ListedDailyQuote[];
};

const LIST_CACHE_TTL_MS = 5 * 60 * 1000;
let listCache: ListCache | null = null;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * List all scheduled quotes from `daily_quotes`, newest date first.
 * Short in-process TTL so the archive stays fresh as the queue updates.
 */
export async function listDailyQuotes(options: { bypassCache?: boolean } = {}): Promise<ListedDailyQuote[]> {
  const now = Date.now();
  if (!options.bypassCache && listCache && now - listCache.fetchedAt < LIST_CACHE_TTL_MS) {
    return listCache.quotes;
  }

  const today = utcTodayKey();
  const snap = await getAdminDb().collection(DAILY_QUOTES_COLLECTION).orderBy("date", "desc").get();

  const quotes: ListedDailyQuote[] = [];
  snap.forEach((doc) => {
    const data = (doc.data() || {}) as Record<string, unknown>;
    const quote = asString(data.quote);
    const author = asString(data.author);
    const context = asString(data.context);
    const date = asString(data.date) || doc.id;
    if (!quote || !author || !date) return;
    quotes.push({
      quote,
      author,
      context,
      date,
      isToday: date === today
    });
  });

  listCache = { fetchedAt: now, quotes };
  return quotes;
}

export function clearDailyQuotesListCache() {
  listCache = null;
}
