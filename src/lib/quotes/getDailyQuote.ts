import { getAdminDb } from "@/lib/firebase/admin";
import { utcTodayKey } from "./date";
import { EMERGENCY_FALLBACK_QUOTE } from "./fallback";
import type { DailyQuote, QuoteFields } from "./types";

export const DAILY_QUOTES_COLLECTION = "daily_quotes";

type CacheEntry = {
  dateKey: string;
  quote: DailyQuote;
};

let memoryCache: CacheEntry | null = null;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuoteFields(data: Record<string, unknown> | undefined): QuoteFields | null {
  if (!data) return null;
  const quote = asString(data.quote);
  const author = asString(data.author);
  const context = asString(data.context);
  if (!quote || !author) return null;
  return { quote, author, context: context || "" };
}

function emergencyQuote(dateKey: string): DailyQuote {
  return {
    ...EMERGENCY_FALLBACK_QUOTE,
    date: dateKey,
    source: "emergency_fallback"
  };
}

/**
 * Fetch today's Quote of the Day from Firestore (`daily_quotes/{YYYY-MM-DD}` UTC).
 * Falls back to the single emergency quote when the doc is missing or unreadable.
 * Results are cached in-process for the UTC calendar day to avoid repeat reads.
 */
export async function getDailyQuote(now: Date = new Date()): Promise<DailyQuote> {
  const dateKey = utcTodayKey(now);
  if (memoryCache?.dateKey === dateKey) {
    return memoryCache.quote;
  }

  let quote: DailyQuote;
  try {
    const snap = await getAdminDb().collection(DAILY_QUOTES_COLLECTION).doc(dateKey).get();
    const fields = snap.exists ? normalizeQuoteFields(snap.data() as Record<string, unknown>) : null;
    quote = fields
      ? { ...fields, date: asString((snap.data() as Record<string, unknown>)?.date) || dateKey, source: "firestore" }
      : emergencyQuote(dateKey);
  } catch (error) {
    console.error("getDailyQuote Firestore read failed:", error);
    quote = emergencyQuote(dateKey);
  }

  memoryCache = { dateKey, quote };
  return quote;
}

/** Test helper / import path: clear the in-process daily cache. */
export function clearDailyQuoteCache() {
  memoryCache = null;
}
